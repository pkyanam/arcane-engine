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
- `src/runtime/*` contains the small file-convention runtime helpers
- `@arcane-engine/assets` is already installed for texture and model loading when you want it

Press `Enter` on the title scene to switch into gameplay, then use `WASD` or the arrow keys to move.
Press `Escape` in gameplay to return to the title scene.

## Add A Texture

Import a file with Vite, load it with `loadTexture(...)`, and dispose the cache in scene teardown.

```ts
import {
  createTextureCache,
  disposeAssetCache,
  loadTexture,
} from '@arcane-engine/assets';
import textureUrl from './assets/floor.png';

const textureCache = createTextureCache();

const texture = await loadTexture({ ...ctx, assetCache: textureCache }, textureUrl, {
  repeat: { x: 4, y: 4 },
  colorSpace: 'srgb',
});

material.map = texture;
material.color.set(0xffffff);
material.needsUpdate = true;

disposeAssetCache(textureCache);
```

Call `disposeAssetCache(...)` after the scene has removed meshes and is done with the materials that use those textures.

## Add A Model

Drop a `.glb` into your app, load it once, then spawn cloned props from that one loaded asset.

```ts
import {
  createTextureCache,
  disposeAssetCache,
  loadModel,
  spawnModel,
} from '@arcane-engine/assets';
import modelUrl from './assets/crystal.glb?url';

const assetCache = createTextureCache();
const crystal = await loadModel(assetCache, modelUrl);

spawnModel(world, ctx, crystal, {
  position: { x: 0, y: 1.2, z: 0 },
  scale: 1.25,
});

disposeAssetCache(assetCache);
```

`spawnModel(...)` clones the cached source each time, so you can place the same prop more than once without reloading the file.
