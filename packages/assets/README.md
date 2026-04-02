# @arcane-engine/assets

Thin asset-loading helpers for Arcane Engine.

Stage 15 introduced the explicit cache and texture workflow. Stage 16 extends
that same cache to glTF / GLB model loading. Stage 17 adds explicit animation
playback for imported models. Stage 19 adds named scene asset manifests,
loading-progress hooks, and a repeated-prop helper. Stage 23 tightens
disposal coverage for cached texture variants and shared model resources
without changing the public API shape.

## What it exports

- `createTextureCache()` to create the shared `AssetCache`
- `loadTexture(ctx, source, options?)` to load a texture with simple wrapping, filtering, and color-space options
- `loadModel(cache, source)` to load one glTF / GLB source once
- `preloadSceneAssets(ctx, manifest, options?)` to load one scene manifest through one shared cache
- `getModelAnimationClipNames(modelAsset)` to inspect the clip names on a loaded model
- `spawnModel(world, ctx, modelAsset, options?)` to clone a loaded model into the ECS world
- `spawnModelInstances(world, ctx, modelAsset, instances)` to place repeated props from one loaded source
- `AnimationPlayer` for spawned animated model instances
- `animationSystem()` to advance imported-model mixers every tick
- `playAnimation(world, entity, clipName, options?)` for named clip playback, loop mode, and fades
- `stopAnimation(world, entity, options?)` to stop the current clip immediately or with a fade
- `disposeAssetCache(cache)` to release cached textures and model resources during teardown

## Supported texture workflow

- Vite-friendly asset imports (`png`, `jpg`, `jpeg`, `webp`, `svg`, and other URL-style sources)
- repeat or clamp wrapping
- min / mag filtering
- color-space presets:
  - `'auto'` follows the renderer output color space from Stage 14
  - `'srgb'` is the right default for color / albedo maps
  - `'none'` is for data textures like normal, roughness, and metalness maps

## Supported model workflow

- glTF / GLB only in Stage 16
- Vite-friendly URL imports, usually `import modelUrl from './assets/prop.glb?url'`
- one loaded source can be spawned more than once without reloading the file
- `spawnModel()` clones the cached source into a wrapper root so ECS transforms
  move the whole prop without overwriting the model's internal authored transforms
- if the imported model has clips, `spawnModel()` also attaches `AnimationPlayer`

## Supported animation workflow

- clip selection by name
- repeat, once, and ping-pong loop modes
- explicit `playAnimation(...)` / `stopAnimation(...)` controls
- small readable fade transitions between clips
- one mixer per spawned animated model instance

## Supported scene asset workflow

- one named manifest per scene
- one shared cache per preload pass
- progress callbacks for a simple loading overlay
- sync scene setup after preload finishes
- repeated imported prop placement from one loaded model source

## Example

```ts
import {
  animationSystem,
  disposeAssetCache,
  getModelAnimationClipNames,
  playAnimation,
  preloadSceneAssets,
  spawnModel,
  spawnModelInstances,
} from '@arcane-engine/assets';
import type { World } from '@arcane-engine/core';
import { registerSystem } from '@arcane-engine/core';
import type { RendererContext } from '@arcane-engine/renderer';
import floorTextureUrl from './assets/floor.png';
import crystalModelUrl from './assets/crystal.glb?url';
import beaconModelUrl from './assets/beacon.glb?url';

const manifest = {
  textures: {
    floor: {
      source: floorTextureUrl,
      options: { repeat: { x: 8, y: 8 }, colorSpace: 'srgb' },
    },
  },
  models: {
    crystal: { source: crystalModelUrl },
    beacon: { source: beaconModelUrl },
  },
} as const;

let assets: Awaited<ReturnType<typeof preloadSceneAssets>> | undefined;

export async function setupAssets(world: World, ctx: RendererContext): Promise<void> {
  assets = await preloadSceneAssets(ctx, manifest, {
    onProgress(progress) {
      console.log(progress.loaded, progress.total, progress.assetName);
    },
  });

  floorMaterial.map = assets.textures.floor;
  floorMaterial.color.set(0xffffff);
  floorMaterial.needsUpdate = true;

  spawnModelInstances(world, ctx, assets.models.crystal, [
    { position: { x: 4, y: 1.2, z: -3 }, scale: 1.25 },
    { position: { x: -6, y: 1.2, z: 8 }, rotation: { y: 0.45 }, scale: 0.95 },
  ]);

  const beaconEntity = spawnModel(world, ctx, assets.models.beacon, {
    position: { x: 0, y: 1.1, z: -4 },
    scale: 1.6,
  });

  console.log(getModelAnimationClipNames(assets.models.beacon)); // ['Idle', 'Activate']

  registerSystem(world, animationSystem());
  playAnimation(world, beaconEntity, 'Idle', { loop: 'repeat' });
}

export function teardownAssets(): void {
  if (assets) {
    disposeAssetCache(assets.cache);
    assets = undefined;
  }
}
```

## Teardown guidance

Keep one cache per scene or loading phase.

When the scene ends:

1. remove meshes from the Three.js scene
2. dispose scene-local geometries and materials
3. call `disposeAssetCache(cache)` after those objects are no longer using the textures or model resources

That keeps Stage 19 explicit and easy to reason about. There is still no hidden preload manager.

## Not in Stage 19

This package still does not add:

- animation state machines or blend trees
- retargeting
- build-time manifest generation
- hidden asset registries or editor tooling

Those stay in later V3 stages.
