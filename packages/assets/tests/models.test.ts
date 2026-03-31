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
});
