# Arcane Engine — Agent Instructions

This file gives OpenAI Codex and other coding agents shared context about the
Arcane Engine repo. Read it before making changes.

---

## Project Overview

Arcane Engine is a lightweight browser game framework.

In plain language:

- Three.js draws the 3D world
- Arcane Engine organizes the game logic
- the repo gives you a starter structure so you do not have to invent one each time

It uses an Entity Component System (ECS) plus file-based conventions.

Simple mental model:

- entity = a thing in the game
- component = data about that thing
- system = a rule that updates things
- scene = one game screen

**Current stage:** Stage 6 complete (Hello Cube Demo + Documentation).

**What comes next:** public repo cleanup, optional performance validation, and choosing the first post-MVP milestone. There is no formal Stage 7 in the PRD yet.

---

## Monorepo Structure

```text
arcane-engine/
|- packages/
|  |- core/           # ECS, game loop, world, scenes         - Stages 1 and 4 complete
|  |- renderer/       # Three.js wrapper                      - Stage 2 complete
|  |- input/          # Keyboard/mouse ECS bridge             - Stage 3 complete
|  `- create-arcane/  # npx CLI scaffolder                    - Stage 5 complete
|- templates/
|  `- starter/        # Default generated project
|- examples/
|  `- hello-cube/     # Polished Stage 6 demo
|- README.md
|- CONTRIBUTING.md
|- CLAUDE.md
|- AGENTS.md
`- package.json
```

**Package manager:** pnpm workspaces  
**Build tool:** Vite  
**Test framework:** Vitest  
**Language:** TypeScript with `strict: true`

---

## Package Responsibilities

| Package | Responsibility |
|---------|----------------|
| `@arcane-engine/core` | ECS primitives, queries, system registration, game loop, scene lifecycle |
| `@arcane-engine/renderer` | Three.js scene/camera/renderer setup and mesh rendering helpers |
| `@arcane-engine/input` | DOM input bridge plus movement and camera-follow systems |
| `@arcane-engine/create-arcane` | CLI that scaffolds starter projects |

---

## Core ECS API

Import from `@arcane-engine/core`.

```ts
import {
  createWorld,
  createEntity,
  destroyEntity,
  addComponent,
  removeComponent,
  getComponent,
  hasComponent,
  defineComponent,
  query,
  registerSystem,
  runSystems,
} from '@arcane-engine/core';
```

### Components

Always use plain objects, never classes.

```ts
const Position = defineComponent('Position', () => ({ x: 0, y: 0, z: 0 }));
const Velocity = defineComponent('Velocity', () => ({ vx: 0, vy: 0, vz: 0 }));
```

### Systems

Systems must be pure functions:

```ts
function movementSystem(world: World, dt: number): void {
  for (const entity of query(world, [Position, Velocity])) {
    const position = getComponent(world, entity, Position)!;
    const velocity = getComponent(world, entity, Velocity)!;
    position.x += velocity.vx * dt;
  }
}
```

`dt` is always measured in seconds.

---

## Renderer API

Import from `@arcane-engine/renderer`.

```ts
import {
  createRenderer,
  renderSystem,
  spawnMesh,
  Position,
  Rotation,
  Scale,
  MeshRef,
  Spin,
} from '@arcane-engine/renderer';
import type { RendererContext } from '@arcane-engine/renderer';
```

Systems that need the renderer should use a factory:

```ts
export const mySystem = (ctx: RendererContext): SystemFn => (world, dt) => {
  // ...
};
```

---

## Input API

Import from `@arcane-engine/input`.

```ts
import {
  createInputManager,
  movementSystem,
  cameraFollowSystem,
  InputState,
  Controllable,
} from '@arcane-engine/input';
import type { CameraFollowOptions, InputManagerHandle } from '@arcane-engine/input';
```

`createInputManager(world)` creates one ECS entity that stores input state. Systems read that ECS data and should not talk to the DOM directly.

---

## Scene API

Scenes are plain objects with `setup(world)` and optional `teardown(world)`.

```ts
import { createSceneManager } from '@arcane-engine/core';
import type { Scene } from '@arcane-engine/core';

const scenes: Record<string, Scene> = {
  title: { setup(world) {} },
  gameplay: { setup(world) {} },
};
```

`createSceneManager(world, scenes)` handles:

- running the previous scene's optional `teardown(world)`
- resetting the ECS world
- running the next scene's `setup(world)`

---

## Coding Conventions

### Non-negotiables

1. TypeScript strict mode everywhere
2. No classes for components
3. Systems are pure functions with `(world: World, dt: number) => void`
4. `dt` is in seconds
5. `Entity` is just a number

### Naming

| Thing | Convention | Example |
|-------|------------|---------|
| Component constants | PascalCase | `Position`, `Health` |
| System functions | camelCase | `movementSystem`, `spinSystem` |
| Source files | camelCase | `world.ts`, `movementSystem.ts` |
| Test files | `<source>.test.ts` | `world.test.ts` |
| Packages | kebab-case | `@arcane-engine/renderer` |

### File conventions

- `scenes/<name>.ts` exports `setup(world)` and optional `teardown(world)`
- `systems/<name>.ts` exports one system
- `components/<name>.ts` exports one component
- `game.config.ts` is the top-level project config entry point

---

## Docs Style

This repo is being prepared for public GitHub sharing.

When writing docs or comments:

- prefer simple language over jargon
- explain ECS concepts the first time they appear
- assume the reader may be new to game engines
- optimize for "easy to understand in one pass"

If something is technically correct but hard to explain, prefer the simpler version.

---

## Current Baseline

- Stages 1 through 6 are complete
- `packages/create-arcane` scaffolds starter projects correctly
- `templates/starter` builds as a generated app
- `examples/hello-cube` has a title screen, gameplay scene, floating cubes, ground plane, lighting, and scene switching
- root `README.md` and `CONTRIBUTING.md` exist
- public package APIs are documented with JSDoc
- verified commands from repo root: `pnpm test`, `pnpm typecheck`, `pnpm build`
- verified scaffold flow: local CLI scaffold plus generated-project `pnpm install`, `pnpm typecheck`, and `pnpm build`

---

## Testing Requirements

- Every public function should have a Vitest test
- Tests live in `packages/<pkg>/tests/` or `examples/<name>/tests/`
- Tests should import from `src/`, not from `dist/`
- Hot paths should include at least one performance-oriented test
- Run all tests from the repo root with `pnpm test`

---

## Git And Repository Hygiene

- Do not commit generated outputs like `dist/`, `node_modules/`, or temporary scaffold folders
- Do not revert unrelated user changes
- Keep docs and stage references up to date when the project meaningfully changes

---

## Commit Format

Use Conventional Commits:

```text
feat(core): add query bitmask optimization
fix(renderer): prevent mesh leak on destroyEntity
docs(readme): clarify ECS concepts
test(create-arcane): cover absolute scaffold path
chore: update lockfile
```

Valid scopes: `core`, `renderer`, `input`, `create-arcane`, `examples`, `docs`

---

## Performance Targets

| Operation | Target |
|-----------|--------|
| Create 1,000 entities + 3 components each | < 10ms |
| Query 1,000 entities with a 2-component filter | < 5ms |
| Full frame at 100 entities | 60fps |
| Framework bundle gzipped | < 200KB |

---

## What Not To Build Yet

These are post-MVP ideas. Do not implement them unless explicitly asked:

- physics
- asset pipeline
- audio
- collision
- UI overlay system
- networking
- WebGPU renderer
- plugin system
