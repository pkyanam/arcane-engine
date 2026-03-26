# Arcane Engine

**Arcane Engine** is a small framework for making **3D games in the browser**. It is meant to feel approachable: you can read the code, copy a pattern, and have something on screen without fighting boilerplate.

We are **building in public** — the repo lives on GitHub, and we share progress openly (say hi on X if you try it). Perfect is not the goal; **clear and learnable** is.

**Status (March 2026):** V2 roadmap **Stages 1–11 done** — `hello-cube` **fps-test** (**F**) is a small playable FPS loop (HUD, health, kills, win/lose, respawn). **Stage 12** = WebSocket multiplayer ([`PROMPT.md`](./PROMPT.md)). Full table: [`ARCANE_ENGINE_PRD_V2.md`](./ARCANE_ENGINE_PRD_V2.md).

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

**Done so far (Stages 1–11 on that roadmap):**

- Core ECS, renderer, input, scenes, CLI, and the **hello-cube** demo
- **Physics** (Rapier): floors, falling boxes, **kinematic** player bodies, **raycast** (hitscan)
- **First-person**: mouse look with **pointer lock**, move **relative to where you look**
- **Character controller**: walk and jump in a room **without falling through the floor or clipping walls**
- **Weapons + hitscan** and **HUD + game state** in **fps-test** (**F**): crosshair, health bar, kills, death/win overlays, **R** respawn, optional floor damage tile

**Next up:** Stage 12 — **multiplayer** (WebSocket server, synced ghost players).

If the PRD’s checklist table ever looks stale, **the code and tests win**.

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
|  |- input/           # keyboard, mouse, movement, orbit + FPS camera
|  |- physics/        # Rapier: bodies, colliders, raycast, character controller
|  `- create-arcane/   # starter project scaffolder
|- templates/
|  `- starter/         # default generated project
|- examples/
|  `- hello-cube/      # working demo (title, gameplay, physics, FPS room)
|- README.md
|- CONTRIBUTING.md
|- AGENTS.md
|- CLAUDE.md
|- ARCANE_ENGINE_PRD_V2.md
|- PROMPT.md         # handoff for the next milestone (Stage 12)
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
| **Enter** | Gameplay scene (cube world, WASD) |
| **P** | Physics playground (cubes + gravity) |
| **F** | **FPS test** — click canvas for pointer lock; WASD, Space, shoot targets; HUD; **R** respawn if dead; Esc → title |

---

## Create a new game

Published:

```sh
npx @arcane-engine/create-arcane my-game
```

That creates a folder, copies the starter template, fixes the name, installs deps, and can start the dev server.

Flags:

```sh
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
| `@arcane-engine/input` | `InputState`, movement, orbit camera, **FPS camera + pointer lock** |
| `@arcane-engine/physics` | Rapier world, colliders, **character controller**, **`raycast`** |
| `@arcane-engine/create-arcane` | `npx` project scaffold |

JSDoc lives next to the source in `packages/*/src`.

---

## What the hello-cube demo proves

- Multiple **scenes** and clean **switching**  
- **WASD** gameplay and a **title** screen  
- **Physics** toys (P)  
- A **first-person room** (F): floors, walls, jump, pointer lock  

It is not a shipped game — it is a **readable proof** that the pieces work together.

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
- [`ARCANE_ENGINE_PRD_V2.md`](./ARCANE_ENGINE_PRD_V2.md) — roadmap to multiplayer FPS  
