# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **`@arcane-engine/assets`**: Stage 17 animation playback via `AnimationPlayer`, `animationSystem()`, `playAnimation(...)`, `stopAnimation(...)`, and `getModelAnimationClipNames(...)`.
- **`examples/hello-cube`**: imported animated beacon in gameplay with a simple distance-driven clip switch between `Idle` and `Activate`.
- **`packages/assets`** tests for animation clip names, playback controls, fades, and failure handling.

### Changed

- **`spawnModel(...)`** now auto-attaches an `AnimationPlayer` when the loaded model includes clips, while keeping the same Stage 16 load-once, spawn-many workflow.
- **Starter docs** and **package docs** now include the “drop in an animated `.glb` / `.gltf`, register `animationSystem()`, play a named clip” path.

### Docs

- Root docs, agent docs, package READMEs, and starter docs now describe Stage 17 as shipped and point the default next step at **Stage 18: Gameplay Primitives Extraction**.
- **PRD V3** now marks Stage 17 complete and records the shipped animation workflow.

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
