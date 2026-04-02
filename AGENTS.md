# Arcane Engine — Agent Instructions

This file gives coding agents the short, practical version of how this repo works.

Read this before making changes.

## What Arcane Engine Is

Arcane Engine is a lightweight browser game framework built around ECS.

In plain language:

- Three.js draws the world
- Arcane Engine organizes game logic
- the repo gives you patterns and starter structure so you do not have to invent everything first

Use this mental model:

- entity = a thing in the game
- component = plain data on that thing
- system = a rule that runs every frame
- scene = one game screen

## Source Of Truth

Trust these in this order:

1. code in `packages/`, `templates/`, and `examples/`
2. tests
3. current docs

Treat `PRDs/` as historical background, not as the current product spec.

## Read First

Start here when you need repo context:

1. `README.md`
2. `CONTRIBUTING.md`
3. the README for the package or example you are touching
4. the actual source and tests in that area

Helpful entry points:

- `packages/core/src/index.ts`
- `packages/renderer/src/index.ts`
- `packages/assets/src/index.ts`
- `packages/input/src/index.ts`
- `packages/physics/src/index.ts`
- `packages/gameplay/src/index.ts`
- `packages/server/src/server.ts`
- `examples/hello-cube/README.md`

## Monorepo Map

```text
packages/core         ECS world, entities, components, queries, systems, loop, scenes
packages/renderer     Three.js setup, transform components, render helpers
packages/assets       textures, models, animation, preload, disposal
packages/input        input state, movement, camera follow, FPS look
packages/physics      Rapier integration
packages/gameplay     gameplay primitives like health, damage, state, interaction
packages/server       tiny WebSocket relay
packages/create-arcane project scaffolder
templates/starter     smallest generated app
templates/asset-ready generated app with asset loading
examples/hello-cube   full teaching example
docs/                 workflow notes and reusable task template
PRDs/                 historical planning docs
```

## Current Shipped Surface

The engine you are editing already includes:

- ECS world and scene management in `@arcane-engine/core`
- Three.js renderer setup and lighting helpers in `@arcane-engine/renderer`
- texture loading, glTF/GLB loading, animation playback, and scene preload helpers in `@arcane-engine/assets`
- keyboard, mouse, follow camera, FPS look, and pointer lock in `@arcane-engine/input`
- Rapier rigid bodies, colliders, raycast, and character controller in `@arcane-engine/physics`
- gameplay primitives like health, damage, game state, spawn points, and interaction in `@arcane-engine/gameplay`
- a tiny Node relay in `@arcane-engine/server`
- scaffold templates through `@arcane-engine/create-arcane`
- a larger copy-from-here example in `examples/hello-cube`

## Package Responsibilities

| Package | Owns |
| --- | --- |
| `@arcane-engine/core` | ECS primitives and lifecycle |
| `@arcane-engine/renderer` | Three.js bridge and render-time components |
| `@arcane-engine/assets` | imported assets and cache lifecycle |
| `@arcane-engine/input` | browser input and input-driven systems |
| `@arcane-engine/physics` | Rapier world integration |
| `@arcane-engine/gameplay` | gameplay primitives and reusable interaction flow |
| `@arcane-engine/server` | WebSocket relay only |
| `@arcane-engine/create-arcane` | scaffolding |

Do not move example-only code into a package unless at least two shipped paths clearly need it.

## Core Rules

Non-negotiables:

1. TypeScript strict mode everywhere
2. components are plain objects created with `defineComponent()`
3. systems are pure `(world: World, dt: number) => void` functions
4. `dt` is always in seconds
5. `Entity` is just a number

Naming:

| Thing | Convention | Example |
| --- | --- | --- |
| Component constants | PascalCase | `Position` |
| System functions | camelCase | `renderSystem` |
| Source files | camelCase | `sceneRegistry.ts` |
| Test files | `<name>.test.ts` | `sceneRegistry.test.ts` |

## File Conventions

- `scenes/<name>.ts`: exports `setup(world)` and optional `teardown(world)`
- `components/<name>.ts`: exports one component
- `systems/<name>.ts`: exports one system
- `game.config.ts`: top-level app config
- `src/runtime/*`: runtime helpers used by templates and examples

## Scenes And Preload

Core scenes are synchronous:

- `setup(world)`
- optional `teardown(world)`

The templates and example runtime add one small optional seam:

- `preload(context?)`

Use that when a scene needs to finish async asset loading before `setup(world)` runs.

Keep the contract simple:

- `preload()` may be async
- `setup(world)` stays sync

## Example-Local Vs Package-Level

Keep logic example-local when:

- it only serves `hello-cube`
- the naming is still highly demo-specific
- moving it into a package would hide how the example works

Promote logic into a package when:

- multiple shipped apps need it
- the API is stable enough to document simply
- package tests are clearer than example-only tests

Important example-local helpers today:

- `examples/hello-cube/src/fpsSceneRuntime.ts`
- `examples/hello-cube/src/fpsPlayerSetup.ts`

## Docs Style

Assume the reader may be new to game engines.

When writing docs or comments:

- prefer simple words over jargon
- define ECS terms the first time you use them
- explain what the code is doing, not just what the API is called
- optimize for one-pass understanding

If a sentence is technically right but harder to understand, rewrite it.

## Testing And Verification

When you change public behavior:

- update tests in the touched package or example
- keep docs aligned with the real exports
- run the narrowest useful checks first, then broader repo checks when needed

Common commands:

```sh
pnpm test
pnpm typecheck
pnpm build
```

## Scope Defaults

Do not build these unless the task explicitly asks for them:

- audio systems
- a visual editor
- a general plugin ecosystem
- production-grade game servers
- a hidden asset pipeline
- WebGPU renderer work

Favor the smallest clear solution over “framework expansion.”
