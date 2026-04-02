# @arcane-engine/renderer

Thin Three.js helpers for Arcane Engine scenes.

This package gives you:

- `createRenderer()` for scene, camera, and WebGL renderer setup
- transform components like `Position` and `Rotation`
- `spawnMesh()` for quick visible entities
- `renderSystem(ctx)` to sync ECS transforms into Three.js
- lighting helpers that make beginner scenes look decent fast

## Install

```sh
pnpm add @arcane-engine/renderer @arcane-engine/core three
```

## Quick Start

```ts
import { createWorld, registerSystem } from '@arcane-engine/core';
import {
  createRenderer,
  renderSystem,
  spawnMesh,
} from '@arcane-engine/renderer';
import * as THREE from 'three';

const world = createWorld();
const ctx = createRenderer({
  background: 0x020617,
  maxPixelRatio: 2,
  shadowMap: true,
});

const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });

spawnMesh(world, ctx, geometry, material, { x: 0, y: 0, z: 0 });
registerSystem(world, renderSystem(ctx));
```

## What It Exports

- `createRenderer()`
- `addEnvironmentLighting()`
- `addDirectionalShadowLight()`
- `renderSystem(ctx)`
- `spawnMesh(world, ctx, geometry, material, position?)`
- `Position`
- `Rotation`
- `Scale`
- `MeshRef`
- `Spin`

## `createRenderer()` Options

You can call it in three ways:

```ts
const ctx = createRenderer();
const ctx = createRenderer(canvas);
const ctx = createRenderer({ background: 0x020617, shadowMap: true });
```

Useful options:

- `canvas`: render into your own canvas instead of auto-creating one
- `clearColor`: fallback clear color
- `background`: scene background color or texture
- `maxPixelRatio`: caps pixel ratio on high-DPI screens
- `shadowMap`: `true` for soft shadows, or an options object
- `outputColorSpace`: defaults to `THREE.SRGBColorSpace`

## Lighting Helpers

Recommended beginner setup:

1. `addEnvironmentLighting(ctx)` for soft ambient fill
2. `addDirectionalShadowLight(ctx)` for shape and shadows

Example:

```ts
import {
  addDirectionalShadowLight,
  addEnvironmentLighting,
  createRenderer,
} from '@arcane-engine/renderer';

const ctx = createRenderer({ shadowMap: true });

addEnvironmentLighting(ctx, {
  ambientIntensity: 0.3,
  hemisphereIntensity: 1.1,
});

addDirectionalShadowLight(ctx, {
  position: { x: 8, y: 12, z: 10 },
});
```

## Notes

- this package does not load textures or models
- use [`@arcane-engine/assets`](../assets/README.md) for imported assets
- `renderSystem(ctx)` should run after systems that change position or rotation
