# Arcane Engine — Claude Code Instructions

This file gives Claude Code the practical repo context for Arcane Engine.

## What This Repo Is

Arcane Engine is a lightweight 3D browser game framework.

Simple version:

- Three.js draws things
- Arcane Engine organizes game logic with ECS
- the repo includes templates and examples so you can learn by editing real files

Use this mental model:

- entity = a thing
- component = plain data about that thing
- system = a function that updates matching things
- scene = one screen or game state

## Source Of Truth

Use this priority order:

1. source code
2. tests
3. current docs

Treat `PRDs/` as historical reference only.

## Read First

1. `README.md`
2. `CONTRIBUTING.md`
3. the README for the package, template, or example you are changing
4. the matching source and tests

Useful entry points:

- `packages/core/src/index.ts`
- `packages/renderer/src/index.ts`
- `packages/assets/src/index.ts`
- `packages/input/src/index.ts`
- `packages/physics/src/index.ts`
- `packages/server/src/server.ts`
- `examples/hello-cube/README.md`

## Repo Shape

```text
packages/core          ECS primitives
packages/renderer      Three.js bridge
packages/assets        asset loading and animation helpers
packages/input         browser input and camera helpers
packages/physics       Rapier integration
packages/server        tiny WebSocket relay
packages/create-arcane project scaffolder
templates/starter      minimal generated app
templates/asset-ready  generated app with asset loading
examples/hello-cube    larger teaching example
docs/                  workflow docs
PRDs/                  historical planning docs
```

## Core Rules

- TypeScript strict mode everywhere
- components are plain objects created with `defineComponent()`
- systems are pure `(world, dt)` functions
- `dt` is always in seconds
- `Entity` is just a number

## Package Boundaries

| Package | Owns |
| --- | --- |
| `@arcane-engine/core` | ECS world, queries, systems, scene manager, loop |
| `@arcane-engine/renderer` | renderer setup, transform components, render helpers |
| `@arcane-engine/assets` | textures, models, animation, preload, disposal |
| `@arcane-engine/input` | input state, movement, camera helpers |
| `@arcane-engine/physics` | Rapier world, colliders, character controller |
| `@arcane-engine/server` | relay only, no game simulation |
| `@arcane-engine/create-arcane` | scaffolding |

Keep demo-specific logic in `examples/hello-cube` unless more than one shipped path clearly needs the same helper.

## Runtime Conventions

- `scenes/<name>.ts` exports `setup(world)` and optional `teardown(world)`
- the runtime may also support optional `preload(context?)`
- keep `setup(world)` synchronous even when using preload

## Docs Style

Optimize for a beginner reader:

- simple language
- define terms once
- explain why the code exists
- keep examples concrete

If code or docs are clever but harder to understand, simplify them.

## Verification

Typical checks:

```sh
pnpm test
pnpm typecheck
pnpm build
```

## Scope Defaults

Do not add these unless asked:

- audio
- plugin ecosystems
- production-grade multiplayer backends
- hidden asset pipelines
- WebGPU
