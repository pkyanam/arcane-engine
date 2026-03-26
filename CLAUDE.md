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
- system = logic that updates things
- scene = one screen or game state

**Current stage:** Stage 6 complete (Hello Cube Demo + Documentation).

**Next step:** public-facing cleanup and then choosing the first post-MVP milestone. The PRD does not define a formal Stage 7 yet.

---

## Monorepo Structure

```text
arcane-engine/
|- packages/
|  |- core/           # ECS, queries, systems, game loop, scenes
|  |- renderer/       # Three.js wrapper and render helpers
|  |- input/          # DOM input bridge and movement/camera systems
|  `- create-arcane/  # starter project scaffolder
|- templates/
|  `- starter/        # default generated project
|- examples/
|  `- hello-cube/     # polished example demo
|- README.md
|- CONTRIBUTING.md
|- AGENTS.md
|- CLAUDE.md
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
| `@arcane-engine/input` | input components, DOM event bridge, movement system, camera follow system |
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
createInputManager(world): InputManagerHandle
movementSystem(speed?): SystemFn
cameraFollowSystem(ctx, options?): SystemFn
InputState
Controllable
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
- registration order matters

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

This repo is being prepared for early public GitHub sharing.

Prefer docs that are:

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
- tests should import from `src/`, not `dist/`
- include performance-oriented tests for hot paths where it matters
- run repo-wide verification with `pnpm test`, `pnpm typecheck`, and `pnpm build`

---

## Current Baseline

- Stages 1 through 6 are complete
- `packages/create-arcane` is implemented and locally verified
- `templates/starter` works as a generated app
- `examples/hello-cube` demonstrates the framework with title/gameplay scenes and visible motion
- root docs exist and public package APIs have JSDoc
- repo verification commands pass from the root

---

## Agent Workflow Notes

- Claude Code is best used for architecture, integration, and multi-file cleanup
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
feat(core): add query bitmask optimization
fix(create-arcane): resolve local file dependency paths from realpath
docs(readme): explain ECS in plain language
test(input): cover camera follow edge case
chore: update lockfile
```

Scopes: `core`, `renderer`, `input`, `create-arcane`, `examples`, `docs`

---

## Performance Targets

| Operation | Target |
|-----------|--------|
| Create 1,000 entities with 3 components each | < 10ms |
| Query 1,000 entities with 2-component filter | < 5ms |
| Full frame at 100 entities | 60fps |
| Framework bundle gzipped | < 200KB |

---

## Post-MVP Roadmap

Do not build these unless explicitly asked:

- physics
- asset pipeline
- audio
- collision
- UI overlay system
- networking
- WebGPU renderer
- plugin system
