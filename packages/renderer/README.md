# @arcane-engine/renderer

Thin Three.js helpers for Arcane Engine scenes.

## What it exports

- `createRenderer()` to create a `scene`, `camera`, and `renderer`
- transform components: `Position`, `Rotation`, `Scale`, `MeshRef`, `Spin`
- `renderSystem(ctx)` to sync ECS transforms and submit a frame
- `spawnMesh()` to create a mesh-backed entity quickly
- lighting helpers:
  - `addEnvironmentLighting()`
  - `addDirectionalShadowLight()`

## `createRenderer()` options

`createRenderer()` still supports the original calls:

```ts
const ctx = createRenderer();
const ctx = createRenderer(canvas);
```

Stage 14 adds a small options object:

```ts
const ctx = createRenderer({
  clearColor: 0x020617,
  background: 0x020617,
  maxPixelRatio: 2,
  shadowMap: true,
});
```

Available options:

- `clearColor`: renderer clear color when the scene has no background
- `background`: scene background color or texture
- `maxPixelRatio`: caps `renderer.setPixelRatio()` for high-DPI screens
- `shadowMap`: `true` for the default soft shadow setup, or an object with `enabled` / `type`
- `outputColorSpace`: defaults to `THREE.SRGBColorSpace`

If you pass your own canvas, Arcane Engine now keeps the camera aspect and draw buffer in sync with that canvas on resize too.

## Lighting defaults for PBR materials

Recommended starting point for `MeshStandardMaterial` and imported models:

1. Use `addEnvironmentLighting()` for soft fill.
2. Keep `ambientIntensity` subtle, usually around `0.2` to `0.4`.
3. Let the hemisphere light do more of the work, usually around `0.9` to `1.4`.
4. Add one directional key light with `addDirectionalShadowLight()` for shape and shadows.
5. Mark important meshes with `castShadow = true` and floors or walls with `receiveShadow = true`.

Example:

```ts
import {
  addDirectionalShadowLight,
  addEnvironmentLighting,
  createRenderer,
} from '@arcane-engine/renderer';

const ctx = createRenderer({
  background: 0x020617,
  maxPixelRatio: 2,
  shadowMap: true,
});

const [ambient, hemisphere] = addEnvironmentLighting(ctx, {
  ambientIntensity: 0.3,
  hemisphereIntensity: 1.1,
});

const { light, target } = addDirectionalShadowLight(ctx, {
  position: { x: 8, y: 12, z: 10 },
  shadowCameraExtent: 18,
});
```

The renderer still does not load textures or models by itself. Use
`@arcane-engine/assets` for Stage 15 texture loading and Stage 16 glTF / GLB loading.
