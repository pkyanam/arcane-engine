# @arcane-engine/assets

Thin asset-loading helpers for Arcane Engine.

Stage 15 introduced the explicit cache and texture workflow. Stage 16 extends
that same cache to glTF / GLB model loading. Stage 17 adds explicit animation
playback for imported models.

## What it exports

- `createTextureCache()` to create the shared `AssetCache`
- `loadTexture(ctx, source, options?)` to load a texture with simple wrapping, filtering, and color-space options
- `loadModel(cache, source)` to load one glTF / GLB source once
- `getModelAnimationClipNames(modelAsset)` to inspect the clip names on a loaded model
- `spawnModel(world, ctx, modelAsset, options?)` to clone a loaded model into the ECS world
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

## Example

```ts
import {
  animationSystem,
  createTextureCache,
  disposeAssetCache,
  getModelAnimationClipNames,
  loadModel,
  loadTexture,
  playAnimation,
  spawnModel,
} from '@arcane-engine/assets';
import type { World } from '@arcane-engine/core';
import { registerSystem } from '@arcane-engine/core';
import type { RendererContext } from '@arcane-engine/renderer';
import floorTextureUrl from './assets/floor.png';
import crystalModelUrl from './assets/crystal.glb?url';
import beaconModelUrl from './assets/beacon.glb?url';

const assetCache = createTextureCache();

export async function setupAssets(world: World, ctx: RendererContext): Promise<void> {
  const floorTexture = await loadTexture(
    { ...ctx, assetCache },
    floorTextureUrl,
    {
      repeat: { x: 8, y: 8 },
      colorSpace: 'srgb',
    },
  );

  floorMaterial.map = floorTexture;
  floorMaterial.color.set(0xffffff);
  floorMaterial.needsUpdate = true;

  const crystal = await loadModel(assetCache, crystalModelUrl);
  spawnModel(world, ctx, crystal, {
    position: { x: 4, y: 1.2, z: -3 },
    scale: 1.25,
  });

  const beacon = await loadModel(assetCache, beaconModelUrl);
  const beaconEntity = spawnModel(world, ctx, beacon, {
    position: { x: 0, y: 1.1, z: -4 },
    scale: 1.6,
  });

  console.log(getModelAnimationClipNames(beacon)); // ['Idle', 'Activate']

  registerSystem(world, animationSystem());
  playAnimation(world, beaconEntity, 'Idle', { loop: 'repeat' });
}

export function teardownAssets(): void {
  disposeAssetCache(assetCache);
}
```

## Teardown guidance

Keep one cache per scene or loading phase.

When the scene ends:

1. remove meshes from the Three.js scene
2. dispose scene-local geometries and materials
3. call `disposeAssetCache(cache)` after those objects are no longer using the textures or model resources

That keeps Stage 17 explicit and easy to reason about. There is no hidden preload manager yet.

## Not in Stage 17

This package still does not add:

- animation state machines or blend trees
- retargeting
- prefab manifests
- a generalized preload system

Those stay in later V3 stages.
