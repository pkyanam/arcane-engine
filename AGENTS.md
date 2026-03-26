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

**Roadmap:** See [`ARCANE_ENGINE_PRD_V2.md`](./ARCANE_ENGINE_PRD_V2.md) for the full **browser multiplayer FPS** plan (Stages 1–12). If that document’s status table disagrees with the repo, **trust the code and tests**.

**Current stage:** **Stage 11 complete** on the V2 track: **`fps-test`** includes **`#arcane-hud`** (crosshair, health bar, kill counter), example-local **`GameState`**, **`ShootableTarget`**, **`gameStateSystem`**, **`damageZoneSystem`**, player **`Health`**, death/win overlays, **R** respawn, and **`healthSystem`** integration for kills + player death (see `examples/hello-cube`).

**What comes next:** **Stage 12 — Multiplayer** (PRD §8): `packages/server`, WebSocket relay, **`networkSyncSystem`**, ghost **`RemotePlayer`** meshes, **M** key scene. Handoff: **[`PROMPT.md`](./PROMPT.md)**.

---

## Monorepo Structure

```text
arcane-engine/
|- packages/
|  |- core/           # ECS, game loop, world, scenes
|  |- renderer/       # Three.js wrapper
|  |- input/          # Keyboard/mouse, movement, orbit + FPS camera
|  |- physics/        # Rapier: colliders, raycast, character controller
|  `- create-arcane/  # npx CLI scaffolder
|- templates/
|  `- starter/        # Default generated project
|- examples/
|  `- hello-cube/     # title, gameplay, physics, fps-test
|- README.md
|- CONTRIBUTING.md
|- CLAUDE.md
|- AGENTS.md
|- ARCANE_ENGINE_PRD_V2.md
|- PROMPT.md
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
| `@arcane-engine/input` | DOM input bridge, movement, camera follow, FPS look + pointer lock |
| `@arcane-engine/physics` | Rapier world, rigid bodies, box colliders, raycast, character controller |
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
  fpsCameraSystem,
  fpsMovementSystem,
  InputState,
  Controllable,
  FPSCamera,
} from '@arcane-engine/input';
import type { CameraFollowOptions, InputManagerHandle } from '@arcane-engine/input';
```

`createInputManager(world, canvas?)` creates one ECS entity that stores input state. Pass the **canvas** to enable pointer lock on click for FPS scenes. Systems read ECS data and should not talk to the DOM directly.

---

## Physics API

Import from `@arcane-engine/physics`. Call **`await initPhysics()`** once at app startup before `createPhysicsContext`.

Typical **`fps-test`** stack: `hitFlashRestoreSystem` → `physicsSystem` → `characterControllerSystem` → `fpsCameraSystem` → `weaponSystem` → `damageZoneSystem` → `healthSystem` → `gameStateSystem` → `renderSystem`.

See [`packages/physics/README.md`](./packages/physics/README.md) for collider shapes, `raycast`, and body types (`fixed`, `dynamic`, `kinematic`).

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

This repo is shared **in public** (GitHub and social). When writing docs or comments:

- prefer simple language over jargon
- explain ECS concepts the first time they appear
- assume the reader may be new to game engines
- optimize for "easy to understand in one pass"

If something is technically correct but hard to explain, prefer the simpler version.

---

## Current Baseline

- **Stages 1–11** (PRD V2 FPS track) are implemented and tested
- Physics package: fixed / dynamic / **kinematic** bodies, **`raycast()`**, **`CharacterController`** + **`characterControllerSystem`**
- Input package: **`FPSCamera`**, **`fpsCameraSystem`**, **`fpsMovementSystem`**, **`InputState.mouseButtons`**, pointer lock via **`createInputManager(world, canvas)`**
- **hello-cube**: title, gameplay, physics (**P**), **fps-test** (**F**) with hitscan combat, DOM HUD, **`GameState`**, and damage-zone player HP; app boot awaits **`initPhysics()`**; root **`pnpm test`** builds **input** (and core/renderer/physics) before tests
- `packages/create-arcane` scaffolds starter projects; `templates/starter` builds
- root `README.md` and `CONTRIBUTING.md` exist; public APIs have JSDoc
- verified from repo root: `pnpm test`, `pnpm typecheck`, `pnpm build`
- verified scaffold: local CLI + generated project `pnpm install`, `pnpm typecheck`, `pnpm build`

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
feat(physics): expose raycast max distance
fix(renderer): prevent mesh leak on destroyEntity
docs(readme): clarify ECS concepts
test(input): cover pointer lock
chore: update lockfile
```

Valid scopes: `core`, `renderer`, `input`, `physics`, `create-arcane`, `examples`, `docs`

---

## Performance Targets

| Operation | Target |
|-----------|--------|
| Create 1,000 entities + 3 components each | < 10ms |
| Query 1,000 entities with a 2-component filter | < 5ms |
| Full frame at 100 entities | 60fps |
| Framework bundle gzipped | < 200KB |

---

## What Not To Build Yet (Unless Explicitly Asked)

From **PRD V2** and beyond the current stage:

- **Stage 12** (multiplayer) is next; Stage 11 (HUD) is complete unless you fork an older baseline
- Full **asset pipeline** / GLTF (procedural geometry is the norm for now)
- **Audio**
- **Anticheat**, production-grade networking product
- **Mobile / gamepad** as the primary input story
- **WebGPU** renderer
- Open-ended **plugin ecosystem**
