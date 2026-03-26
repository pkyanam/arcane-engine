# Arcane Engine

Arcane Engine is a small framework for making 3D browser games.

If that sentence sounds complicated, here is the simple version:

- You make "things" in your game, like a player, a cube, or an enemy.
- You give those things simple pieces of data, like position, health, or input.
- You write small rules that update them every frame.
- Arcane Engine gives you the structure for that, without making you build everything from scratch.

Think of it like this:

- Three.js draws the 3D world.
- Arcane Engine organizes the game logic.
- `create-arcane` gives you a starter project so you can begin quickly.

It is inspired by the feeling of Next.js:

- clear folders
- sensible defaults
- fast setup
- easy for humans and AI agents to understand

## Status

Arcane Engine is currently at **Stage 7** of the MVP plan:

- ECS core is done
- renderer is done
- input system is done
- scene system is done
- CLI scaffolder is done
- hello-cube demo and onboarding docs are done
- optional physics package is done (Rapier)

## Physics

An optional `@arcane-engine/physics` package is available for games that need real physics.

It is powered by [Rapier](https://rapier.rs/) and supports:

- fixed bodies (walls, floors, platforms)
- dynamic bodies (objects that fall and collide)
- box colliders with configurable restitution and friction
- automatic gravity simulation
- automatic transform sync back into ECS `Position` and `Rotation`

Physics is entirely optional.  Games that do not use it do not pay any cost for it.

See [`packages/physics/README.md`](packages/physics/README.md) for the full API and a quick-start example.

The `hello-cube` demo includes a physics scene — press **P** from the title screen to see cubes fall under gravity and collide with a ground plane.

## Why This Exists

Making a browser game usually means wiring together a lot of pieces by hand:

- a renderer
- a game loop
- input handling
- scene switching
- project structure

Arcane Engine tries to make the first version of a game feel much simpler.

Instead of asking:

"Which engine pieces do I glue together first?"

it tries to let you ask:

"What do I want my game to do?"

## ELI5: How It Works

Arcane Engine uses an ECS pattern.

If you have never seen ECS before, here is the kid-version explanation:

- **Entity**: a thing in the game
  - player
  - cube
  - camera target
- **Component**: a fact about that thing
  - where it is
  - how fast it moves
  - whether the player controls it
- **System**: a rule that updates things
  - move the player
  - spin a cube
  - render the scene
- **Scene**: a game screen
  - title screen
  - gameplay
  - pause menu

So instead of one giant class doing everything, you build a game out of small, simple parts.

## What Is In This Repo

```text
arcane-engine/
|- packages/
|  |- core/            # ECS, world, queries, systems, game loop, scenes
|  |- renderer/        # Three.js bridge and render components
|  |- input/           # keyboard/mouse input and movement helpers
|  `- create-arcane/   # starter project scaffolder
|- templates/
|  `- starter/         # default generated project
|- examples/
|  `- hello-cube/      # working demo project
|- README.md
|- CONTRIBUTING.md
|- AGENTS.md
`- CLAUDE.md
```

## Quick Start

From the repo root:

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

To run the demo:

```sh
pnpm --filter hello-cube dev
```

Then open the local URL Vite prints in the terminal.

Demo controls:

- Press `Enter` on the title screen to start
- Move with `W`, `A`, `S`, `D` or arrow keys
- Press `Escape` to go back to the title screen

## Create A New Game

Published usage:

```sh
npx @arcane-engine/create-arcane my-game
```

That will:

- create a new project folder
- copy the starter template
- replace the placeholder project name
- install dependencies
- start the dev server in interactive terminals

Useful flags:

```sh
create-arcane my-game --no-install
create-arcane my-game --no-start
```

If you are working inside this monorepo and want to test the local CLI:

```sh
node packages/create-arcane/bin/create-arcane.js my-game --no-install --no-start
```

## Folder Conventions

Arcane Engine is intentionally opinionated about where things go.

- `game.config.ts`
  - project-level settings like the first scene and renderer options
- `scenes/<name>.ts`
  - one file per scene
  - exports `setup(world)` and optional `teardown(world)`
- `components/<name>.ts`
  - one component definition per file
- `systems/<name>.ts`
  - one system per file
- `src/runtime/*`
  - small runtime helpers used by the starter and example projects

The goal is that you can look at the file tree and understand the shape of the game quickly.

## Add An Entity

An entity is just a number. You usually do not care about the number itself. You care about the data attached to it.

First define a component:

```ts
import { defineComponent } from '@arcane-engine/core';

export const Health = defineComponent('Health', () => ({
  hp: 100,
  max: 100,
}));
```

Then create an entity in a scene:

```ts
import { addComponent, createEntity } from '@arcane-engine/core';
import { Position } from '@arcane-engine/renderer';
import type { World } from '@arcane-engine/core';
import { Health } from '../components/health.js';

export function setup(world: World): void {
  const enemy = createEntity(world);
  addComponent(world, enemy, Position, { x: 4, y: 0.5, z: -6 });
  addComponent(world, enemy, Health, { hp: 150 });
}
```

If you want that entity to show up visually, use `spawnMesh(...)` from `@arcane-engine/renderer`.

## Add A System

A system is a small function that runs every frame.

Example:

```ts
import { getComponent, query } from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';
import { Position } from '@arcane-engine/renderer';
import { Velocity } from '../components/velocity.js';

const bounceSystem: SystemFn = (world: World, dt: number): void => {
  for (const entity of query(world, [Position, Velocity])) {
    const position = getComponent(world, entity, Position)!;
    const velocity = getComponent(world, entity, Velocity)!;
    position.y += velocity.y * dt;
  }
};

export default bounceSystem;
```

Register it in a scene:

```ts
import { registerSystem } from '@arcane-engine/core';
import bounceSystem from '../systems/bounceSystem.js';

registerSystem(world, bounceSystem);
```

## Add A Scene

Scenes are just files.

```ts
import type { World } from '@arcane-engine/core';

export function setup(world: World): void {
  // create entities
  // register systems
  // add any scene-specific DOM
}

export function teardown(_world: World): void {
  // remove scene-specific DOM or renderer objects
}
```

To make it the first scene:

```ts
const gameConfig = {
  initialScene: 'shop',
};
```

## Packages

- `@arcane-engine/core`
  - ECS primitives, queries, systems, game loop, and scenes
- `@arcane-engine/renderer`
  - renderer setup, render components, `spawnMesh`, and `renderSystem`
- `@arcane-engine/input`
  - input state, movement system, and camera follow system
- `@arcane-engine/create-arcane`
  - starter project scaffolding

Public APIs are documented with JSDoc in `packages/*/src`.

## What The Demo Proves

The hello-cube demo is meant to show the framework in the simplest useful way:

- title scene
- gameplay scene
- scene switching
- player movement
- floating cubes
- ground plane
- basic lighting

It is not trying to be a full game. It is trying to be a clear example.

## Development

Main verification commands:

```sh
pnpm test
pnpm typecheck
pnpm build
```

Project rules:

- TypeScript strict mode everywhere
- components are plain objects, not classes
- systems are pure functions
- every public function should have Vitest coverage
- avoid feature creep

## Build In Public

This repository is being built in public.

That means the code should be:

- easy to read
- easy to explain
- easy to scaffold
- easy for contributors and AI agents to extend

If something feels clever but confusing, it is probably the wrong tradeoff for this project.

## More Docs

- [CONTRIBUTING.md](./CONTRIBUTING.md) for contributor workflow and repo rules
- [AGENTS.md](./AGENTS.md) for Codex and other coding agents
- [CLAUDE.md](./CLAUDE.md) for Claude Code-specific repo context
