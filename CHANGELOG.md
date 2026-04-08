# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **`@arcane-engine/gameplay`** now ships trigger-backed `DamageZone` hazards, `damageZoneSystem()`, `spawnDamageZone(...)`, and `setDamageZoneEnabled(...)`, and `hello-cube` now consumes the shared gameplay hazard flow.
- **`@arcane-engine/audio`** now ships the full Stage 29 audio surface: Web Audio context setup, decoded sound caching, non-spatial SFX playback, positional SFX, `SpatialAudio`, listener syncing, music playback/crossfades, channel volume controls, autoplay-safe resume helpers, and explicit cleanup.

### Changed

- **Repo release plumbing** now includes `@arcane-engine/audio` in the root test build path and workspace lockfile metadata.
- **PRD V4** and the stage handoff docs now mark Stage 29 as shipped and point the next active roadmap step at Stage 30.

### Docs

- Root docs, agent docs, contributor guidance, and the package README now describe `@arcane-engine/audio` as a shipped workspace package with spatial audio and music support.

## [3.0.2] - 2026-04-02

### Added

- **`@arcane-engine/gameplay`** now ships the interaction layer: `Interactable`, `Activated`, `InInteractionRange`, `interactionSystem()`, and helpers for standard `Press E` activation flows.
- **`@arcane-engine/physics`** now ships trigger volumes plus collider-handle lookup helpers that gameplay systems and examples can reuse.

### Changed

- **`examples/hello-cube`** now imports the promoted gameplay primitives and trigger-backed helpers instead of carrying older local copies.
- **Repo release plumbing** now includes `@arcane-engine/gameplay` in the root test build path, aligns workspace package versions, and refreshes the scaffolder's published dependency fallback.

### Docs

- Root docs, agent docs, contributor guidance, and package READMEs now describe `@arcane-engine/gameplay` as a shipped package and keep the repo map aligned with the real workspace.

## [3.0.1] - 2026-04-01

### Changed

- Rewrote the root docs and package READMEs to focus on the working engine instead of historical roadmap stages.
- Added new beginner-focused READMEs for `@arcane-engine/core`, `@arcane-engine/input`, and `examples/hello-cube`.
- Simplified template and scaffolder docs around the three real onboarding paths: `starter`, `asset-ready`, and `hello-cube`.
- Updated agent and contributor docs to treat `PRDs/` as historical background and point contributors at the code, tests, and shipped docs first.

### Added

- **`examples/hello-cube`**: `ensurePhysicsReady()` plus scene-level physics preloads so Rapier loads when physics-backed scenes are entered instead of during app boot.
- **`packages/assets`**: Stage 23 disposal regression coverage for cached texture variants and shared model resources.
- **`@arcane-engine/create-arcane`**: explicit `--template` / `-t` support plus a shipped `asset-ready` scaffold alongside the minimal `starter`.
- **Templates**: new `templates/asset-ready` walkthrough with tiny example textures, imported `.glb` / `.gltf` assets, preload progress UI, repeated prop spawning, and animated beacon playback.
- **Docs**: `docs/STAGE_TEMPLATE.md` and `docs/AGENT_WORKFLOW.md` for future stage prompts, Codex / Claude / Cursor task splitting, and the example-local vs package-level checklist.
- **`examples/hello-cube`**: Stage 21 vertical-slice scene metadata and shared presentation helpers via `helloCubePresentation`, plus tests for the new example-local helper.
- **`@arcane-engine/server`**: Stage 20 relay polish via explicit `join` fan-out, `ping` / `pong`, and an optional `host` bind for tests or local-only setups.
- **`examples/hello-cube`**: Stage 20 multiplayer polish via smoothed remote ghost movement, ghost spawn/despawn cues, bounded reconnect handling, and a multiplayer HUD panel for relay state, peer count, and ping.
- **`@arcane-engine/assets`**: Stage 19 scene asset helpers via `preloadSceneAssets(...)`, loading-progress callbacks, and `spawnModelInstances(...)` for repeated imported props.
- **`examples/hello-cube`**: gameplay scene asset manifest, preload-before-setup flow, repeated crystal prop spawning, and a simple loading overlay during scene preload.
- **Starter runtime**: optional scene `preload()` seam so scaffolded projects can preload assets before sync scene setup when they need it.
- **`@arcane-engine/assets`**: Stage 17 animation playback via `AnimationPlayer`, `animationSystem()`, `playAnimation(...)`, `stopAnimation(...)`, and `getModelAnimationClipNames(...)`.
- **`examples/hello-cube`**: imported animated beacon in gameplay with a simple distance-driven clip switch between `Idle` and `Activate`.
- **`packages/assets`** tests for animation clip names, playback controls, fades, and failure handling.
- **`examples/hello-cube`**: shared Stage 18 FPS helpers via `fpsSceneRuntime` and `fpsPlayerSetup`, plus tests covering the new example-local public helpers.

### Changed

- **Shipped runtimes** (`hello-cube`, `starter`, and `asset-ready`) now lazy-load scene modules through the existing preload seam, reducing initial bundle cost without changing the sync `setup(world)` scene contract.
- **`examples/hello-cube`** bundle output now isolates scene code and vendor-heavy paths; the remaining large chunk is Rapier's monolithic browser build rather than the app bootstrap.
- **Starter docs** now point readers at the new `asset-ready` template when they want a concrete texture + model + preload path instead of the minimal cube baseline.
- **`packages/create-arcane/scripts/copyTemplate.mjs`** now mirrors the whole `templates/` directory into the published package, keeping multiple template sources-of-truth easy to reason about.
- **`examples/hello-cube`** now starts from a clickable command deck and carries shared scene identity/copy through preload, gameplay, FPS, multiplayer, and touch scene selection so the sample reads as one teaching vertical slice.
- **`examples/hello-cube/scenes/multiplayer.ts`** now routes relay lifecycle through a small example-local connection manager instead of holding one raw scene-level socket.
- **`examples/hello-cube/scenes/gameplay.ts`** no longer does ad hoc async asset loading inside `setup(world)`; it now consumes preloaded scene assets from one manifest-driven path.
- **Starter docs** and **package docs** now explain the Stage 19 named-manifest preload flow and the optional scene `preload()` runtime seam.
- **`spawnModel(...)`** now auto-attaches an `AnimationPlayer` when the loaded model includes clips, while keeping the same Stage 16 load-once, spawn-many workflow.
- **Starter docs** and **package docs** now include the “drop in an animated `.glb` / `.gltf`, register `animationSystem()`, play a named clip” path.
- **`fps-test`** and **`multiplayer`** now reuse one shared example-local FPS setup / teardown path instead of duplicating arena, HUD, player-rig, and muzzle-flash boilerplate.

### Docs

- Root docs, agent docs, package READMEs, template docs, and **PRD V3** now describe **Stage 23** as complete, mark V3 as closed out, and push any new work past this point into future-PRD planning instead of implicit scope growth.
- Root docs, agent docs, and **PRD V3** now describe **Stage 21** as complete and point the default next step at **Stage 22: CLI, Starter Templates, and Agent Workflow**.
- Root docs, agent docs, and **`packages/server/README.md`** now describe **Stage 20** as complete and point the default next step at **Stage 21: Hello Cube Becomes a Vertical Slice**.
- Root docs, agent docs (`AGENTS.md`, `CLAUDE.md`), package READMEs, and starter docs now describe Stage 17 as shipped and point the default next step at **Stage 18: Gameplay Primitives Extraction**.
- **PRD V3** now marks Stage 17 complete and records the shipped animation workflow.
- Root docs and agent docs now describe **Stage 18** as complete, explain why `packages/gameplay` is still intentionally unshipped, and point the default next step at **Stage 19: Prefabs, Scene Assets, and Preload Flow**.
- Root docs, agent docs, package docs, and starter docs now describe **Stage 19** as complete and point the default next step at **Stage 20: Multiplayer Feel Polish**.

## [0.2.0] — 2026-03-27

### Added

- **`@arcane-engine/server`**: WebSocket relay (`welcome`, `move`, `shoot`, `leave`), max 4 clients, Vitest coverage.
- **`examples/hello-cube`**: `scenes/multiplayer.ts` (**M**), `networkSyncSystem`, `NetworkState`, `RemotePlayer` ghosts, `weaponSystem` `onShootRelay`, shared `fpsArenaSetup` / `fpsHud` with fps-test.
- **`VITE_WS_URL`** and `resolveMultiplayerWsUrl()` for static + relay deploy (documented in README).
- **Mobile / touch**: `mobileControls` overlay (scene picker, move stick, look / jump / fire / respawn on FPS & multiplayer).
- **Vite** `server.host: true` in hello-cube for LAN dev.

### Changed

- Root **`pnpm test`** builds **`@arcane-engine/server`** before workspace tests.
- **`GameContext`** includes `getCurrentSceneName()` for mobile UI.

### Docs

- **PRD V2**: Stages 1–12 marked complete; §10 post-V2; §11 definition of done marked met.
- **README**, **AGENTS.md**, **CLAUDE.md**, **CONTRIBUTING.md** aligned with V2.0 shipped.
- Removed **`PROMPT.md`** (Stage 12 handoff — work landed).

## [0.1.0] — earlier

- Initial public monorepo: core, renderer, input, physics, create-arcane; hello-cube through fps-test (Stage 11).
