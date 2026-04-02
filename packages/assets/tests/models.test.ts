import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createWorld, getComponent } from '../../core/src/index.js';
import { MeshRef, Position, Rotation, Scale } from '../../renderer/src/components.js';
import type { RendererContext } from '../../renderer/src/renderer.js';
import {
  createTextureCache,
  disposeAssetCache,
  loadModel,
  spawnModel,
  spawnModelInstances,
} from '../src/index.js';

function makeRendererContext(): RendererContext {
  return {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    renderer: { render: vi.fn() } as unknown as THREE.WebGLRenderer,
  };
}

function makeLoadedModel(name = 'ArcaneCrystal'): THREE.Group {
  const group = new THREE.Group();
  group.name = name;

  const geometry = new THREE.BoxGeometry(1, 2, 1);
  const texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ color: 0x38bdf8, map: texture });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 1.25;
  group.add(mesh);

  return group;
}

function makeLoadedModelWithSharedResources(name = 'SharedCrystal'): THREE.Group {
  const group = new THREE.Group();
  group.name = name;

  const geometry = new THREE.BoxGeometry(1, 2, 1);
  const texture = new THREE.Texture();
  const material = new THREE.MeshStandardMaterial({ color: 0x38bdf8, map: texture });
  const leftMesh = new THREE.Mesh(geometry, material);
  const rightMesh = new THREE.Mesh(geometry, material);
  leftMesh.position.x = -1;
  rightMesh.position.x = 1;
  group.add(leftMesh, rightMesh);

  return group;
}

describe('loadModel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('reuses the same cached model asset for the same source', async () => {
    const cache = createTextureCache();
    const scene = makeLoadedModel();
    const loadAsync = vi
      .spyOn(GLTFLoader.prototype, 'loadAsync')
      .mockResolvedValue({ scene } as Awaited<ReturnType<GLTFLoader['loadAsync']>>);

    const first = await loadModel(cache, '/models/crystal.glb');
    const second = await loadModel(cache, '/models/crystal.glb');

    expect(first).toBe(second);
    expect(loadAsync).toHaveBeenCalledTimes(1);
  });

  it('rejects sources outside the Stage 16 glTF / GLB scope', async () => {
    const cache = createTextureCache();

    await expect(loadModel(cache, '/models/crystal.obj')).rejects.toThrow(
      'loadModel: only .gltf and .glb sources are supported',
    );
  });

  it('accepts Vite-inlined GLB data URLs', async () => {
    const cache = createTextureCache();
    const scene = makeLoadedModel();
    const loadAsync = vi
      .spyOn(GLTFLoader.prototype, 'loadAsync')
      .mockResolvedValue({ scene } as Awaited<ReturnType<GLTFLoader['loadAsync']>>);

    const source = 'data:model/gltf-binary;base64,AAAA';
    const asset = await loadModel(cache, source);

    expect(asset.source).toBe(source);
    expect(loadAsync).toHaveBeenCalledWith(source);
  });

  it('rejects new loads after the asset cache has been disposed', async () => {
    const cache = createTextureCache();
    disposeAssetCache(cache);

    await expect(loadModel(cache, '/models/crystal.glb')).rejects.toThrow(
      'loadModel: asset cache has already been disposed',
    );
  });

  it('disposes tracked model resources when the cache is torn down', async () => {
    const cache = createTextureCache();
    const scene = makeLoadedModel();
    const mesh = scene.children[0] as THREE.Mesh;
    const material = mesh.material as THREE.MeshStandardMaterial;
    const texture = material.map!;

    const geometryDispose = vi.spyOn(mesh.geometry, 'dispose');
    const materialDispose = vi.spyOn(material, 'dispose');
    const textureDispose = vi.spyOn(texture, 'dispose');

    vi
      .spyOn(GLTFLoader.prototype, 'loadAsync')
      .mockResolvedValue({ scene } as Awaited<ReturnType<GLTFLoader['loadAsync']>>);

    await loadModel(cache, '/models/crystal.glb');
    disposeAssetCache(cache);

    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(textureDispose).toHaveBeenCalledTimes(1);
  });

  it('disposes shared model resources only once when meshes reuse them', async () => {
    const cache = createTextureCache();
    const scene = makeLoadedModelWithSharedResources();
    const firstMesh = scene.children[0] as THREE.Mesh;
    const secondMesh = scene.children[1] as THREE.Mesh;
    const firstMaterial = firstMesh.material as THREE.MeshStandardMaterial;
    const secondMaterial = secondMesh.material as THREE.MeshStandardMaterial;

    expect(firstMesh.geometry).toBe(secondMesh.geometry);
    expect(firstMaterial).toBe(secondMaterial);

    const geometryDispose = vi.spyOn(firstMesh.geometry, 'dispose');
    const materialDispose = vi.spyOn(firstMaterial, 'dispose');
    const textureDispose = vi.spyOn(firstMaterial.map!, 'dispose');

    vi
      .spyOn(GLTFLoader.prototype, 'loadAsync')
      .mockResolvedValue({ scene } as Awaited<ReturnType<GLTFLoader['loadAsync']>>);

    await loadModel(cache, '/models/shared-crystal.glb');
    disposeAssetCache(cache);

    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(textureDispose).toHaveBeenCalledTimes(1);
  });
});

describe('spawnModel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('clones a loaded model into the scene and applies transform components', async () => {
    const cache = createTextureCache();
    const scene = makeLoadedModel();
    vi
      .spyOn(GLTFLoader.prototype, 'loadAsync')
      .mockResolvedValue({ scene } as Awaited<ReturnType<GLTFLoader['loadAsync']>>);

    const asset = await loadModel(cache, '/models/crystal.glb');
    const world = createWorld();
    const ctx = makeRendererContext();

    const first = spawnModel(world, ctx, asset, {
      position: { x: 1, y: 2, z: 3 },
      rotation: { y: Math.PI / 4 },
      scale: 2,
    });
    const second = spawnModel(world, ctx, asset, {
      position: { x: -4, y: 0.5, z: 6 },
      scale: { x: 1, y: 1.5, z: 0.75 },
    });

    const firstRoot = getComponent(world, first, MeshRef)?.mesh as THREE.Group;
    const secondRoot = getComponent(world, second, MeshRef)?.mesh as THREE.Group;
    const firstClone = firstRoot.children[0] as THREE.Group;
    const secondClone = secondRoot.children[0] as THREE.Group;
    const firstMesh = firstClone.children[0] as THREE.Mesh;
    const secondMesh = secondClone.children[0] as THREE.Mesh;

    expect(ctx.scene.children).toContain(firstRoot);
    expect(ctx.scene.children).toContain(secondRoot);
    expect(firstRoot).not.toBe(secondRoot);
    expect(firstClone).not.toBe(secondClone);
    expect(firstMesh).not.toBe(secondMesh);
    expect(firstMesh.geometry).toBe(secondMesh.geometry);
    expect(firstMesh.position.y).toBe(1.25);

    expect(getComponent(world, first, Position)).toEqual({ x: 1, y: 2, z: 3 });
    expect(getComponent(world, first, Rotation)).toEqual({ x: 0, y: Math.PI / 4, z: 0 });
    expect(getComponent(world, first, Scale)).toEqual({ x: 2, y: 2, z: 2 });
    expect(getComponent(world, second, Scale)).toEqual({ x: 1, y: 1.5, z: 0.75 });
  });

  it('rejects spawning from a disposed model asset', async () => {
    const cache = createTextureCache();
    vi
      .spyOn(GLTFLoader.prototype, 'loadAsync')
      .mockResolvedValue({ scene: makeLoadedModel() } as Awaited<ReturnType<GLTFLoader['loadAsync']>>);

    const asset = await loadModel(cache, '/models/crystal.glb');
    disposeAssetCache(cache);

    expect(() => spawnModel(createWorld(), makeRendererContext(), asset)).toThrow(
      'spawnModel: model asset has already been disposed',
    );
  });

  it('spawns repeated instances from one loaded model source', async () => {
    const cache = createTextureCache();
    vi
      .spyOn(GLTFLoader.prototype, 'loadAsync')
      .mockResolvedValue({ scene: makeLoadedModel() } as Awaited<ReturnType<GLTFLoader['loadAsync']>>);

    const asset = await loadModel(cache, '/models/crystal.glb');
    const world = createWorld();
    const ctx = makeRendererContext();

    const entities = spawnModelInstances(world, ctx, asset, [
      { position: { x: -2, y: 1, z: 4 }, scale: 1.25 },
      { position: { x: 3, y: 1.5, z: -6 }, rotation: { y: Math.PI / 2 }, scale: 0.9 },
    ]);

    expect(entities).toHaveLength(2);
    expect(getComponent(world, entities[0]!, Position)).toEqual({ x: -2, y: 1, z: 4 });
    expect(getComponent(world, entities[1]!, Rotation)).toEqual({ x: 0, y: Math.PI / 2, z: 0 });
    expect(getComponent(world, entities[1]!, Scale)).toEqual({ x: 0.9, y: 0.9, z: 0.9 });
  });
});
