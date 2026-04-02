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

**Roadmap:** [`ARCANE_ENGINE_PRD_V2.md`](./ARCANE_ENGINE_PRD_V2.md) describes the shipped **multiplayer first-person shooter** track (Stages 1–12). [`ARCANE_ENGINE_PRD_V3.md`](./ARCANE_ENGINE_PRD_V3.md) proposes the post-V2 roadmap. If a checklist table lags the repo, treat the codebase and tests as the source of truth.

**Current stage:** **V2.0 is shipped**, **Stages 13–23 of PRD V3 are complete**, and the current V3 roadmap is closed out. Shipped surface includes **`packages/assets`**, the **`packages/server`** relay, **`networkSyncSystem`**, **`multiplayer`** scene (**M**), shared example-local **`fpsArenaSetup`** / **`fpsHud`** / **`fpsSceneRuntime`** / **`fpsPlayerSetup`**, shared example-local **`helloCubePresentation`** scene copy/theme helpers, a clickable `hello-cube` command deck, smoothed remote ghosts, relay **`join`** plus **`ping`** / **`pong`**, **`VITE_WS_URL`**, **`mobileControls`** on touch devices, textured `hello-cube` gameplay, named scene asset manifests via **`preloadSceneAssets(...)`**, repeated imported props via **`spawnModelInstances(...)`**, imported **glTF / GLB** props via **`loadModel(...)`** / **`spawnModel(...)`**, animation playback via **`AnimationPlayer`** / **`animationSystem()`** / **`playAnimation(...)`**, Stage 23 lazy scene-module loading in shipped runtimes, hello-cube on-demand Rapier loading for physics scenes, the Stage 14 renderer defaults / lighting helpers, `create-arcane` template choices via **`starter`** and **`asset-ready`**, and the Stage 22 workflow docs in **`docs/`**.

**Workflow docs:** use [`docs/STAGE_TEMPLATE.md`](./docs/STAGE_TEMPLATE.md) for future stage prompts and [`docs/AGENT_WORKFLOW.md`](./docs/AGENT_WORKFLOW.md) for task splitting plus the example-local vs package-level checklist.

---

## Monorepo Structure

```text
arcane-engine/
|- packages/
|  |- core/           # ECS, queries, systems, game loop, scenes
|  |- renderer/       # Three.js wrapper and render helpers
|  |- assets/         # Texture + glTF/GLB loading, caching, and disposal helpers
|  |- input/          # DOM input bridge, movement, orbit + FPS camera systems
|  |- physics/        # Rapier: bodies, colliders, raycast, character controller
|  |- server/         # Node WebSocket relay (Stage 12)
|  `- create-arcane/  # starter project scaffolder
|- templates/
|  `- starter/        # default generated project
|- examples/
|  `- hello-cube/     # title, gameplay, physics, fps-test, multiplayer scenes
|- README.md
|- CONTRIBUTING.md
|- AGENTS.md
|- CLAUDE.md
|- ARCANE_ENGINE_PRD_V2.md
|- CHANGELOG.md
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
| `@arcane-engine/assets` | Texture loading, glTF / GLB loading, scene asset manifests, loading progress hooks, repeated model spawn helpers, animation playback helpers, and explicit disposal helpers |
| `@arcane-engine/input` | Input components, DOM bridge, movement, camera follow, FPS look / pointer lock |
| `@arcane-engine/physics` | Rapier world, rigid bodies (fixed / dynamic / kinematic), box colliders, `raycast`, character controller |
| `@arcane-engine/create-arcane` | scaffolds a starter project from `templates/starter` |
| `@arcane-engine/server` | Node **`ws`** relay: `welcome` / `move` / `shoot` / `leave` fan-out (no game logic) |

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
createRenderer(canvasOrOptions?): RendererContext
addEnvironmentLighting(ctx, options?): readonly [AmbientLight, HemisphereLight]
addDirectionalShadowLight(ctx, options?): { light; target }
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

### `@arcane-engine/server`

```ts
startRelayServer(options?): { httpServer; wss; port; close(): Promise<void> }
```

### `@arcane-engine/assets`

```ts
createTextureCache(): AssetCache
disposeAssetCache(cache): void
loadTexture(ctx, source, options?): Promise<Texture>
loadModel(cache, source): Promise<ModelAsset>
preloadSceneAssets(ctx, manifest, options?): Promise<SceneAssetBundle>
getModelAnimationClipNames(modelAsset): string[]
spawnModel(world, ctx, modelAsset, options?): Entity
spawnModelInstances(world, ctx, modelAsset, instances): Entity[]
AnimationPlayer
animationSystem(): SystemFn
playAnimation(world, entity, clipName, options?): AnimationAction
stopAnimation(world, entity, options?): void
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
- registration order matters (e.g. in `fps-test`: hit flash restore → physics → character controller → FPS camera → weapon → damage zone → health → game state → render; in **`multiplayer`**, insert **`networkSyncSystem`** after **`healthSystem`** and before **`gameStateSystem`**)

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

- Stages **1–12** of the **PRD V2** FPS track are implemented, including **`packages/server`** and **`multiplayer`** (ghost sync + relayed shoot)
- `packages/physics`: Rapier WASM, fixed/dynamic/**kinematic** bodies, box colliders, gravity sync for dynamic bodies, **`raycast()`**, **`CharacterController`** + **`characterControllerSystem`**
- `packages/input`: **`FPSCamera`**, **`fpsCameraSystem`**, **`fpsMovementSystem`**, **`InputState.mouseButtons`**, optional canvas + **pointer lock** in `createInputManager`
- `examples/hello-cube`: scenes **`title`**, **`gameplay`**, **`physics`** (P), **`fps-test`** (F), **`multiplayer`** (M); textured gameplay floor/walls use the official Stage 15 workflow; gameplay also places imported `.glb` crystal props through the official Stage 16 workflow and an animated imported beacon through the official Stage 17 workflow; shared example-local FPS helpers now live in `fpsSceneRuntime.ts` and `fpsPlayerSetup.ts`; **`mobileControls`** touch overlay when `pointer: coarse` or `maxTouchPoints`; scene modules now lazy-load, and physics-backed scenes preload Rapier on demand instead of `main.ts` awaiting **`initPhysics()`**; root **`pnpm test`** builds **core → renderer → assets → input → physics → server** before workspace tests
- Stage 21 keeps that same feature set example-local but now presents it as one teaching slice via a clearer command deck, shared scene copy/theme helpers, and scene-to-scene onboarding polish
- Stage 14 renderer upgrade: `createRenderer()` supports background / clear color / max pixel ratio / shadow defaults, provided canvases resize correctly, and the renderer exports beginner-friendly environment + directional shadow helpers
- Stage 15 texture pipeline + Stage 16 model loading + Stage 17 animation playback + Stage 19 scene assets: `@arcane-engine/assets` exports `createTextureCache()`, `loadTexture(...)`, `loadModel(...)`, `spawnModel(...)`, `spawnModelInstances(...)`, `preloadSceneAssets(...)`, `AnimationPlayer`, `animationSystem()`, `playAnimation(...)`, `stopAnimation(...)`, and `disposeAssetCache(...)`; texture and model source reuse is cached, animated model instances get mixer-backed clip playback, loading progress hooks support simple overlays, and teardown guidance is documented
- Stage 18 gameplay extraction: repeated FPS scene setup moved into shared example-local helpers; `Health` / `Damage` remain example-local, and `packages/gameplay` is still intentionally unshipped
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

Scopes: `core`, `renderer`, `input`, `physics`, `server`, `create-arcane`, `examples`, `docs`

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

Aligned with **PRD V2 §1.3** and post–V2 ideas:

- full asset pipeline / hidden asset database
- audio
- anticheat / production networking product
- mobile- or gamepad-first product scope (demo touch overlay in hello-cube is not a full mobile pipeline)
- accounts, matchmaking, large lobbies
- retargeting, blend trees, or animation graph tooling by default
- WebGPU renderer swap
- generic plugin marketplace

**V2.0** (through multiplayer relay + client sync) is shipped; treat **PRD** §10 for discretionary follow-ups.
