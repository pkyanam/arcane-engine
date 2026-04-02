# @arcane-engine/core

The heart of Arcane Engine.

This package gives you the ECS pieces:

- worlds
- entities
- components
- queries
- systems
- game loop
- scene manager

It has no opinions about rendering, physics, or input. It is just the game-logic backbone.

## Install

```sh
pnpm add @arcane-engine/core
```

## Mental Model

- entity = a number
- component = a plain object
- system = a function that updates matching entities
- world = the container that holds everything

## Quick Start

```ts
import {
  addComponent,
  createEntity,
  createWorld,
  defineComponent,
  getComponent,
  query,
  registerSystem,
  runSystems,
} from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';

const Position = defineComponent('Position', () => ({ x: 0, y: 0, z: 0 }));
const Velocity = defineComponent('Velocity', () => ({ x: 0, y: 0, z: 0 }));

const movementSystem: SystemFn = (world: World, dt: number): void => {
  for (const entity of query(world, [Position, Velocity])) {
    const position = getComponent(world, entity, Position)!;
    const velocity = getComponent(world, entity, Velocity)!;

    position.x += velocity.x * dt;
    position.y += velocity.y * dt;
    position.z += velocity.z * dt;
  }
};

const world = createWorld();
const player = createEntity(world);

addComponent(world, player, Position, { x: 0, y: 0, z: 0 });
addComponent(world, player, Velocity, { x: 2, y: 0, z: 0 });

registerSystem(world, movementSystem);
runSystems(world, 1 / 60);
```

## What It Exports

- `defineComponent(name, defaultFn)`
- `createWorld()`
- `resetWorld(world)`
- `createEntity(world)`
- `destroyEntity(world, entity)`
- `addComponent(world, entity, component, data?)`
- `removeComponent(world, entity, component)`
- `getComponent(world, entity, component)`
- `hasComponent(world, entity, component)`
- `query(world, [Component, ...])`
- `registerSystem(world, system)`
- `unregisterSystem(world, system)`
- `runSystems(world, dt)`
- `createGameLoop(options)`
- `createSceneManager(world, scenes)`

## Scenes

Scenes are plain objects:

```ts
import type { Scene } from '@arcane-engine/core';

const scenes: Record<string, Scene> = {
  title: {
    setup(world) {
      // add entities and systems
    },
    teardown(world) {
      // clean up scene-owned DOM or objects
    },
  },
};
```

`createSceneManager(world, scenes)` will:

- run the old scene's `teardown(world)` if it exists
- reset the ECS world
- run the next scene's `setup(world)`

## Important Rules

- components are plain objects, not classes
- systems must use `(world, dt)`
- `dt` is always in seconds
- entities are just numbers
