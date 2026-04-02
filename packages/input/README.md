# @arcane-engine/input

Input helpers for Arcane Engine.

This package turns browser events into ECS data and gives you common movement and camera systems.

It covers:

- keyboard input
- mouse input
- shared `InputState`
- simple movement
- follow camera
- FPS camera look
- pointer lock

## Install

```sh
pnpm add @arcane-engine/input @arcane-engine/core @arcane-engine/renderer
```

## Main Idea

`createInputManager(world, canvas?)` creates one ECS entity that stores input state.

Then your systems read that data from ECS like any other component.

That means your gameplay systems do not have to talk to the DOM directly.

## What It Exports

- `createInputManager(world, canvas?)`
- `movementSystem(speed?)`
- `cameraFollowSystem(ctx, options?)`
- `fpsCameraSystem(ctx, options?)`
- `fpsMovementSystem(speed?)`
- `InputState`
- `Controllable`
- `FPSCamera`

## Simple Movement Example

```ts
import { addComponent, createEntity, registerSystem } from '@arcane-engine/core';
import {
  cameraFollowSystem,
  Controllable,
  createInputManager,
  movementSystem,
} from '@arcane-engine/input';
import { Position } from '@arcane-engine/renderer';

createInputManager(world);

const player = createEntity(world);
addComponent(world, player, Position, { x: 0, y: 0, z: 0 });
addComponent(world, player, Controllable);

registerSystem(world, movementSystem(5));
registerSystem(world, cameraFollowSystem(ctx, { radius: 8 }));
```

## FPS Example

Pass the canvas when you want pointer lock:

```ts
import { addComponent, createEntity, registerSystem } from '@arcane-engine/core';
import {
  Controllable,
  createInputManager,
  FPSCamera,
  fpsCameraSystem,
  fpsMovementSystem,
} from '@arcane-engine/input';
import { Position } from '@arcane-engine/renderer';

createInputManager(world, ctx.renderer.domElement);

const player = createEntity(world);
addComponent(world, player, Position, { x: 0, y: 1.5, z: 0 });
addComponent(world, player, Controllable);
addComponent(world, player, FPSCamera, {
  yaw: 0,
  pitch: 0,
  height: 1.6,
});

registerSystem(world, fpsMovementSystem(6));
registerSystem(world, fpsCameraSystem(ctx));
```

Click the canvas to enter pointer lock. Press `Escape` to leave it.

## Notes

- `movementSystem()` moves on world axes
- `fpsMovementSystem()` moves relative to camera yaw
- `fpsCameraSystem()` consumes `mouse.dx` and `mouse.dy`
- when using physics, your movement stack may come from `@arcane-engine/physics` instead of `fpsMovementSystem()`
