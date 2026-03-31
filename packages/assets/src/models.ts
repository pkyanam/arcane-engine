import { createEntity, addComponent } from '@arcane-engine/core';
import type { Entity, World } from '@arcane-engine/core';
import { MeshRef, Position, Rotation, Scale, type RendererContext, type Vector3Like } from '@arcane-engine/renderer';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeletonRoot } from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  assertAssetCacheNotDisposed,
  getAssetCacheState,
  registerCacheDisposeCallback,
  type AssetCache,
} from './cache.js';

/**
 * Supported model source types. Vite asset imports resolve to strings.
 */
export type ModelSource = string | URL;

/**
 * Opaque handle returned by `loadModel()`.
 *
 * Load once, then pass the same asset to `spawnModel()` as many times as you
 * need. Each spawn clones the cached source scene instead of reloading the file.
 */
export interface ModelAsset {
  readonly kind: 'arcane-model-asset';
  readonly source: string;
}

/**
 * Options for `spawnModel()`.
 */
export interface SpawnModelOptions {
  /**
   * World-space position for the spawned model root.
   */
  position?: Partial<Vector3Like>;
  /**
   * Euler rotation in radians for the spawned model root.
   */
  rotation?: Partial<Vector3Like>;
  /**
   * Root scale. Pass a number for uniform scale or an `{ x, y, z }` object.
   */
  scale?: number | Partial<Vector3Like>;
}

interface ModelAssetState {
  disposed: boolean;
  readonly template: THREE.Object3D;
  readonly dispose: () => void;
}

const modelAssetStates = new WeakMap<ModelAsset, ModelAssetState>();

/**
 * Load a glTF or GLB model through the shared Arcane Engine asset cache.
 *
 * The returned `ModelAsset` is intentionally opaque. Use `spawnModel()` to
 * clone it into the world rather than mutating the cached source scene.
 */
export async function loadModel(
  cache: AssetCache,
  source: ModelSource,
): Promise<ModelAsset> {
  const state = getAssetCacheState(cache);
  assertAssetCacheNotDisposed(state, 'loadModel');

  const resolvedSource = resolveModelSource(source);
  assertSupportedModelSource(resolvedSource);

  const existing = state.modelLoads.get(resolvedSource) as Promise<ModelAsset> | undefined;
  if (existing) {
    return existing;
  }

  const load = loadBaseModel(resolvedSource)
    .then((gltf) => {
      assertAssetCacheNotDisposed(state, 'loadModel');

      const template = gltf.scene;
      const asset = createModelAsset(resolvedSource, template);
      registerCacheDisposeCallback(state, () => disposeModelAsset(asset));

      if (state.disposed) {
        disposeModelAsset(asset);
        throw new Error('loadModel: asset cache was disposed before the model finished loading');
      }

      return asset;
    })
    .catch((error: unknown) => {
      state.modelLoads.delete(resolvedSource);
      throw error;
    });

  state.modelLoads.set(resolvedSource, load);
  return load;
}

/**
 * Clone a loaded model into the scene, attach the usual transform components,
 * and return the new entity ID.
 *
 * The spawned ECS entity controls an outer root object. That keeps the model's
 * authored internal transforms intact while still letting the render system
 * move, rotate, and scale the whole prop.
 */
export function spawnModel(
  world: World,
  ctx: RendererContext,
  modelAsset: ModelAsset,
  options: SpawnModelOptions = {},
): Entity {
  const state = getModelAssetState(modelAsset);
  if (state.disposed) {
    throw new Error('spawnModel: model asset has already been disposed');
  }

  const entity = createEntity(world);
  const root = new THREE.Group();
  root.name = `${state.template.name || 'ArcaneModel'}Root`;
  root.add(cloneSkeletonRoot(state.template));

  addComponent(world, entity, Position, options.position ?? {});
  addComponent(world, entity, Rotation, resolveVector3Like(options.rotation, 0));
  addComponent(world, entity, Scale, resolveScale(options.scale));
  addComponent(world, entity, MeshRef, { mesh: root });

  ctx.scene.add(root);

  return entity;
}

function createModelAsset(source: string, template: THREE.Object3D): ModelAsset {
  const asset: ModelAsset = {
    kind: 'arcane-model-asset',
    source,
  };

  modelAssetStates.set(asset, {
    disposed: false,
    template,
    dispose: () => {
      disposeModelObjectResources(template);
    },
  });

  return asset;
}

function getModelAssetState(asset: ModelAsset): ModelAssetState {
  const state = modelAssetStates.get(asset);
  if (!state) {
    throw new Error('spawnModel: model asset was not created by loadModel()');
  }
  return state;
}

function disposeModelAsset(asset: ModelAsset): void {
  const state = getModelAssetState(asset);
  if (state.disposed) {
    return;
  }

  state.disposed = true;
  state.dispose();
}

function resolveModelSource(source: ModelSource): string {
  return typeof source === 'string' ? source : source.toString();
}

function assertSupportedModelSource(source: string): void {
  const normalized = source.split(/[?#]/, 1)[0]?.toLowerCase() ?? '';
  if (!normalized.endsWith('.gltf') && !normalized.endsWith('.glb')) {
    throw new Error('loadModel: only .gltf and .glb sources are supported in Stage 16');
  }
}

async function loadBaseModel(source: string): Promise<{ scene: THREE.Group }> {
  const loader = new GLTFLoader();
  return loader.loadAsync(source);
}

function resolveVector3Like(
  vector: Partial<Vector3Like> | undefined,
  fallback: number,
): Vector3Like {
  return {
    x: vector?.x ?? fallback,
    y: vector?.y ?? fallback,
    z: vector?.z ?? fallback,
  };
}

function resolveScale(scale: number | Partial<Vector3Like> | undefined): Vector3Like {
  if (typeof scale === 'number') {
    return { x: scale, y: scale, z: scale };
  }

  return resolveVector3Like(scale, 1);
}

function disposeModelObjectResources(root: THREE.Object3D): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;

    if (mesh.geometry) {
      geometries.add(mesh.geometry);
    }

    const meshMaterials = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : [];
    for (const material of meshMaterials) {
      materials.add(material);
      collectMaterialTextures(material, textures);
    }
  });

  for (const texture of textures) {
    texture.dispose();
  }

  for (const material of materials) {
    material.dispose();
  }

  for (const geometry of geometries) {
    geometry.dispose();
  }
}

function collectMaterialTextures(
  material: THREE.Material,
  textures: Set<THREE.Texture>,
): void {
  for (const value of Object.values(material)) {
    if (value instanceof THREE.Texture) {
      textures.add(value);
    }
  }
}
