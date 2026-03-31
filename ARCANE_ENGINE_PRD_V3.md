# ARCANE ENGINE
## Product Requirements Document — Version 3
### Target: Asset-Ready Browser Game Framework
Version 3.0 • March 30, 2026 • Proposed roadmap after V2.0

---

## 1. Overview

This document proposes the next Arcane Engine roadmap after the original PRD (v0.1) and the V2 FPS track.

**Stages 1–12 are complete in the repo.** Arcane Engine now has:

- core ECS
- renderer
- input
- scenes
- CLI scaffolder
- physics
- first-person controls
- hitscan combat
- HUD and game state
- WebSocket multiplayer relay
- a touch-friendly `hello-cube` demo

### 1.1 What V3 is for

V3 is not a rewrite and not a jump to a giant engine. The goal is to make Arcane Engine feel like a **small but real content-ready framework**:

- polish what already shipped in V2
- support **textures** cleanly
- support **3D model loading** cleanly
- make the example feel less like a blockout and more like a small vertical slice
- improve the starter/template/docs so humans and coding agents can keep building stage by stage

### 1.2 V3 product thesis

If V2 proved that Arcane Engine can power a simple multiplayer FPS prototype, V3 should prove that it can power a **small, stylized browser game with imported art** without losing the repo's core strengths:

- approachable code
- file-based conventions
- thin wrappers around existing tools
- strict TypeScript
- APIs that are easy for AI agents to extend safely

### 1.3 What V3 deliberately excludes

V3 should still stay disciplined. By default it does **not** include:

- a full visual editor
- Unity-scale asset import workflows
- authoritative multiplayer servers or anticheat
- accounts, matchmaking, persistence backends, or live-service infra
- advanced terrain tooling, voxel worlds, or procedural world streaming
- a plugin marketplace
- a WebGPU renderer rewrite
- a full audio stack unless explicitly chosen later

---

## 2. Baseline Entering V3

### 2.1 V1 + V2 recap

| Era | Status | What it proved |
|-----|--------|----------------|
| Original PRD v0.1 | ✅ complete | ECS, renderer, input, scenes, starter template, docs-first structure |
| PRD V2 Stages 1–12 | ✅ complete | Physics, FPS controls, combat, HUD, multiplayer relay, mobile touch overlay |

### 2.2 Current repo strengths

- clean package boundaries
- strict TypeScript and Vitest coverage
- clear example structure
- easy-to-read docs
- good fit for spec-driven, stage-by-stage agent work

### 2.3 Current repo gaps V3 should address

- no official texture workflow yet
- no official glTF/GLB workflow
- no reusable asset cache / preload story
- much of the current gameplay layer still lives inside `examples/hello-cube`
- multiplayer works, but visual smoothness and usability can improve

---

## 3. V3 Goal

Deliver an **asset-ready Arcane Engine** that can:

1. load textured environments and props
2. load and instance 3D models
3. optionally play model animations
4. provide a cleaner path from scaffolded project to polished prototype
5. keep the engine small, readable, and agent-friendly

The ideal V3 outcome is that a developer can scaffold a project, drop in a few textures and `.glb` files, follow the docs, and have a small browser game scene running without inventing their own asset architecture first.

---

## 4. Architecture Direction for V3

### 4.1 New package direction

V3 should add one new package immediately and keep one package optional until the need is proven:

| Package | Status in V3 | Purpose |
|---------|---------------|---------|
| `packages/assets` | Stage 15 complete | texture loading, model loading, asset cache, prefab/model spawn helpers, optional animation support |
| `packages/gameplay` | optional later in V3 | promote reusable gameplay primitives out of the example only after they are proven stable |

### 4.2 Proposed dependency graph

```text
core
├── renderer     (depends on core)
├── input        (depends on core, renderer)
├── physics      (depends on core, renderer)
├── assets       (depends on core, renderer)
├── gameplay     (optional; depends on core, renderer, maybe physics)
└── server       (Node-only relay)

examples/hello-cube
└── depends on core, renderer, input, physics, server, assets
```

### 4.3 Design constraints for V3 features

- keep imported-asset APIs thin and explicit
- prefer TypeScript helpers over magic build-time behavior
- use Vite-native asset imports where possible
- avoid building a hidden asset database
- only promote example-local gameplay code into a package if more than one stage benefits from it
- every new public function must have Vitest coverage

---

## 5. Stage 13 — V2 Polish + Docs Sync

**Status:** ✅ Complete.

### Goal

Stabilize the current V2 surface before adding new feature area complexity.

### Deliverables

- audit all repo docs for V2 accuracy:
  - `README.md`
  - `AGENTS.md`
  - `CLAUDE.md`
  - `CONTRIBUTING.md`
  - package READMEs
- fix any stale API descriptions, stage references, or example instructions
- add a short "current capabilities" matrix to the root docs
- tighten teardown / cleanup patterns in the example where needed
- add missing tests for any public API gaps discovered during the audit

### Why this stage exists

V3 will add more moving parts. The engine should not enter that work with drift between the docs, package READMEs, and the real code.

### Completion notes

Stage 13 closed the main V2 documentation drift:

- root docs now agree that V2 Stages 1–12 are shipped
- the root `README.md` includes a current capabilities matrix
- package docs were refreshed where the shipped API had outgrown the docs, especially `packages/physics/README.md`
- `pnpm test`, `pnpm typecheck`, and `pnpm build` were rerun from repo root as part of the closeout
- example teardown paths were audited; no obvious Stage 13 cleanup bug required a code change

### Acceptance criteria

- all root docs agree that V2 Stages 1–12 are complete
- package docs describe current public APIs accurately
- `pnpm test`, `pnpm typecheck`, and `pnpm build` pass from repo root
- no obvious scene teardown leaks remain in the example

---

## 6. Stage 14 — Renderer Upgrade for Real Assets

**Status:** ✅ Complete.

### Goal

Improve the renderer so textures and imported models look correct by default.

### Deliverables

- extend `createRenderer()` options for:
  - clear color / background control
  - device pixel ratio limits
  - shadow map enable/disable
  - color space defaults appropriate for modern Three.js
- document recommended lighting defaults for physically based materials
- add optional helpers for:
  - environment lighting / scene background
  - directional shadow setup
- verify resize behavior and canvas sizing for both auto-created and provided canvases

### Why this stage exists

Texture and model support will feel bad if the renderer still behaves like a minimal cube-demo renderer.

### Completion notes

Stage 14 upgraded the renderer foundation without adding the Stage 15 texture pipeline yet:

- `createRenderer()` now supports clear color, scene background, max pixel ratio, shadow map configuration, and modern color-space defaults
- resize behavior was tightened for both auto-created canvases and provided canvases
- `@arcane-engine/renderer` now exports `addEnvironmentLighting()` and `addDirectionalShadowLight()` as small lighting helpers
- `hello-cube` and the starter template now use the improved renderer config path and demonstrate the recommended lighting / shadow setup
- new renderer APIs have JSDoc and Vitest coverage
- `pnpm test`, `pnpm typecheck`, and `pnpm build` were rerun from the repo root as part of closeout

This stage intentionally stopped short of adding an official texture loader or texture-backed validation scene. Real texture workflow validation begins in Stage 15.

### Acceptance criteria

- a textured sample scene renders with correct color and no obvious washed-out output
- shadows are opt-in and work in a simple test scene
- renderer options remain understandable in one pass
- new public renderer APIs have tests and JSDoc

---

## 7. Stage 15 — Texture Pipeline

**Status:** ✅ Complete.

### Goal

Arcane Engine can load and reuse textures as a first-class workflow.

### Deliverables

**New package:** `packages/assets`

Initial texture APIs:

```ts
loadTexture(ctx, source, options?): Promise<THREE.Texture>
createTextureCache(): AssetCache
disposeAssetCache(cache): void
```

Optional material helpers for common cases:

- color/albedo map
- normal map
- roughness map
- metalness map
- emissive map

V3 texture scope should cover:

- PNG / JPEG / WebP
- repeat / clamp and filtering options
- cache reuse so the same texture is not loaded many times
- disposal guidance on scene teardown

### Example usage target

- textured walls and floor in `hello-cube`
- textured crate / barrel / prop examples
- starter docs showing "how to put a texture on a mesh"

### Acceptance criteria

- one scene can load multiple textures with caching
- reusing a texture across entities does not duplicate GPU resources unnecessarily
- teardown can release cached assets cleanly
- docs explain the workflow in beginner-friendly language

### Completion notes

Stage 15 added the first official asset workflow without jumping ahead to model loading:

- `packages/assets` now exists with `loadTexture(...)`, `createTextureCache()`, and `disposeAssetCache(...)`
- texture loading supports explicit repeat / clamp wrapping, filtering, and color-space handling
- cache reuse prevents the same texture source from being loaded repeatedly
- `hello-cube` gameplay now validates the workflow with textured floor and wall materials
- starter docs explain the “import a file, load it, assign it, dispose the cache” path in one pass
- Stage 16 model loading is still intentionally separate

---

## 8. Stage 16 — 3D Model Loading (glTF / GLB)

**Status:** ✅ Complete.

### Goal

Arcane Engine can import and spawn external 3D objects instead of relying only on procedural geometry.

### Deliverables

Add model-loading support in `packages/assets`:

```ts
loadModel(cache, source): Promise<ModelAsset>
spawnModel(world, ctx, modelAsset, options?): Entity
```

Where `ModelAsset` should support:

- cloning for multiple instances
- access to the loaded Three.js scene graph
- optional metadata about animations and named nodes

Recommended V3 supported format:

- **glTF / GLB only**

Not in scope for V3 default:

- FBX
- OBJ/MTL
- Blender-native import

### API behavior expectations

- spawning a model should create the entity/components needed for transforms and rendering
- multiple spawns from one loaded model should share source asset data where safe
- the docs should explain how imported models relate to ECS entities

### Acceptance criteria

- `hello-cube` can place at least 2 imported `.glb` props in the world
- at least one imported model can be instanced multiple times
- loading failures produce readable errors
- the starter and docs include a minimal "drop in a `.glb` and spawn it" example

### Completion notes

Stage 16 turned imported props into an official workflow without jumping ahead
to animation playback:

- `packages/assets` now exports `loadModel(cache, source)` and `spawnModel(world, ctx, modelAsset, options?)`
- the shared `AssetCache` now covers model source reuse as well as textures
- Stage 16 supports **glTF / GLB only**
- `hello-cube` gameplay now places imported crystal props from one repo-local `.glb`, including reused spawns from one loaded source
- starter and package docs now explain the "drop in a `.glb`, load it, spawn it, dispose the cache" path in one pass
- Stage 17 animation playback is still intentionally separate

---

## 9. Stage 17 — Animation Playback

### Goal

If a loaded model includes animation clips, the engine can play them in a simple, explicit way.

### Deliverables

Add animation support in `packages/assets`:

- `AnimationPlayer` component or equivalent asset-aware helper
- `animationSystem(dt)` or equivalent system factory
- clip selection by name
- play / stop / loop
- simple crossfade support

### Scope rules

This stage is for **playback**, not a full animation state machine product.

Good V3 scope:

- idle / walk / attack clip switching
- looped and one-shot clips
- explicit APIs

Out of scope:

- blend trees
- retargeting
- animation graph editor

### Acceptance criteria

- `hello-cube` includes at least one animated imported model
- a clip can be switched by gameplay state
- the API remains small enough for a coding agent to use from docs alone

---

## 10. Stage 18 — Gameplay Primitives Extraction

### Goal

Promote only the most proven gameplay pieces out of the example so asset-ready projects do not need to copy as much boilerplate.

### Deliverables

Evaluate example-local systems/components and promote a minimal subset into an optional reusable package or stable example helpers:

Candidate primitives:

- `Health`
- `Damage`
- reusable HUD helpers
- `GameState`
- trigger / damage-zone helpers
- common FPS spawn/loadout helpers

### Decision rule

Do **not** create `packages/gameplay` unless at least two separate example/template paths benefit clearly. If promotion is premature, keep the code in example-local shared modules and document that choice.

### Acceptance criteria

- repeated gameplay code is reduced meaningfully
- package boundaries stay clean
- promoted APIs feel general, not overfit to `hello-cube`

---

## 11. Stage 19 — Prefabs, Scene Assets, and Preload Flow

### Goal

Make content-heavy scenes easier to author without inventing a full editor.

### Deliverables

Introduce a light-weight scene asset workflow:

- scene preload helpers
- named asset manifest per scene
- prefab/model spawn helpers for repeated props
- loading progress hooks for a simple loading overlay

Possible shape:

```ts
const assets = await preloadAssets(cache, {
  floor: '/assets/floor_albedo.webp',
  crate: '/assets/crate.glb',
});
```

Scene-level ergonomics should support:

- preload, then setup
- repeated prop spawning from a single loaded asset
- predictable teardown

### Acceptance criteria

- a scene can declare its assets in one place
- loading state is visible to the player
- repeated props are easy to spawn without ad hoc loading code scattered through setup

---

## 12. Stage 20 — Multiplayer Feel Polish

### Goal

Keep the current relay architecture, but make multiplayer feel cleaner and more usable.

### Deliverables

- interpolation or smoothing for remote ghost movement
- cleaner remote spawn/despawn handling
- reconnect / disconnect UX improvements
- HUD connection state and latency visibility
- optional remote-name labels or color identity improvements

### Explicit non-goals

- authoritative server
- rollback netcode
- matchmaking
- persistent player accounts

### Acceptance criteria

- remote players no longer snap harshly under normal local testing
- disconnects and reconnects are understandable to the player
- relay protocol stays small and documented

---

## 13. Stage 21 — Hello Cube Becomes a Vertical Slice

### Goal

Turn `examples/hello-cube` from a proof-of-features demo into a polished sample project that demonstrates the V3 engine direction.

### Deliverables

Upgrade the example to include:

- textured environment materials
- imported `.glb` props
- at least one animated model
- more cohesive art direction
- a better title / instructions flow
- a scene-loading / preload path
- retained local FPS mode and multiplayer mode

The sample should still remain readable and modest in size. It should feel like a **teaching vertical slice**, not a content dump.

### Acceptance criteria

- the example demonstrates every major V3 feature in one walkthrough
- code remains easy to skim
- assets are organized predictably
- no single scene setup file becomes unreasonably large

---

## 14. Stage 22 — CLI, Starter Templates, and Agent Workflow

### Goal

Make the new asset-ready engine path easy to start, and keep the repo optimized for spec-driven AI collaboration.

### Deliverables

Extend `@arcane-engine/create-arcane` with template choices such as:

- `starter` — today’s minimal ECS demo
- `fps` — current or cleaned-up V2 gameplay baseline
- `asset-ready` — textured/material/model-ready template

Docs additions:

- "How to add a texture"
- "How to add a `.glb` model"
- "How to preload a scene"
- "How to extend the starter with a new stage prompt"

Agent-oriented additions:

- a short stage template for future PRDs
- explicit guidance for Codex / Claude / Cursor style task splitting
- checklists for when to keep logic example-local vs package-level

### Acceptance criteria

- a user can scaffold an asset-ready project and run it immediately
- the template docs are enough for a new contributor to place a textured model in a scene quickly
- the repo remains easy to use as a spec-driven agent project

---

## 15. Stage 23 — Performance, Stability, and V3 Release

### Goal

Ship V3 as a coherent release instead of a pile of loosely connected features.

### Deliverables

- performance pass for asset loading and runtime memory use
- disposal tests for cached textures/models
- example bundle-size review
- docs alignment across root docs, package READMEs, starter docs, and changelog
- release prep for the next public version

### Suggested V3 performance targets

| Metric | Target |
|--------|--------|
| Time to first textured render in starter | < 15 minutes from scaffold |
| Reuse one loaded prop 20 times | no duplicate source downloads |
| Example frame rate | 60fps on a modest laptop in a representative scene |
| Asset-ready bundle discipline | keep framework additions modest and documented |

### Acceptance criteria

- root verification passes: `pnpm test`, `pnpm typecheck`, `pnpm build`
- example scenes teardown without obvious asset leaks
- docs clearly distinguish shipped V3 features from future ideas

---

## 16. Revised Full Stage List

| Stage | Name | Status | Key addition |
|------|------|--------|--------------|
| 1–12 | V1 + V2 track | ✅ complete | ECS through multiplayer FPS prototype |
| 13 | V2 Polish + Docs Sync | ✅ complete | stabilize docs, tests, teardown |
| 14 | Renderer Upgrade for Real Assets | ✅ complete | lighting, color, shadows, renderer defaults |
| 15 | Texture Pipeline | ✅ complete | texture loading, cache, material helpers |
| 16 | 3D Model Loading | ✅ complete | glTF/GLB support, model spawn helpers |
| 17 | Animation Playback | proposed | clip playback for imported models |
| 18 | Gameplay Primitives Extraction | proposed | promote proven reusable gameplay pieces |
| 19 | Prefabs, Scene Assets, and Preload Flow | proposed | manifests, preloading, repeated props |
| 20 | Multiplayer Feel Polish | proposed | smoothing, connection UX |
| 21 | Hello Cube Vertical Slice | proposed | polished sample with imported assets |
| 22 | CLI, Starter Templates, and Agent Workflow | proposed | asset-ready scaffold + stage templates |
| 23 | Performance, Stability, and V3 Release | proposed | hardening and release criteria |

---

## 17. Recommended Execution Order

V3 should be built in three arcs:

### Arc A — Stabilize and prepare

- Stage 13
- Stage 14

### Arc B — Asset pipeline

- Stage 15
- Stage 16
- Stage 17
- Stage 19

### Arc C — Productization

- Stage 18
- Stage 20
- Stage 21
- Stage 22
- Stage 23

This keeps the risky content-pipeline work off of a shaky documentation or renderer foundation.

---

## 18. Suggested Definition of Done for V3

V3 is complete when:

- Arcane Engine can load textures and `.glb` models in an official, documented way
- the example demonstrates textured and imported assets clearly
- the starter/template path includes an asset-ready option
- multiplayer remains functional and feels smoother than V2
- root docs, agent docs, and package docs all match the shipped code
- `pnpm test`, `pnpm typecheck`, and `pnpm build` pass from repo root

---

## 19. Notes for Future PRDs

If V3 succeeds, the likely V4 conversations become clearer:

- audio
- richer gameplay kits
- stronger netcode
- persistence or backend integrations
- editor tooling

Those should only come after V3 proves Arcane Engine can be both **readable** and **asset-capable** without losing its small-framework identity.
