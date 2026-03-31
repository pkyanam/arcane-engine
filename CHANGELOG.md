# Changelog

All notable changes to this project are documented here. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- **`@arcane-engine/assets`**: Stage 16 model loading via `loadModel(cache, source)` and `spawnModel(world, ctx, modelAsset, options?)`.
- **`examples/hello-cube`**: imported `.glb` crystal props in gameplay, including multiple spawned instances from one loaded model source.
- **`packages/assets`** tests for model caching, clone/spawn behavior, disposal, and Stage 16 failure handling.

### Changed

- **`AssetCache`** now covers model source reuse as well as textures.
- **`MeshRef`** can point at a Three.js object root, not only a single mesh, so ECS transforms can move imported model roots cleanly.

### Docs

- Root docs, agent docs, package READMEs, and starter docs now describe Stage 16 as shipped and point the default next step at **Stage 17: Animation Playback**.
- Added a new **Stage 17** handoff prompt for the next work session.

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
