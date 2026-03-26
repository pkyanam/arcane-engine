# Arcane Engine — Claude Code Instructions

This file gives Claude Code persistent context about the Arcane Engine repo.
Read it before making changes.

---

## Project Overview

Arcane Engine is a lightweight framework for making 3D games in the browser.

Short version:

- Three.js handles rendering
- Arcane Engine handles structure
- the repo is designed to be easy for humans and AI agents to extend

Core model:

- entity = a thing in the game
- component = data about the thing
- system = logic that updates the thing
- scene = one screen or game state

**Roadmap:** [`ARCANE_ENGINE_PRD_V2.md`](./ARCANE_ENGINE_PRD_V2.md) describes the path to a small **multiplayer first-person shooter** in the browser (Stages 1–12). The checklist table in §9 of that doc may lag the repo; treat the codebase and this file as the source of truth for what is already shipped.

**Current stage:** **Stage 11 complete** on the V2 track — through **HUD + Game State** in `examples/hello-cube`: `#arcane-hud` (crosshair, health bar, kills), example-local **`GameState`** / **`ShootableTarget`**, **`gameStateSystem`**, **`damageZoneSystem`**, player **`Health`**, death / win overlays, **R** respawn, **`healthSystem`** kill counting and player death clamp. Prior stages **7**–**10** remain as in the PRD (physics through hitscan).

**Next step (per PRD V2 §8):** **Stage 12 — Multiplayer** (`packages/server`, WebSocket, `networkSyncSystem`, ghost players). Start from **[`PROMPT.md`](./PROMPT.md)**. HUD and `GameState` from Stage 11 are the client foundation for overlays and scoring.

---

## Monorepo Structure

```text
arcane-engine/
|- packages/
|  |- core/           # ECS, queries, systems, game loop, scenes
|  |- renderer/       # Three.js wrapper and render helpers
|  |- input/          # DOM input bridge, movement, orbit + FPS camera systems
|  |- physics/        # Rapier: bodies, colliders, raycast, character controller
|  `- create-arcane/  # starter project scaffolder
|- templates/
|  `- starter/        # default generated project
|- examples/
|  `- hello-cube/     # title, gameplay, physics, fps-test scenes
|- README.md
|- CONTRIBUTING.md
|- AGENTS.md
|- CLAUDE.md
|- ARCANE_ENGINE_PRD_V2.md
|- PROMPT.md         # next milestone handoff (Stage 12)
`- package.json
```

**Package manager:** pnpm workspaces  
**Build tool:** Vite  
**Test framework:** Vitest  
**Language:** TypeScript with `strict: true` and `verbatimModuleSyntax`

---

## Package Responsibilities

| Package | Responsibility |
|---------|----------------|
| `@arcane-engine/core` | ECS primitives, query engine, system registration, game loop, scene lifecycle |
| `@arcane-engine/renderer` | Three.js integration, render components, renderer setup, mesh spawning |
| `@arcane-engine/input` | Input components, DOM bridge, movement, camera follow, FPS look / pointer lock |
| `@arcane-engine/physics` | Rapier world, rigid bodies (fixed / dynamic / kinematic), box colliders, `raycast`, character controller |
| `@arcane-engine/create-arcane` | scaffolds a starter project from `templates/starter` |

---

## Core Concepts

### Entity

A plain `number`. No class. No methods.

### Component

A plain object created with `defineComponent()`. Never a class.

```ts
const Position = defineComponent('Position', () => ({ x: 0, y: 0, z: 0 }));
```

### World

The ECS container for entities, component stores, and registered systems.

### System

A pure function:

```ts
function system(world: World, dt: number): void {
  // update matching entities
}
```

`dt` is always in seconds.

### Scene

A named game state like `title` or `gameplay`.

---

## Public API Snapshot

### `@arcane-engine/core`

```ts
createWorld(): World
createEntity(world): Entity
destroyEntity(world, entity): void
resetWorld(world): void
addComponent(world, entity, type, data?): void
removeComponent(world, entity, type): void
getComponent(world, entity, type): T | undefined
hasComponent(world, entity, type): boolean
defineComponent(name, defaultFn): ComponentType<T>
query(world, [ComponentType, ...]): Entity[]
registerSystem(world, fn): void
unregisterSystem(world, fn): void
runSystems(world, dt): void
createGameLoop(options): GameLoopHandle
createSceneManager(world, scenes): SceneManager
```

### `@arcane-engine/renderer`

```ts
createRenderer(canvas?): RendererContext
spawnMesh(world, ctx, geometry, material, position?): Entity
renderSystem(ctx): SystemFn
Position
Rotation
Scale
MeshRef
Spin
```

### `@arcane-engine/input`

```ts
createInputManager(world, canvas?): InputManagerHandle
movementSystem(speed?): SystemFn
cameraFollowSystem(ctx, options?): SystemFn
fpsCameraSystem(ctx, options?): SystemFn
fpsMovementSystem(speed?): SystemFn
InputState   // keys, mouse dx/dy, mouseButtons (Set; 0 = left)
Controllable
FPSCamera
```

### `@arcane-engine/physics`

```ts
initPhysics(): Promise<void>
createPhysicsContext(options?): PhysicsContext
physicsSystem(ctx): SystemFn
characterControllerSystem(ctx): SystemFn
raycast(ctx, origin, direction, maxDistance): RaycastHit | null
RigidBody            // type: 'fixed' | 'dynamic' | 'kinematic'
BoxCollider
RapierBodyRef
CharacterController
```

---

## Coding Conventions

### TypeScript

- strict mode always
- use `import type { ... }` for type-only imports
- prefer `unknown` plus narrowing over `any`
- keep public types readable and explicit

### Components

- plain objects only
- created with `defineComponent<T>(name, defaultFn)`
- default factories must return fresh objects

### Systems

- pure functions only
- signature `(world: World, dt: number) => void`
- do not hide important world state in external mutable closures
- registration order matters (e.g. in `fps-test`: hit flash restore → physics → character controller → FPS camera → weapon → damage zone → health → game state → render)

### Naming

| Thing | Convention | Example |
|-------|------------|---------|
| Component constants | PascalCase | `Position`, `Health` |
| System functions | camelCase | `movementSystem`, `renderSystem` |
| Files | camelCase | `world.ts`, `renderSystem.ts` |
| Tests | mirror source | `world.test.ts` |

### File conventions

- `scenes/<name>.ts` exports `setup(world)` and optional `teardown(world)`
- `systems/<name>.ts` exports one system
- `components/<name>.ts` exports one component
- `game.config.ts` holds the initial scene and project-level settings

---

## Docs And Public Communication

The project is **built in public** (GitHub, social). Prefer docs that are:

- simple
- concrete
- beginner-friendly
- easy to skim

When explaining ECS or architecture:

- define terms once
- avoid assuming prior engine knowledge
- use plain examples

The README should stay understandable to someone who is new to browser game tooling.

---

## Testing Requirements

- every public function should have a Vitest test
- tests live in `packages/<pkg>/tests/` or `examples/<name>/tests/`
- tests should import from `src/`, not from `dist/`
- include performance-oriented tests for hot paths where it matters
- run repo-wide verification with `pnpm test`, `pnpm typecheck`, and `pnpm build`

---

## Current Baseline

- Stages **1–11** of the **PRD V2** FPS track are implemented: core through **HUD + game state** in the example (`GameState`, DOM HUD, damage zone, respawn, win)
- `packages/physics`: Rapier WASM, fixed/dynamic/**kinematic** bodies, box colliders, gravity sync for dynamic bodies, **`raycast()`**, **`CharacterController`** + **`characterControllerSystem`**
- `packages/input`: **`FPSCamera`**, **`fpsCameraSystem`**, **`fpsMovementSystem`**, **`InputState.mouseButtons`**, optional canvas + **pointer lock** in `createInputManager`
- `examples/hello-cube`: scenes **`title`**, **`gameplay`**, **`physics`** (P), **`fps-test`** (F) with HUD DOM, **`gameStateSystem`**, **`damageZoneSystem`**, **`weaponSystem`** / **`healthSystem`** / **`hitFlashRestoreSystem`**; `main.ts` awaits **`initPhysics()`**; root **`pnpm test`** builds **core → renderer → input → physics** before workspace tests
- `packages/create-arcane` and `templates/starter` verified locally
- public package APIs documented with JSDoc
- repo verification from root: `pnpm test`, `pnpm typecheck`, `pnpm build`

---

## Agent Workflow Notes

- Claude Code is well suited to architecture, integration, and multi-file cleanup across packages
- Codex is strong on isolated packages, tests, example implementation, and bounded fixes
- keep this file and `AGENTS.md` aligned
- when project status changes, update stage references and baseline notes

---

## Repository Hygiene

- do not commit generated outputs like `dist/` or `node_modules/`
- keep the repo easy to understand for first-time visitors
- prefer removing stale stage references over leaving historical confusion behind

---

## Commit Format

Use Conventional Commits:

```text
feat(physics): add hitscan helper
fix(input): clear mouse delta when no FPS entity
docs(readme): explain fps-test scene
test(examples): cover scene registry
chore: update lockfile
```

Scopes: `core`, `renderer`, `input`, `physics`, `create-arcane`, `examples`, `docs`

---

## Performance Targets

| Operation | Target |
|-----------|--------|
| Create 1,000 entities with 3 components each | < 10ms |
| Query 1,000 entities with 2-component filter | < 5ms |
| Full frame at 100 entities | 60fps |
| Framework bundle gzipped | < 200KB |

---

## What Not To Build Unless Explicitly Asked

Aligned with **PRD V2 §1.3** and post–Stage-12 ideas:

- full asset pipeline / GLTF loading (procedural meshes are fine for now)
- audio
- anticheat / production networking product
- mobile or gamepad-first input
- accounts, matchmaking, large lobbies
- WebGPU renderer swap
- generic plugin marketplace

**Stage 11** (HUD) is complete; **Stage 12** (multiplayer) is next unless deferred.
