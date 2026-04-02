# @arcane-engine/assets

Beginner-friendly asset helpers for Arcane Engine.

This package handles:

- textures
- glTF/GLB models
- repeated model spawning
- imported model animation playback
- scene preload with progress updates
- explicit cache disposal

The main idea is simple:

1. load imported files once
2. reuse them as many times as you want
3. dispose them when the scene ends

## Install

```sh
pnpm add @arcane-engine/assets @arcane-engine/core @arcane-engine/renderer three
```

## What It Exports

Loading and cache:

- `createTextureCache()`
- `disposeAssetCache(cache)`
- `loadTexture(ctx, source, options?)`
- `loadModel(cache, source)`
- `preloadSceneAssets(ctx, manifest, options?)`

Models:

- `spawnModel(world, ctx, modelAsset, options?)`
- `spawnModelInstances(world, ctx, modelAsset, instances)`
- `getModelAnimationClipNames(modelAsset)`

Animation:

- `AnimationPlayer`
- `animationSystem()`
- `playAnimation(world, entity, clipName, options?)`
- `stopAnimation(world, entity, options?)`

## Recommended Workflow

The easiest path is to declare one scene manifest and preload it:

```ts
import {
  animationSystem,
  disposeAssetCache,
  playAnimation,
  preloadSceneAssets,
  spawnModel,
  spawnModelInstances,
} from '@arcane-engine/assets';
import { registerSystem } from '@arcane-engine/core';
import floorTextureUrl from './assets/floor.png';
import crystalModelUrl from './assets/crystal.glb?url';
import beaconModelUrl from './assets/beacon.gltf?url';

const manifest = {
  textures: {
    floor: {
      source: floorTextureUrl,
      options: {
        repeat: { x: 8, y: 8 },
        colorSpace: 'srgb',
      },
    },
  },
  models: {
    crystal: { source: crystalModelUrl },
    beacon: { source: beaconModelUrl },
  },
} as const;

const assets = await preloadSceneAssets(ctx, manifest, {
  onProgress(progress) {
    console.log(progress.loaded, progress.total, progress.assetName);
  },
});

floorMaterial.map = assets.textures.floor;
floorMaterial.color.set(0xffffff);
floorMaterial.needsUpdate = true;

spawnModelInstances(world, ctx, assets.models.crystal, [
  { position: { x: -4, y: 1.2, z: 0 }, scale: 1.1 },
  { position: { x: 4, y: 1.2, z: -3 }, rotation: { y: 0.4 }, scale: 0.9 },
]);

const beacon = spawnModel(world, ctx, assets.models.beacon, {
  position: { x: 0, y: 1.1, z: -5 },
  scale: 1.5,
});

registerSystem(world, animationSystem());
playAnimation(world, beacon, 'Idle', { loop: 'repeat' });

// Later, during scene teardown:
disposeAssetCache(assets.cache);
```

## Texture Notes

`loadTexture(...)` supports:

- Vite-imported asset URLs
- repeat or clamp wrapping
- min and mag filters
- color-space settings like `'srgb'`

For most color textures, use `'srgb'`.

## Model Notes

- supported formats: `.gltf` and `.glb`
- one loaded source can be spawned many times
- `spawnModel()` adds the usual ECS transform components for you
- if the model has animation clips, `spawnModel()` also attaches `AnimationPlayer`

## Animation Notes

You control imported animations by clip name:

- `'repeat'` loop
- `'once'` loop
- `'ping-pong'` loop
- optional fade when switching clips

## Teardown Rule

Keep one asset cache per scene or loading phase.

When the scene ends:

1. remove scene-owned meshes from the Three.js scene
2. dispose scene-owned materials and geometry when needed
3. call `disposeAssetCache(cache)`

That makes asset ownership easy to reason about.
