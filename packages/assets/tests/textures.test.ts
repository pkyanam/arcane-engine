import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { TextureLoadContext } from '../src/textures.js';
import {
  createTextureCache,
  disposeAssetCache,
  loadTexture,
} from '../src/textures.js';

function makeTexture(name: string): THREE.Texture {
  const texture = new THREE.Texture();
  texture.name = name;
  texture.dispose = vi.fn();
  return texture;
}

function makeTextureContext(assetCache?: ReturnType<typeof createTextureCache>): TextureLoadContext {
  return {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    renderer: {
      outputColorSpace: THREE.SRGBColorSpace,
    } as THREE.WebGLRenderer,
    assetCache,
  };
}

describe('loadTexture', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads a texture and applies repeat, wrapping, filtering, and color space', async () => {
    vi.spyOn(THREE.TextureLoader.prototype, 'loadAsync').mockResolvedValue(makeTexture('floor'));
    const ctx = makeTextureContext();

    const texture = await loadTexture(ctx, '/textures/floor.png', {
      repeat: { x: 8, y: 4 },
      minFilter: 'linear-mipmap-linear',
      magFilter: 'nearest',
    });

    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
    expect(texture.wrapS).toBe(THREE.RepeatWrapping);
    expect(texture.wrapT).toBe(THREE.RepeatWrapping);
    expect(texture.repeat.x).toBe(8);
    expect(texture.repeat.y).toBe(4);
    expect(texture.minFilter).toBe(THREE.LinearMipmapLinearFilter);
    expect(texture.magFilter).toBe(THREE.NearestFilter);
    expect(texture.version).toBeGreaterThan(0);
  });

  it('reuses the same cached texture instance for the same source and options', async () => {
    const cache = createTextureCache();
    const ctx = makeTextureContext(cache);
    const loadAsync = vi
      .spyOn(THREE.TextureLoader.prototype, 'loadAsync')
      .mockResolvedValue(makeTexture('wall'));

    const first = await loadTexture(ctx, '/textures/wall.png', {
      repeat: { x: 4, y: 2 },
    });
    const second = await loadTexture(ctx, '/textures/wall.png', {
      repeat: { x: 4, y: 2 },
    });

    expect(first).toBe(second);
    expect(loadAsync).toHaveBeenCalledTimes(1);
  });

  it('reuses the loaded source but creates separate variants for different options', async () => {
    const cache = createTextureCache();
    const ctx = makeTextureContext(cache);
    const loadAsync = vi
      .spyOn(THREE.TextureLoader.prototype, 'loadAsync')
      .mockResolvedValue(makeTexture('crate'));

    const repeated = await loadTexture(ctx, '/textures/crate.png', {
      repeat: { x: 2, y: 2 },
    });
    const clamped = await loadTexture(ctx, '/textures/crate.png', {
      wrapX: 'clamp',
      wrapY: 'clamp',
      colorSpace: 'none',
    });

    expect(repeated).not.toBe(clamped);
    expect(repeated.image).toBe(clamped.image);
    expect(loadAsync).toHaveBeenCalledTimes(1);
    expect(clamped.colorSpace).toBe(THREE.NoColorSpace);
  });

  it('disposes tracked textures when a cache is torn down', async () => {
    const cache = createTextureCache();
    const ctx = makeTextureContext(cache);
    const disposeSpy = vi.spyOn(THREE.Texture.prototype, 'dispose');
    vi.spyOn(THREE.TextureLoader.prototype, 'loadAsync').mockResolvedValue(makeTexture('ground'));

    await loadTexture(ctx, '/textures/ground.png');
    disposeAssetCache(cache);

    expect(disposeSpy).toHaveBeenCalled();
  });

  it('rejects new loads after a cache has been disposed', async () => {
    const cache = createTextureCache();
    const ctx = makeTextureContext(cache);
    disposeAssetCache(cache);

    await expect(loadTexture(ctx, '/textures/late.png')).rejects.toThrow(
      'loadTexture: asset cache has already been disposed',
    );
  });
});
