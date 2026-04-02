# @arcane-engine/physics

Optional physics for Arcane Engine, powered by [Rapier](https://rapier.rs/).

Use this package when you want:

- gravity
- solid floors and walls
- rigid bodies
- box colliders
- trigger volumes
- raycast checks
- FPS-style character movement

## Install

```sh
pnpm add @arcane-engine/physics @arcane-engine/core @arcane-engine/input @arcane-engine/renderer
```

## Quick Start

```ts
import { addComponent, createEntity, registerSystem } from '@arcane-engine/core';
import { Position, Rotation } from '@arcane-engine/renderer';
import {
  BoxCollider,
  createPhysicsContext,
  initPhysics,
  physicsSystem,
  RigidBody,
} from '@arcane-engine/physics';

await initPhysics();

const physics = createPhysicsContext();
registerSystem(world, physicsSystem(physics));

const ground = createEntity(world);
addComponent(world, ground, Position, { x: 0, y: 0, z: 0 });
addComponent(world, ground, Rotation);
addComponent(world, ground, RigidBody, { type: 'fixed' });
addComponent(world, ground, BoxCollider, { hx: 10, hy: 0.5, hz: 10 });

const cube = createEntity(world);
addComponent(world, cube, Position, { x: 0, y: 5, z: 0 });
addComponent(world, cube, Rotation);
addComponent(world, cube, RigidBody, { type: 'dynamic' });
addComponent(world, cube, BoxCollider, { hx: 0.5, hy: 0.5, hz: 0.5 });
```

## What It Exports

- `initPhysics()`
- `createPhysicsContext(options?)`
- `physicsSystem(ctx)`
- `characterControllerSystem(ctx)`
- `raycast(ctx, origin, direction, maxDistance)`
- `triggerVolumeSystem(ctx)`
- `spawnTriggerVolume(world, physicsCtx, options)`
- `isInsideTrigger(world, triggerEntity, testEntity)`
- `getEntitiesInTrigger(world, triggerEntity)`
- `getEntityByColliderHandle(ctx, colliderHandle)`
- `RigidBody`
- `BoxCollider`
- `RapierBodyRef`
- `RapierColliderRef`
- `CharacterController`
- `TriggerVolume`

## Rigid Body Types

`RigidBody` looks like this:

```ts
{ type: 'fixed' | 'dynamic' | 'kinematic' }
```

- `fixed`: walls, floors, level geometry
- `dynamic`: objects Rapier simulates
- `kinematic`: objects your code moves directly

## FPS Stack

For a physics-backed FPS player, the common order is:

1. `physicsSystem(physicsCtx)`
2. `characterControllerSystem(physicsCtx)`
3. `fpsCameraSystem(rendererCtx)`
4. `renderSystem(rendererCtx)`

`characterControllerSystem()` is for kinematic player bodies with:

- `RigidBody` set to `{ type: 'kinematic' }`
- `BoxCollider`
- `Position`
- `FPSCamera`
- `CharacterController`

## Raycast

Use `raycast()` for hitscan or interaction checks:

```ts
const hit = raycast(
  physics,
  { x: 0, y: 2, z: 0 },
  { x: 0, y: 0, z: -1 },
  100,
);
```

It returns the first hit or `null`.

If you want the ECS entity behind a hit collider handle, call
`getEntityByColliderHandle(physics, hit.colliderHandle)`.

## Trigger Volumes

Use `TriggerVolume` with `triggerVolumeSystem()` for proximity checks like
pickups, doors, objectives, or damage zones:

```ts
import { registerSystem } from '@arcane-engine/core';
import {
  createPhysicsContext,
  initPhysics,
  physicsSystem,
  spawnTriggerVolume,
  triggerVolumeSystem,
} from '@arcane-engine/physics';

await initPhysics();

const physics = createPhysicsContext();
registerSystem(world, physicsSystem(physics));
registerSystem(world, triggerVolumeSystem(physics));

const trigger = spawnTriggerVolume(world, physics, {
  position: { x: 0, y: 1, z: 0 },
  shape: 'box',
  halfExtents: { x: 2, y: 1, z: 2 },
});
```

Read `TriggerVolume.entities`, `entered`, and `exited` inside your own gameplay
systems. The physics package updates those sets each tick.

## Notes

- call `await initPhysics()` once before creating a physics context
- create a fresh `PhysicsContext` per scene
- dynamic bodies sync back into ECS `Position` and `Rotation`
- `@arcane-engine/core` and `@arcane-engine/renderer` stay physics-agnostic
