# Next agent — Stage 12 (multiplayer)

## Status

**Stages 1–11 are complete** in this repo. Single-player **fps-test** (**F**) has pointer-lock FPS, hitscan, HUD (`#arcane-hud`), `GameState`, death/win, **R** respawn, and a floor damage pad. Details: [`ARCANE_ENGINE_PRD_V2.md`](./ARCANE_ENGINE_PRD_V2.md) (see the stage table in section 9).

**Your milestone:** **Stage 12** — minimal WebSocket multiplayer (PRD **section 8**).

## Read first

1. PRD **§8** (server relay, client components, **M** scene).
2. [`AGENTS.md`](./AGENTS.md) and [`CLAUDE.md`](./CLAUDE.md) (ECS rules, package boundaries, `fps-test` system order).

## Goal (keep it small)

- Add **`packages/server`**: Node + `ws`, relay-only (no game logic on server), cap at 4 clients — match PRD message shapes.
- **Client:** new scene (e.g. **M** from title), `networkSyncSystem`-style sync, ghost meshes for remote players, wire shoot relay as PRD describes.
- **`pnpm test`**, **`pnpm typecheck`**, **`pnpm build`** must pass from repo root.

## After you ship

Update the PRD stage table, [`README.md`](./README.md), [`AGENTS.md`](./AGENTS.md), and [`CLAUDE.md`](./CLAUDE.md) so “current stage” matches code.

## Older handoffs

[`CURSOR_STAGE11_PROMPT.md`](./CURSOR_STAGE11_PROMPT.md) — Stage 11 (done).
