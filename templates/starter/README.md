# __ARCANE_PROJECT_NAME__

Starter project scaffolded with Arcane Engine.

## Getting Started

```sh
pnpm install
pnpm dev
```

## Included Demo

- `game.config.ts` configures the initial scene and renderer defaults
- `scenes/title.ts` shows the title scene
- `scenes/gameplay.ts` shows a controllable cube with scene transitions
- `src/runtime/*` contains the small file-convention runtime helpers, including the optional scene `preload()` seam
- `@arcane-engine/assets` is already installed for texture, model, and imported-animation loading when you want it

Press `Enter` on the title scene to switch into gameplay, then use `WASD` or the arrow keys to move.
Press `Escape` in gameplay to return to the title scene.

If you want the shipped FPS gameplay baseline from V2 and Stage 18, copy from `examples/hello-cube` rather than expecting it in this starter. The shared FPS scene shell and player spawn helpers stay example-local for now so the starter can remain small and general-purpose.
If you want a concrete texture + model + preload walkthrough from day one, scaffold with `create-arcane --template asset-ready` instead of turning this minimal starter into a second example.

## Preload A Scene

If a scene needs assets before `setup(world)` runs, export an optional async `preload()` function from that scene module. The starter runtime will await it before loading the scene.

```ts
export async function preload(): Promise<void> {
  // load scene-local assets here
}
```

Keep `setup(world)` synchronous. Stage 19 intentionally uses a small runtime seam instead of changing the core `Scene` lifecycle. The runtime also loads scene modules on demand, so heavier scenes do not bloat the initial title-screen bundle.

## Add A Texture

Import a file with Vite, declare it in one scene asset manifest, preload it, and dispose the cache in scene teardown.

```ts
import {
  disposeAssetCache,
  preloadSceneAssets,
} from '@arcane-engine/assets';
import textureUrl from './assets/floor.png';

const assets = await preloadSceneAssets(ctx, {
  textures: {
    floor: {
      source: textureUrl,
      options: {
        repeat: { x: 4, y: 4 },
        colorSpace: 'srgb',
      },
    },
  },
});

material.map = assets.textures.floor;
material.color.set(0xffffff);
material.needsUpdate = true;

disposeAssetCache(assets.cache);
```

Call `disposeAssetCache(...)` after the scene has removed meshes and is done with the materials that use those textures.

## Add A Model

Drop a `.glb` into your app, declare it in the scene manifest, then spawn cloned props from that one loaded asset.

```ts
import {
  disposeAssetCache,
  preloadSceneAssets,
  spawnModelInstances,
} from '@arcane-engine/assets';
import modelUrl from './assets/crystal.glb?url';

const assets = await preloadSceneAssets(ctx, {
  models: {
    crystal: { source: modelUrl },
  },
});

spawnModelInstances(world, ctx, assets.models.crystal, [
  { position: { x: 0, y: 1.2, z: 0 }, scale: 1.25 },
  { position: { x: 4, y: 1.2, z: -3 }, rotation: { y: 0.35 }, scale: 0.95 },
]);

disposeAssetCache(assets.cache);
```

`spawnModelInstances(...)` keeps the repeated-prop layout readable while still cloning from one cached source.

## Add An Animated Model

Animated imported models use the same load and spawn path as static props.

```ts
import {
  animationSystem,
  createTextureCache,
  loadModel,
  playAnimation,
  spawnModel,
} from '@arcane-engine/assets';
import { registerSystem } from '@arcane-engine/core';
import modelUrl from './assets/beacon.gltf?url';

const assetCache = createTextureCache();
const beacon = await loadModel(assetCache, modelUrl);
const beaconEntity = spawnModel(world, ctx, beacon, {
  position: { x: 0, y: 1.2, z: -3 },
  scale: 1.5,
});

registerSystem(world, animationSystem());
playAnimation(world, beaconEntity, 'Idle', { loop: 'repeat' });
```

If the imported model has clips, `spawnModel(...)` adds an `AnimationPlayer` automatically. Use `playAnimation(...)` again later to switch to another named clip with a small fade.
