import * as THREE from 'three';

/**
 * Opaque asset cache handle created by `createTextureCache()`.
 *
 * Stage 15 introduced this cache for textures. Stage 16 reuses the same cache
 * for model source reuse too.
 */
export interface AssetCache {
  readonly kind: 'arcane-asset-cache';
}

export interface AssetCacheState {
  disposed: boolean;
  readonly textureSourceLoads: Map<string, Promise<THREE.Texture>>;
  readonly textureVariantLoads: Map<string, Promise<THREE.Texture>>;
  readonly modelLoads: Map<string, Promise<unknown>>;
  readonly trackedTextures: Set<THREE.Texture>;
  readonly disposeCallbacks: Set<() => void>;
}

const cacheStates = new WeakMap<AssetCache, AssetCacheState>();

/**
 * Create a cache for texture source reuse and model source reuse.
 *
 * Keep one cache per scene or loading phase, then dispose it during teardown
 * once you are done with every texture or model that came from it.
 */
export function createTextureCache(): AssetCache {
  const cache: AssetCache = { kind: 'arcane-asset-cache' };
  cacheStates.set(cache, {
    disposed: false,
    textureSourceLoads: new Map(),
    textureVariantLoads: new Map(),
    modelLoads: new Map(),
    trackedTextures: new Set(),
    disposeCallbacks: new Set(),
  });
  return cache;
}

/**
 * Dispose every tracked texture and loaded-model resource owned by a cache.
 *
 * Call this during scene teardown after materials, meshes, and spawned models
 * that reference the cached assets have been removed from the scene.
 */
export function disposeAssetCache(cache: AssetCache): void {
  const state = getAssetCacheState(cache);
  if (state.disposed) {
    return;
  }

  state.disposed = true;

  for (const texture of state.trackedTextures) {
    texture.dispose();
  }

  for (const dispose of state.disposeCallbacks) {
    dispose();
  }

  state.trackedTextures.clear();
  state.textureSourceLoads.clear();
  state.textureVariantLoads.clear();
  state.modelLoads.clear();
  state.disposeCallbacks.clear();
}

export function getAssetCacheState(cache: AssetCache): AssetCacheState {
  const state = cacheStates.get(cache);
  if (!state) {
    throw new Error('Arcane Engine asset cache was not created by createTextureCache()');
  }
  return state;
}

export function assertAssetCacheNotDisposed(
  state: AssetCacheState,
  consumer: 'loadTexture' | 'loadModel',
): void {
  if (state.disposed) {
    throw new Error(`${consumer}: asset cache has already been disposed`);
  }
}

export function trackCacheTexture(state: AssetCacheState, texture: THREE.Texture): void {
  state.trackedTextures.add(texture);
}

export function registerCacheDisposeCallback(
  state: AssetCacheState,
  dispose: () => void,
): void {
  state.disposeCallbacks.add(dispose);
}
