# @arcane-engine/physics

Optional physics package for Arcane Engine, powered by [Rapier](https://rapier.rs/).

Adds fixed and dynamic rigid bodies with box colliders.  Physics transforms sync automatically into the existing `Position` and `Rotation` components, so the renderer picks them up with no extra wiring.

## Install

```sh
pnpm add @arcane-engine/physics @arcane-engine/core @arcane-engine/renderer
```

## Quick start

```ts
import { initPhysics, createPhysicsContext, physicsSystem, RigidBody, BoxCollider } from '@arcane-engine/physics';
import { addComponent, createEntity, registerSystem } from '@arcane-engine/core';
import { Position, Rotation } from '@arcane-engine/renderer';

// 1. Initialize the Rapier WASM module once at app startup.
await initPhysics();

// 2. Create a physics world and wire it into the ECS.
const physCtx = createPhysicsContext();
registerSystem(world, physicsSystem(physCtx));

// 3. Spawn a fixed ground plane.
const ground = createEntity(world);
addComponent(world, ground, Position, { x: 0, y: 0, z: 0 });
addComponent(world, ground, Rotation);
addComponent(world, ground, RigidBody, { type: 'fixed' });
addComponent(world, ground, BoxCollider, { hx: 10, hy: 0.5, hz: 10 });

// 4. Spawn a dynamic cube that falls under gravity.
const cube = createEntity(world);
addComponent(world, cube, Position, { x: 0, y: 5, z: 0 });
addComponent(world, cube, Rotation);
addComponent(world, cube, RigidBody, { type: 'dynamic' });
addComponent(world, cube, BoxCollider, { hx: 0.5, hy: 0.5, hz: 0.5, restitution: 0.3 });
```

## API

### `initPhysics(): Promise<void>`

Initializes the Rapier WASM binary.  Call and await this once before using any other physics APIs.  Subsequent calls are no-ops.

### `createPhysicsContext(options?): PhysicsContext`

Creates a new Rapier physics world.  Requires `initPhysics()` to have completed.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `gravity` | `{ x?, y?, z? }` | `{ x: 0, y: -9.81, z: 0 }` | World gravity in m/s² |

### `physicsSystem(ctx): SystemFn`

System factory.  Returns a system that:
1. Creates Rapier bodies for entities with `RigidBody` + `BoxCollider` (lazy, on first tick).
2. Steps the simulation.
3. Syncs dynamic body transforms back into ECS `Position` and `Rotation`.

### Components

#### `RigidBody`

```ts
{ type: 'fixed' | 'dynamic' }
```

#### `BoxCollider`

```ts
{
  hx: number;       // half-width  (x axis)
  hy: number;       // half-height (y axis)
  hz: number;       // half-depth  (z axis)
  restitution?: number;  // bounciness 0–1
  friction?: number;     // surface friction 0–1
}
```

Note: half-extents follow Rapier's convention.  A 1 m × 1 m × 1 m cube uses `hx = hy = hz = 0.5`.

#### `RapierBodyRef` _(internal)_

Written by `physicsSystem` to track the Rapier body handle.  Do not add or modify this component directly.

## Notes

- `@arcane-engine/core` and `@arcane-engine/renderer` remain physics-agnostic.
- Each physics scene should create its own `PhysicsContext`; do not share contexts across scenes.
- The system uses Rapier's default fixed timestep (1/60 s).
