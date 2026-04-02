# Arcane Engine

**Arcane Engine** is a small framework for making **3D games in the browser**. It is meant to feel approachable: you can read the code, copy a pattern, and have something on screen without fighting boilerplate.

We are **building in public** — the repo lives on GitHub, and we share progress openly (say hi on X if you try it). Perfect is not the goal; **clear and learnable** is.

**Status (April 2026):** **V2.0 shipped**, **Stages 13–23 of PRD V3 are complete**, and **the current V3 roadmap is closed out in code, tests, docs, and templates**. PRD Stages **1–12** are complete in code and tests (`hello-cube`: **F** fps-test, **M** multiplayer, touch overlay on phones). Anything beyond Stage 23 belongs in a **future PRD**, not silent scope creep inside V3. Roadmap tables: [`ARCANE_ENGINE_PRD_V2.md`](./ARCANE_ENGINE_PRD_V2.md) and [`ARCANE_ENGINE_PRD_V3.md`](./ARCANE_ENGINE_PRD_V3.md). **Release `v0.2.0`:** see [`CHANGELOG.md`](./CHANGELOG.md). *#BuildInPublic*

---

## ELI5: What is this?

Imagine you are telling a five-year-old how a tiny video game works:

1. **Things** exist in the world — a player, a wall, a cube.
2. Each thing only stores **simple facts** — “I am here,” “I can be controlled,” “I fall.”
3. Every frame, **rules** run: move the player, apply gravity, draw the picture.

Arcane Engine is the **folder structure + glue** for those three ideas. It uses a pattern called **ECS** (Entity–Component–System). You do not need to have heard of ECS before.

| Word (grown-up) | Kid version |
|-------------------|-------------|
| **Entity** | “A thing.” It is really just an ID number. |
| **Component** | “A sticker with facts on it” — position, health, “is this the player?” |
| **System** | “A rule that runs every frame” — move, spin, render, physics. |
| **Scene** | “One screen” — title, level, game over. |

**Three.js** paints the 3D picture. **Arcane Engine** keeps the logic organized. **`create-arcane`** scaffolds a new project so you are not staring at a blank repo.

---

## Where we are (March 2026)

The big-picture plan is in [`ARCANE_ENGINE_PRD_V2.md`](./ARCANE_ENGINE_PRD_V2.md): a **small multiplayer-style FPS in the browser** (walk, shoot, simple HUD, then networking). We ship it **stage by stage**.

**Done so far (Stages 1–12 on that roadmap):**

- Core ECS, renderer, input, scenes, CLI, and the **hello-cube** demo
- **Physics** (Rapier): floors, falling boxes, **kinematic** player bodies, **raycast** (hitscan)
- **First-person**: mouse look with **pointer lock**, move **relative to where you look**
- **Character controller**: walk and jump in a room **without falling through the floor or clipping walls**
- **Weapons + hitscan** and **HUD + game state** in **fps-test** (**F**): crosshair, health bar, kills, death/win overlays, **R** respawn, optional floor damage tile
- **Multiplayer** (**M**): `packages/server` relay (≤4 players), `networkSyncSystem`, colored **ghost** boxes for remote peers, **shoot** relay so each client raycasts remote shots against its own player body
- **Stage 20 polish**: smoothed remote ghost movement, explicit relay `join` + `ping` / `pong`, HUD relay state / peer count / ping, and clearer reconnect / disconnect messaging in `hello-cube`
- **Stage 21 polish**: a clearer `hello-cube` command deck, shared scene presentation/copy across preload and in-scene overlays, and a more intentional walkthrough from gameplay into FPS and multiplayer

If the PRD’s checklist table ever looks stale, **the code and tests win**.

## Current capabilities

| Area | Shipped now |
|------|-------------|
| `@arcane-engine/core` | ECS world, entities, components, queries, systems, game loop, scene manager |
| `@arcane-engine/renderer` | Three.js setup, renderer defaults, environment/shadow lighting helpers, render system, transform components, `spawnMesh` helper |
| `@arcane-engine/assets` | Texture loading, glTF / GLB loading, scene asset manifests, loading-progress hooks, repeated model spawning, explicit cache reuse, imported-model animation playback, and Vite-friendly asset imports |
| `@arcane-engine/input` | Keyboard + mouse input, orbit follow camera, FPS look, pointer lock, shared `InputState` |
| `@arcane-engine/physics` | Rapier init/context, fixed/dynamic/kinematic bodies, box colliders, `raycast`, character controller |
| `@arcane-engine/server` | Small Node WebSocket relay for up to 4 multiplayer clients |
| `hello-cube` example | Clickable command deck, clearer scene onboarding, textured floor/walls, preloaded scene assets, animated imported beacon, repeated imported props, loading overlay, physics, FPS, multiplayer, HUD, respawn, touch overlay, and shared local FPS setup helpers |
| Templates | `starter`: minimal ECS + scene-transition baseline. `asset-ready`: shipped texture + model + preload walkthrough with tiny example assets. |

## Stage 23 Closeout

Stage 23 finishes the current V3 plan with hardening rather than new framework surface:

- asset cache disposal coverage now explicitly tests cached texture variants and shared model resources
- `hello-cube` and the shipped template runtimes lazy-load scene modules so the initial bundle stays focused on the current path
- `hello-cube` now loads Rapier on demand for physics-backed scenes instead of paying that cost on title-screen boot

The remaining large example chunk is Rapier's own monolithic distribution. Stage 23 isolates it behind scene entry instead of rewriting around it, and leaves deeper physics-bundle work for a future PRD.

---

## Renderer Defaults For Real Assets

Stage 14 is now in place. The renderer is less “cube demo only” without adding a full asset pipeline yet.

- `createRenderer()` now accepts `background`, `clearColor`, `maxPixelRatio`, `shadowMap`, and `outputColorSpace`
- default output color space is **`THREE.SRGBColorSpace`**
- provided canvases now resize correctly too, not just auto-created full-window canvases
- `@arcane-engine/renderer` includes `addEnvironmentLighting()` and `addDirectionalShadowLight()` for beginner-friendly PBR lighting defaults

Recommended starting point for `MeshStandardMaterial` and imported models:

- keep ambient light subtle
- use hemisphere light for most soft fill
- add one directional key light for form and shadows
- set important meshes to `castShadow = true` and large surfaces to `receiveShadow = true`

Stage 14 made Stage 15 possible by fixing the main “textured scenes look wrong” problems first: modern color-space defaults, better lighting helpers, and cleaner resize behavior.

---

## Texture Workflow

Stage 15 adds an official texture path without jumping to a full asset framework.

- `@arcane-engine/assets` exports `createTextureCache()`, `loadTexture(...)`, and `disposeAssetCache(...)`
- `loadTexture()` supports repeat / clamp wrapping, simple filtering choices, and explicit color-space handling
- the cache keeps the same texture source from loading over and over
- `hello-cube` gameplay now uses the official workflow for textured floor and wall materials

The goal is to keep textures beginner-friendly:

1. import a file with Vite
2. load it with `loadTexture(...)`
3. assign it to a material map
4. dispose the cache during scene teardown

## Model Workflow

Stage 16 adds the first official 3D model path without turning Arcane Engine
into a hidden asset pipeline.

- `@arcane-engine/assets` exports `loadModel(cache, source)` and `spawnModel(world, ctx, modelAsset, options?)`
- Stage 16 supports **glTF / GLB only**
- one loaded model source can be spawned more than once without reloading the file
- `hello-cube` gameplay now includes imported crystal props loaded from one repo-local `.glb`

The beginner-friendly mental model is:

1. import a `.glb` with Vite, usually via `?url`
2. load it once with `loadModel(...)`
3. call `spawnModel(...)` anywhere you want a cloned prop
4. dispose the same scene-local asset cache during teardown

## Animation Workflow

Stage 17 keeps imported-model animation small and explicit.

- `spawnModel(...)` automatically adds an `AnimationPlayer` when the model has clips
- `animationSystem()` advances mixers each tick
- `playAnimation(world, entity, 'ClipName', options?)` switches clips by name with repeat / once / ping-pong loop presets
- `stopAnimation(world, entity, options?)` stops the current clip immediately or with a fade

The beginner-friendly mental model is:

1. import an animated `.glb` or `.gltf`
2. load it with `loadModel(...)`
3. `spawnModel(...)` it into the world
4. register `animationSystem()`
5. call `playAnimation(...)` with the clip name you want

## Scene Asset Workflow

Stage 19 adds a small explicit preload path for content-heavy scenes.

- `@arcane-engine/assets` now exports `preloadSceneAssets(ctx, manifest, options?)`
- scene modules can declare textures and models in one named manifest
- `preloadSceneAssets(...)` reports progress through `onProgress(...)` for simple loading overlays
- `spawnModelInstances(...)` places repeated props from one loaded model source without hand-writing the same loop in every scene
- the runtime seam stays small: scenes may optionally export `preload()`, while `setup(world)` stays synchronous

The beginner-friendly mental model is:

1. declare a scene asset manifest in one place
2. preload it before entering the scene
3. use the loaded textures/models during sync `setup(world)`
4. dispose the same cache during `teardown(world)`

## Gameplay Helpers

Stage 18 reduced repeated FPS boilerplate in `hello-cube` without shipping a premature gameplay package.

- `examples/hello-cube/src/fpsSceneRuntime.ts` now holds the shared arena, HUD, input, muzzle-flash, and teardown shell used by both **fps-test** and **multiplayer**
- `examples/hello-cube/src/fpsPlayerSetup.ts` now holds the shared local-player and FPS game-state spawn helpers
- `Health` and `Damage` remain example-local but are now used through the shared FPS path instead of being recreated per scene
- `GameState`, HUD copy, respawn rules, damage zones, and weapon flow still stay in `hello-cube` because they are tightly coupled to the demo and still only serve one shipped example path

There is still **no shipped `packages/gameplay`**. That package remains optional until more than one example or starter path clearly needs the same gameplay API.

## Stage 19 In Practice

`examples/hello-cube/scenes/gameplay.ts` is now the shipped Stage 19 proof path:

- one named scene asset manifest declares the floor texture, wall texture, crystal model, and animated beacon
- the gameplay scene preloads those assets before sync setup runs
- the player sees a simple loading overlay driven by progress callbacks
- repeated crystal props use `spawnModelInstances(...)` instead of ad hoc load/spawn orchestration

This keeps the asset workflow explicit without adding a hidden database, editor tooling, or a generalized gameplay package.

---

## Hosting (free / low cost)

**Static client:** the Vite build (`pnpm --filter hello-cube build`) can go on **Vercel** or any static host.

**Multiplayer relay:** the WebSocket server is a **long-lived Node** process — it does **not** run on Vercel’s serverless model. Intended setups:

- **Split:** static game on Vercel + **`@arcane-engine/server`** on a **Raspberry Pi** at home, reached via **Cloudflare Tunnel** (`cloudflared`) so the browser uses **`wss://`** on a public hostname.
- **Combined:** serve `dist/` and the relay from the same Pi behind one tunnel (or use LAN-only for testing).

**Client URL:** set **`VITE_WS_URL`** at build time (e.g. `wss://relay.example.com`) so production points at your tunnel. If unset, local dev uses **`ws://localhost:8765`**; on **`https:`** pages the default becomes **`wss://localhost:8765`** (override with `VITE_WS_URL`).

**Local try (two terminals):**

```sh
pnpm --filter @arcane-engine/server build && pnpm --filter @arcane-engine/server start
pnpm --filter hello-cube dev
```

Then open two browser tabs, press **M** on the title screen in each, and connect to the same relay.

---

## Physics (still “optional,” but powerful)

The **`@arcane-engine/physics`** package uses [Rapier](https://rapier.rs/). Think of it as “the world has solid objects and gravity.”

- **Fixed** things do not move (ground, walls).
- **Dynamic** things fall and bump into each other.
- **Kinematic** things are moved by your code (typical FPS capsule/box), but still collide with the world.
- **`raycast`** draws an invisible line for “what did we hit?” — perfect for hitscan guns later.

Games that never add the package do not load Rapier. See [`packages/physics/README.md`](packages/physics/README.md) for API details.

---

## Why this exists

Most browser-game starts mean wiring **renderer + loop + input + folders** by hand. Arcane Engine tries to skip that ceremony so you can ask sooner: **“What should my game do?”** not **“Which glue file do I write first?”**

---

## What is in this repo

```text
arcane-engine/
|- packages/
|  |- core/            # ECS, world, queries, systems, game loop, scenes
|  |- renderer/        # Three.js bridge and render components
|  |- assets/          # Texture + glTF/GLB loading, caching, and disposal helpers
|  |- input/           # keyboard, mouse, movement, orbit + FPS camera
|  |- physics/        # Rapier: bodies, colliders, raycast, character controller
|  |- server/          # WebSocket relay (Stage 12 multiplayer)
|  `- create-arcane/   # starter project scaffolder
|- templates/
|  `- starter/         # default generated project
|- examples/
|  `- hello-cube/      # demo: title, gameplay, physics, FPS, multiplayer, mobile UI
|- README.md
|- CONTRIBUTING.md
|- AGENTS.md
|- CLAUDE.md
|- ARCANE_ENGINE_PRD_V2.md
|- CHANGELOG.md
`- package.json
```

---

## Quick start

From the repo root:

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

Run the demo:

```sh
pnpm --filter hello-cube dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

**Title screen shortcuts:**

| Key | What it does |
|-----|----------------|
| **Enter** | **Sanctum Walkthrough** — start-here textured environment + imported props + animated beacon + preload flow |
| **P** | Physics playground (cubes + gravity) |
| **F** | **FPS test** — click canvas for pointer lock; WASD, Space, shoot targets; HUD; **R** respawn if dead; Esc → title |
| **M** | **Multiplayer** — same arena as **F**; start relay first; ghost players; Esc → title |

**Phone / touch (hello-cube):** On coarse pointers or touch screens, an overlay appears: **title** uses the same four route buttons as the desktop command deck; **in-game** uses a **move stick** (maps to WASD), **Title** (top-right) to return to the menu, and on **FPS** / **Multiplayer** a **drag-to-look** strip plus **Jump**, **Fire**, and **Respawn** (R). Keyboard still works when connected.

**Shipping a GitHub release (#BuildInPublic):** Update [`CHANGELOG.md`](./CHANGELOG.md) and root `package.json` `version`, then tag (e.g. `v0.2.0`) and create a GitHub Release from that tag. Details: [`CONTRIBUTING.md`](./CONTRIBUTING.md).

---

## Create a new game

Published:

```sh
npx @arcane-engine/create-arcane my-game
npx @arcane-engine/create-arcane my-game --template asset-ready
```

That creates a folder, copies the requested template, fixes the name, installs deps, and can start the dev server.

Shipped template choices:

- `starter`: the smallest readable Arcane Engine baseline
- `asset-ready`: the official Stage 15-19 path with preload, textures, imported props, and an animated imported beacon

Flags:

```sh
create-arcane my-game --template starter
create-arcane my-game --template asset-ready
create-arcane my-game --no-install
create-arcane my-game --no-start
```

Inside this monorepo, local CLI:

```sh
node packages/create-arcane/bin/create-arcane.js my-game --no-install --no-start
```

---

## Folder conventions (opinionated on purpose)

- `game.config.ts` — first scene, canvas id, renderer options  
- `scenes/<name>.ts` — `setup` / `teardown` per screen  
- `components/<name>.ts` — one component type per file  
- `systems/<name>.ts` — one system per file  
- `src/runtime/*` — small helpers shared by the example and template  

The tree should **read like the game**.

---

## Add an entity

Entities are numbers. You attach **components** (plain objects).

```ts
import { defineComponent } from '@arcane-engine/core';

export const Health = defineComponent('Health', () => ({
  hp: 100,
  max: 100,
}));
```

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

Use `spawnMesh(...)` from `@arcane-engine/renderer` when you need something visible.

---

## Add a system

A **system** is a function that runs every frame.

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

Register in a scene:

```ts
import { registerSystem } from '@arcane-engine/core';
import bounceSystem from '../systems/bounceSystem.js';

registerSystem(world, bounceSystem);
```

---

## Add a scene

```ts
import type { World } from '@arcane-engine/core';

export function setup(world: World): void {
  // entities + systems + any DOM for this screen
}

export function teardown(_world: World): void {
  // clean up scene-specific DOM / Three.js objects
}
```

Set the starting scene in `game.config.ts` (`initialScene`).

---

## Packages

| Package | You get |
|---------|---------|
| `@arcane-engine/core` | World, entities, components, queries, systems, loop, scenes |
| `@arcane-engine/renderer` | Three.js setup, `spawnMesh`, `renderSystem`, transform components |
| `@arcane-engine/assets` | `loadTexture`, cache reuse, explicit texture disposal |
| `@arcane-engine/input` | `InputState`, movement, orbit camera, **FPS camera + pointer lock** |
| `@arcane-engine/physics` | Rapier world, colliders, **character controller**, **`raycast`** |
| `@arcane-engine/server` | Node relay for multiplayer `move` / `shoot` / `leave` messages |
| `@arcane-engine/create-arcane` | `npx` project scaffold |

JSDoc lives next to the source in `packages/*/src`.

---

## What the hello-cube demo proves

- Multiple **scenes** and clean **switching**  
- **WASD** gameplay and a **title** screen  
- **Physics** toys (P)  
- A **first-person room** (F): floors, walls, jump, pointer lock  
- A textured gameplay scene using the official Stage 15 workflow  
- **Multiplayer relay** (M): remote ghost players and relayed hitscan shots
- **Touch fallback UI** on phones and coarse pointers

It is still not a shipped game, but Stage 21 turns it into a **teaching vertical slice** instead of a loose proof-of-features checklist.

---

## Development

```sh
pnpm test
pnpm typecheck
pnpm build
```

Project habits:

- TypeScript **strict** everywhere  
- Components = **plain objects**, not classes  
- Systems = **pure** `(world, dt)` functions  
- Public APIs should have **tests**  
- Prefer **small steps** over feature piles  

---

## Build in public

We want this repo to be easy to **read**, **fork**, **teach**, and **extend** — including for AI coding agents. If a design is clever but confusing, it probably does not belong here.

**GitHub:** star, issue, PR — all welcome.  
**X / social:** share what you build; we’d love to see it.

---

## More docs

- [`CONTRIBUTING.md`](./CONTRIBUTING.md) — how to contribute  
- [`AGENTS.md`](./AGENTS.md) — notes for Codex and other agents  
- [`CLAUDE.md`](./CLAUDE.md) — notes for Claude Code  
- [`docs/STAGE_TEMPLATE.md`](./docs/STAGE_TEMPLATE.md) — short template for future stage prompts and PRD slices
- [`docs/AGENT_WORKFLOW.md`](./docs/AGENT_WORKFLOW.md) — task splitting guidance plus the example-local vs package-level checklist
- [`packages/assets/README.md`](./packages/assets/README.md) — texture loading and disposal
- [`ARCANE_ENGINE_PRD_V2.md`](./ARCANE_ENGINE_PRD_V2.md) — roadmap to multiplayer FPS  
- [`ARCANE_ENGINE_PRD_V3.md`](./ARCANE_ENGINE_PRD_V3.md) — proposed post-V2 roadmap  
