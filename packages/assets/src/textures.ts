import type { RendererContext } from '@arcane-engine/renderer';
import * as THREE from 'three';
import {
  assertAssetCacheNotDisposed,
  getAssetCacheState,
  trackCacheTexture,
  type AssetCache,
  type AssetCacheState,
} from './cache.js';

export type { AssetCache } from './cache.js';
export { createTextureCache, disposeAssetCache } from './cache.js';

/**
 * Supported texture source types. Vite asset imports resolve to strings.
 */
export type TextureSource = string | URL;

/**
 * Supported wrap modes for texture axes.
 */
export type TextureWrapMode = 'repeat' | 'clamp';

/**
 * Supported minification filters.
 */
export type TextureMinFilter =
  | 'linear'
  | 'nearest'
  | 'linear-mipmap-linear'
  | 'linear-mipmap-nearest'
  | 'nearest-mipmap-linear'
  | 'nearest-mipmap-nearest';

/**
 * Supported magnification filters.
 */
export type TextureMagFilter = 'linear' | 'nearest';

/**
 * Small repeat vector used by `loadTexture()`.
 */
export interface TextureRepeat {
  x?: number;
  y?: number;
}

/**
 * Color-space presets for loaded textures.
 *
 * Use `'srgb'` for color/albedo maps and `'none'` for data textures like
 * normal, roughness, or metalness maps. `'auto'` follows the renderer output
 * color space from Stage 14.
 */
export type TextureColorSpace = 'auto' | 'srgb' | 'none';

/**
 * Load-time texture options kept intentionally small for Stage 15.
 */
export interface TextureLoadOptions {
  /**
   * X-axis wrap mode.
   *
   * Defaults to `'repeat'` when `repeat` is provided, otherwise `'clamp'`.
   */
  wrapX?: TextureWrapMode;
  /**
   * Y-axis wrap mode.
   *
   * Defaults to `'repeat'` when `repeat` is provided, otherwise `'clamp'`.
   */
  wrapY?: TextureWrapMode;
  /**
   * UV repeat amount. Omitted axes default to `1`.
   */
  repeat?: TextureRepeat;
  /**
   * Minification filter. Defaults to Three.js's texture default.
   */
  minFilter?: TextureMinFilter;
  /**
   * Magnification filter. Defaults to Three.js's texture default.
   */
  magFilter?: TextureMagFilter;
  /**
   * Texture color space.
   *
   * Defaults to `'auto'`, which follows `ctx.renderer.outputColorSpace`.
   */
  colorSpace?: TextureColorSpace;
}

/**
 * Renderer context plus an optional cache for texture reuse.
 */
export interface TextureLoadContext extends RendererContext {
  readonly assetCache?: AssetCache;
}

interface ResolvedTextureLoadOptions {
  readonly wrapX: TextureWrapMode;
  readonly wrapY: TextureWrapMode;
  readonly repeatX: number;
  readonly repeatY: number;
  readonly minFilter?: TextureMinFilter;
  readonly magFilter?: TextureMagFilter;
  readonly colorSpace: THREE.ColorSpace;
}

const TEXTURE_WRAP: Record<TextureWrapMode, THREE.Wrapping> = {
  repeat: THREE.RepeatWrapping,
  clamp: THREE.ClampToEdgeWrapping,
};

const TEXTURE_MIN_FILTERS: Record<TextureMinFilter, THREE.TextureFilter> = {
  linear: THREE.LinearFilter,
  nearest: THREE.NearestFilter,
  'linear-mipmap-linear': THREE.LinearMipmapLinearFilter,
  'linear-mipmap-nearest': THREE.LinearMipmapNearestFilter,
  'nearest-mipmap-linear': THREE.NearestMipmapLinearFilter,
  'nearest-mipmap-nearest': THREE.NearestMipmapNearestFilter,
};

const TEXTURE_MAG_FILTERS: Record<TextureMagFilter, THREE.MagnificationTextureFilter> = {
  linear: THREE.LinearFilter,
  nearest: THREE.NearestFilter,
};

/**
 * Load a texture with explicit wrapping, filtering, color-space, and optional
 * cache reuse.
 *
 * Pass a cache by spreading it into the renderer context:
 *
 * ```ts
 * const cache = createTextureCache();
 * const textureCtx = { ...ctx, assetCache: cache };
 * const floor = await loadTexture(textureCtx, floorTextureUrl, {
 *   repeat: { x: 8, y: 8 },
 * });
 * ```
 */
export async function loadTexture(
  ctx: TextureLoadContext,
  source: TextureSource,
  options: TextureLoadOptions = {},
): Promise<THREE.Texture> {
  const resolvedSource = resolveTextureSource(source);
  const resolvedOptions = resolveTextureOptions(ctx, options);
  const cache = ctx.assetCache;

  if (!cache) {
    const texture = await loadBaseTexture(resolvedSource);
    applyTextureOptions(texture, resolvedOptions);
    return texture;
  }

  const state = getAssetCacheState(cache);
  assertAssetCacheNotDisposed(state, 'loadTexture');

  const variantKey = `${resolvedSource}::${JSON.stringify(resolvedOptions)}`;
  const existingVariant = state.textureVariantLoads.get(variantKey);
  if (existingVariant) {
    return existingVariant;
  }

  const variantLoad = getSourceTexture(state, resolvedSource)
    .then((baseTexture) => {
      assertAssetCacheNotDisposed(state, 'loadTexture');

      const texture = baseTexture.clone();
      applyTextureOptions(texture, resolvedOptions);
      trackCacheTexture(state, texture);

      if (state.disposed) {
        texture.dispose();
        throw new Error('loadTexture: asset cache was disposed before the texture finished loading');
      }

      return texture;
    })
    .catch((error: unknown) => {
      state.textureVariantLoads.delete(variantKey);
      throw error;
    });

  state.textureVariantLoads.set(variantKey, variantLoad);
  return variantLoad;
}

function resolveTextureSource(source: TextureSource): string {
  return typeof source === 'string' ? source : source.toString();
}

function resolveTextureOptions(
  ctx: TextureLoadContext,
  options: TextureLoadOptions,
): ResolvedTextureLoadOptions {
  const repeatX = options.repeat?.x ?? 1;
  const repeatY = options.repeat?.y ?? 1;
  const hasRepeat = options.repeat !== undefined;

  return {
    wrapX: options.wrapX ?? (hasRepeat ? 'repeat' : 'clamp'),
    wrapY: options.wrapY ?? (hasRepeat ? 'repeat' : 'clamp'),
    repeatX,
    repeatY,
    minFilter: options.minFilter,
    magFilter: options.magFilter,
    colorSpace: resolveColorSpace(ctx, options.colorSpace ?? 'auto'),
  };
}

function resolveColorSpace(
  ctx: TextureLoadContext,
  colorSpace: TextureColorSpace,
): THREE.ColorSpace {
  if (colorSpace === 'srgb') {
    return THREE.SRGBColorSpace;
  }

  if (colorSpace === 'none') {
    return THREE.NoColorSpace;
  }

  return ctx.renderer.outputColorSpace || THREE.SRGBColorSpace;
}

async function getSourceTexture(
  state: AssetCacheState,
  source: string,
): Promise<THREE.Texture> {
  const existing = state.textureSourceLoads.get(source);
  if (existing) {
    return existing;
  }

  const load = loadBaseTexture(source)
    .then((texture) => {
      if (state.disposed) {
        texture.dispose();
        throw new Error('loadTexture: asset cache was disposed before the texture finished loading');
      }

      trackCacheTexture(state, texture);
      return texture;
    })
    .catch((error: unknown) => {
      state.textureSourceLoads.delete(source);
      throw error;
    });

  state.textureSourceLoads.set(source, load);
  return load;
}

async function loadBaseTexture(source: string): Promise<THREE.Texture> {
  const loader = new THREE.TextureLoader();
  return loader.loadAsync(source);
}

function applyTextureOptions(
  texture: THREE.Texture,
  options: ResolvedTextureLoadOptions,
): void {
  texture.colorSpace = options.colorSpace;
  texture.wrapS = TEXTURE_WRAP[options.wrapX];
  texture.wrapT = TEXTURE_WRAP[options.wrapY];
  texture.repeat.set(options.repeatX, options.repeatY);

  if (options.minFilter) {
    texture.minFilter = TEXTURE_MIN_FILTERS[options.minFilter];
  }

  if (options.magFilter) {
    texture.magFilter = TEXTURE_MAG_FILTERS[options.magFilter];
  }

  texture.needsUpdate = true;
}
