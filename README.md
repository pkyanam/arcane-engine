# Arcane Engine

Arcane Engine is a small framework for making 3D browser games with TypeScript and Three.js.

It gives you the boring setup work so you can get to the fun part faster:

- an ECS core for game logic
- renderer helpers for putting things on screen
- input helpers for keyboard, mouse, and FPS look
- optional packages for textures, models, animation, physics, gameplay helpers, and multiplayer relay
- a CLI that scaffolds a new project for you

The goal is simple: make it dead simple to start and grow a browser game without inventing a game framework from scratch first.

## ELI5

Arcane Engine uses ECS.

| Word | Plain meaning |
| --- | --- |
| Entity | A thing in the game. It is just a number. |
| Component | A plain object with facts about that thing. |
| System | A function that updates matching things every frame. |
| Scene | One screen or game state, like `title` or `gameplay`. |

Tiny mental model:

- the player is an entity
- `Position` is a component
- movement is a system
- the title screen is a scene

## Start Here

Run the example app:

```sh
pnpm install
pnpm --filter hello-cube dev
```

Then open the Vite URL in your browser.

Use the title screen like this:

- `Enter`: start the beginner-friendly walkthrough scene
- `P`: open the physics playground
- `F`: open the FPS scene
- `M`: open the multiplayer scene

If you want to build your own game instead, scaffold one:

```sh
npx @arcane-engine/create-arcane my-game
```

If you want textures, models, and preload flow on day one:

```sh
npx @arcane-engine/create-arcane my-game --template asset-ready
```

## Pick Your Path

Use one of these three starting points:

- `templates/starter`: the smallest possible Arcane Engine app
- `templates/asset-ready`: the same app shape, but already wired for textures, models, animations, and scene preload
- `examples/hello-cube`: the bigger teaching example with gameplay, physics, FPS, multiplayer, touch controls, and copyable helpers

Rule of thumb:

- want to learn ECS basics: start with `starter`
- want to ship a pretty 3D scene quickly: start with `asset-ready`
- want FPS or multiplayer patterns: copy from `hello-cube`

## Smallest Example

This is the basic shape of an Arcane Engine system:

```ts
import { defineComponent, getComponent, query } from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';

const Position = defineComponent('Position', () => ({ x: 0, y: 0, z: 0 }));
const Velocity = defineComponent('Velocity', () => ({ x: 0, y: 0, z: 0 }));

export const movementSystem: SystemFn = (world: World, dt: number): void => {
  for (const entity of query(world, [Position, Velocity])) {
    const position = getComponent(world, entity, Position)!;
    const velocity = getComponent(world, entity, Velocity)!;

    position.x += velocity.x * dt;
    position.y += velocity.y * dt;
    position.z += velocity.z * dt;
  }
};
```

Important rules:

- components are plain objects
- systems are pure `(world, dt)` functions
- `dt` is always in seconds

## Repo Map

```text
arcane-engine/
|- packages/
|  |- core/            # ECS world, entities, components, systems, scenes, loop
|  |- renderer/        # Three.js setup, render system, mesh helpers
|  |- assets/          # textures, models, animation, preload, disposal
|  |- input/           # keyboard, mouse, camera, FPS look
|  |- physics/         # Rapier integration
|  |- gameplay/        # health, damage, game state, interaction helpers
|  |- server/          # tiny WebSocket relay for multiplayer demos
|  `- create-arcane/   # project scaffolder
|- templates/
|  |- starter/
|  `- asset-ready/
|- examples/
|  `- hello-cube/
|- docs/
|- PRDs/               # historical planning docs
|- README.md
|- CONTRIBUTING.md
|- AGENTS.md
`- package.json
```

## Packages

| Package | What it does |
| --- | --- |
| [`@arcane-engine/core`](./packages/core/README.md) | ECS primitives, query engine, game loop, scene manager |
| [`@arcane-engine/renderer`](./packages/renderer/README.md) | Three.js setup, transform components, `spawnMesh`, `renderSystem` |
| [`@arcane-engine/assets`](./packages/assets/README.md) | textures, glTF/GLB loading, repeated model spawning, animation playback, scene preload |
| [`@arcane-engine/input`](./packages/input/README.md) | shared input state, movement, follow camera, FPS look |
| [`@arcane-engine/physics`](./packages/physics/README.md) | Rapier world, rigid bodies, colliders, raycast, character controller |
| [`@arcane-engine/gameplay`](./packages/gameplay/README.md) | health, damage, game state, spawn points, and standard interaction flow |
| [`@arcane-engine/server`](./packages/server/README.md) | tiny Node relay for multiplayer browser demos |
| [`@arcane-engine/create-arcane`](./packages/create-arcane/README.md) | CLI for scaffolding a new game |

## What `hello-cube` Covers

[`examples/hello-cube`](./examples/hello-cube/README.md) is the best place to see the whole engine working together.

It shows:

- scene switching
- renderer setup and lighting
- texture and model loading
- imported model animation
- optional scene preload before sync `setup(world)`
- physics-backed rooms
- first-person movement and pointer lock
- a small multiplayer relay flow
- touch controls for phones and tablets

It also contains the main copy-from-here FPS helpers:

- `examples/hello-cube/src/fpsSceneRuntime.ts`
- `examples/hello-cube/src/fpsPlayerSetup.ts`

## Multiplayer Quick Start

The browser app and the relay are separate.

Run the relay in one terminal:

```sh
pnpm --filter @arcane-engine/server build
pnpm --filter @arcane-engine/server start
```

Run the example in another:

```sh
pnpm --filter hello-cube dev
```

Open two browser tabs and press `M` in both.

If you deploy the client separately, set `VITE_WS_URL` so the browser knows where your relay lives.

## Development

From the repo root:

```sh
pnpm test
pnpm typecheck
pnpm build
```

Project rules:

- TypeScript strict mode everywhere
- components are plain objects, not classes
- systems stay small and predictable
- package docs should match the real exports
- examples should teach patterns without hiding how they work

## More Docs

- [`CONTRIBUTING.md`](./CONTRIBUTING.md): contribution and repo workflow notes
- [`AGENTS.md`](./AGENTS.md): source-of-truth guidance for AI coding agents
- [`CLAUDE.md`](./CLAUDE.md): same repo guidance for Claude Code
- [`docs/AGENT_WORKFLOW.md`](./docs/AGENT_WORKFLOW.md): task splitting and package-boundary guidance
- [`docs/STAGE_TEMPLATE.md`](./docs/STAGE_TEMPLATE.md): reusable task brief template
- [`templates/starter/README.md`](./templates/starter/README.md): minimal starter walkthrough
- [`templates/asset-ready/README.md`](./templates/asset-ready/README.md): asset-focused starter walkthrough
