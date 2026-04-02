import type { RendererContext } from '@arcane-engine/renderer';
import * as THREE from 'three';
import { createTextureCache, disposeAssetCache, type AssetCache } from './cache.js';
import { loadModel, type ModelAsset, type ModelSource } from './models.js';
import { loadTexture, type TextureLoadOptions, type TextureSource } from './textures.js';

/**
 * Named texture entry used by `preloadSceneAssets()`.
 */
export interface SceneTextureAssetDefinition {
  /**
   * Texture URL or Vite-imported asset source.
   */
  source: TextureSource;
  /**
   * Optional texture load settings.
   */
  options?: TextureLoadOptions;
}

/**
 * Named model entry used by `preloadSceneAssets()`.
 */
export interface SceneModelAssetDefinition {
  /**
   * Model URL or Vite-imported `.gltf` / `.glb` source.
   */
  source: ModelSource;
}

/**
 * Small explicit manifest for one scene's imported assets.
 */
export interface SceneAssetManifest {
  /**
   * Named texture assets for the scene.
   */
  textures?: Record<string, SceneTextureAssetDefinition>;
  /**
   * Named model assets for the scene.
   */
  models?: Record<string, SceneModelAssetDefinition>;
}

type LoadedSceneTextures<TManifest extends SceneAssetManifest> =
  TManifest['textures'] extends Record<string, SceneTextureAssetDefinition>
    ? { [K in keyof TManifest['textures']]: THREE.Texture }
    : {};

type LoadedSceneModels<TManifest extends SceneAssetManifest> =
  TManifest['models'] extends Record<string, SceneModelAssetDefinition>
    ? { [K in keyof TManifest['models']]: ModelAsset }
    : {};

/**
 * Progress snapshot reported while `preloadSceneAssets()` loads a manifest.
 */
export interface SceneAssetLoadProgress {
  /**
   * Number of completed asset loads.
   */
  loaded: number;
  /**
   * Number of total asset loads in the manifest.
   */
  total: number;
  /**
   * Name of the asset that just completed, if any.
   */
  assetName?: string;
  /**
   * Asset kind that just completed, if any.
   */
  assetKind?: 'texture' | 'model';
}

/**
 * Options for `preloadSceneAssets()`.
 */
export interface PreloadSceneAssetsOptions {
  /**
   * Optional existing cache to reuse for this load.
   *
   * If omitted, `preloadSceneAssets()` creates one and returns it in the
   * loaded bundle.
   */
  cache?: AssetCache;
  /**
   * Optional progress callback for loading overlays or debug logs.
   */
  onProgress?: (progress: SceneAssetLoadProgress) => void;
}

/**
 * Loaded scene assets plus the cache that owns them.
 */
export interface SceneAssetBundle<TManifest extends SceneAssetManifest = SceneAssetManifest> {
  /**
   * Cache that owns the loaded textures and model sources.
   */
  cache: AssetCache;
  /**
   * Named loaded textures from the manifest.
   */
  textures: LoadedSceneTextures<TManifest>;
  /**
   * Named loaded models from the manifest.
   */
  models: LoadedSceneModels<TManifest>;
}

/**
 * Load a named scene asset manifest through one shared asset cache.
 *
 * This keeps scene asset declaration in one place while still reusing the
 * existing `loadTexture(...)`, `loadModel(...)`, and `disposeAssetCache(...)`
 * workflow from earlier stages.
 */
export async function preloadSceneAssets<TManifest extends SceneAssetManifest>(
  ctx: RendererContext,
  manifest: TManifest,
  options: PreloadSceneAssetsOptions = {},
): Promise<SceneAssetBundle<TManifest>> {
  const cache = options.cache ?? createTextureCache();
  const textureEntries = Object.entries(manifest.textures ?? {});
  const modelEntries = Object.entries(manifest.models ?? {});
  const total = textureEntries.length + modelEntries.length;
  let loaded = 0;

  options.onProgress?.({ loaded, total });

  try {
    const textures = {} as LoadedSceneTextures<TManifest>;
    const models = {} as LoadedSceneModels<TManifest>;

    await Promise.all([
      ...textureEntries.map(async ([name, definition]) => {
        const texture = await loadTexture(
          { ...ctx, assetCache: cache },
          definition.source,
          definition.options,
        );
        (textures as Record<string, THREE.Texture>)[name] = texture;
        loaded += 1;
        options.onProgress?.({
          loaded,
          total,
          assetName: name,
          assetKind: 'texture',
        });
      }),
      ...modelEntries.map(async ([name, definition]) => {
        const model = await loadModel(cache, definition.source);
        (models as Record<string, ModelAsset>)[name] = model;
        loaded += 1;
        options.onProgress?.({
          loaded,
          total,
          assetName: name,
          assetKind: 'model',
        });
      }),
    ]);

    return {
      cache,
      textures,
      models,
    };
  } catch (error) {
    if (!options.cache) {
      disposeAssetCache(cache);
    }
    throw error;
  }
}
