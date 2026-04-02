import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { RendererContext } from '../../renderer/src/renderer.js';
import { preloadSceneAssets, type SceneAssetLoadProgress } from '../src/sceneAssets.js';

function makeRendererContext(): RendererContext {
  return {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    renderer: {
      outputColorSpace: THREE.SRGBColorSpace,
    } as THREE.WebGLRenderer,
  };
}

function makeTexture(name: string): THREE.Texture {
  const texture = new THREE.Texture();
  texture.name = name;
  texture.dispose = vi.fn();
  return texture;
}

function makeLoadedModel(name = 'ArcaneCrystal'): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  group.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8 }),
    ),
  );
  return group;
}

describe('preloadSceneAssets', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads named textures and models through one shared cache', async () => {
    const textureLoad = vi
      .spyOn(THREE.TextureLoader.prototype, 'loadAsync')
      .mockResolvedValueOnce(makeTexture('floor'))
      .mockResolvedValueOnce(makeTexture('wall'));
    const modelLoad = vi
      .spyOn(GLTFLoader.prototype, 'loadAsync')
      .mockResolvedValue({ scene: makeLoadedModel() } as Awaited<ReturnType<GLTFLoader['loadAsync']>>);

    const assets = await preloadSceneAssets(makeRendererContext(), {
      textures: {
        floor: {
          source: '/textures/floor.png',
          options: {
            repeat: { x: 8, y: 8 },
            colorSpace: 'srgb',
          },
        },
        wall: {
          source: '/textures/wall.png',
        },
      },
      models: {
        crystal: {
          source: '/models/crystal.glb',
        },
      },
    });

    expect(textureLoad).toHaveBeenCalledTimes(2);
    expect(modelLoad).toHaveBeenCalledTimes(1);
    expect(assets.textures.floor.repeat.x).toBe(8);
    expect(assets.textures.floor.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(assets.textures.wall).toBeInstanceOf(THREE.Texture);
    expect(assets.models.crystal.source).toBe('/models/crystal.glb');
    expect(assets.cache.kind).toBe('arcane-asset-cache');
  });

  it('reports manifest loading progress for overlay-friendly hooks', async () => {
    vi
      .spyOn(THREE.TextureLoader.prototype, 'loadAsync')
      .mockResolvedValue(makeTexture('floor'));
    vi
      .spyOn(GLTFLoader.prototype, 'loadAsync')
      .mockResolvedValue({ scene: makeLoadedModel() } as Awaited<ReturnType<GLTFLoader['loadAsync']>>);

    const progressUpdates: SceneAssetLoadProgress[] = [];

    await preloadSceneAssets(
      makeRendererContext(),
      {
        textures: {
          floor: { source: '/textures/floor.png' },
        },
        models: {
          crystal: { source: '/models/crystal.glb' },
        },
      },
      {
        onProgress(progress) {
          progressUpdates.push(progress);
        },
      },
    );

    expect(progressUpdates[0]).toEqual({ loaded: 0, total: 2 });
    expect(progressUpdates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          loaded: 1,
          total: 2,
          assetName: expect.any(String),
          assetKind: expect.stringMatching(/texture|model/),
        }),
        expect.objectContaining({
          loaded: 2,
          total: 2,
          assetName: expect.any(String),
          assetKind: expect.stringMatching(/texture|model/),
        }),
      ]),
    );
  });

  it('disposes an auto-created cache if manifest loading fails', async () => {
    const disposeSpy = vi.spyOn(THREE.Texture.prototype, 'dispose');
    vi
      .spyOn(THREE.TextureLoader.prototype, 'loadAsync')
      .mockResolvedValue(makeTexture('floor'));
    vi
      .spyOn(GLTFLoader.prototype, 'loadAsync')
      .mockRejectedValue(new Error('boom'));

    await expect(preloadSceneAssets(makeRendererContext(), {
      textures: {
        floor: { source: '/textures/floor.png' },
      },
      models: {
        crystal: { source: '/models/crystal.glb' },
      },
    })).rejects.toThrow('boom');

    expect(disposeSpy).toHaveBeenCalled();
  });
});
