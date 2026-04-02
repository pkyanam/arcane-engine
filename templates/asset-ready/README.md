# __ARCANE_PROJECT_NAME__

Asset-ready starter scaffolded with Arcane Engine.

## Getting Started

```sh
pnpm install
pnpm dev
```

## Included Demo

- `game.config.ts` configures the initial scene and renderer defaults
- `scenes/title.ts` introduces the asset-ready path
- `scenes/gameplay.ts` shows the full Stage 15-19 path: preload, textures, imported props, and an animated imported beacon
- `src/assets/*` contains tiny example textures plus `.glb` / `.gltf` files you can replace with your own
- `src/runtime/*` contains the small file-convention runtime helpers, including the optional scene `preload()` seam and a simple preload overlay
- `@arcane-engine/assets` is already installed for texture, model, repeated prop spawning, and imported-animation playback

Press `Enter` on the title scene to open the asset-ready room, then use `WASD` or the arrow keys to move.
Press `Escape` in gameplay to return to the title scene.

If you want the shipped FPS gameplay baseline from V2 and Stage 18, copy from `examples/hello-cube` rather than expecting it in this starter. The shared FPS scene shell and player spawn helpers stay example-local for now so the starter can remain focused on asset onboarding.

## Preload A Scene

If a scene needs assets before `setup(world)` runs, export an optional async `preload()` function from that scene module. The runtime will await it before loading the scene.

```ts
export async function preload(): Promise<void> {
  // load scene-local assets here
}
```

Keep `setup(world)` synchronous. Stage 19 intentionally uses a small runtime seam instead of changing the core `Scene` lifecycle. This template also passes preload progress into a small overlay so you can swap in your own loading UI later without changing the scene contract, and it lazy-loads scene modules so the initial bundle stays focused on the current path.

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

## Swap In Your Own Assets

1. Replace the files in `src/assets/`.
2. Update the `GAMEPLAY_SCENE_ASSET_MANIFEST` in `scenes/gameplay.ts`.
3. Adjust the layout passed into `spawnModelInstances(...)` or `spawnModel(...)`.
4. Keep `preload()` async and `setup(world)` sync.

If you do not need one of the shipped demo assets, delete the import, remove it from the manifest, and remove the code that uses it. The template is meant to be edited directly, not hidden behind CLI flags.
