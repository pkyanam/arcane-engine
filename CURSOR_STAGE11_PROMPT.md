# Cursor Handoff — Stage 11: HUD + Game State

> **Shipped in repo.** For current work, use **[`PROMPT.md`](./PROMPT.md)** (Stage 12).

---

## Historical context (when Stage 11 was next)

**Stage 10 was complete** in the repo: `InputState.mouseButtons`, example-local `Health` / `Damage` / `HitFlash`, `weaponSystem`, `healthSystem`, `hitFlashRestoreSystem`, `findEntityByColliderHandle`, shootable targets and muzzle/hit feedback in `examples/hello-cube/scenes/fps-test.ts`. The PRD (**§7**) listed **Stage 11** before **Stage 12** multiplayer.

If tests fail on `main` or you disagree with scope, fix or re-scope before building HUD.

---

## Mandatory: read these docs first (in order)

Do **not** write code until you have skimmed or read:

| Order | File | Why |
|-------|------|-----|
| 1 | [`CLAUDE.md`](./CLAUDE.md) | Monorepo layout, package APIs, stage baseline, system order |
| 2 | [`AGENTS.md`](./AGENTS.md) | ECS rules, testing expectations |
| 3 | [`ARCANE_ENGINE_PRD_V2.md`](./ARCANE_ENGINE_PRD_V2.md) | **§7 Stage 11** (full spec), **§6** Stage 10 (what exists), **§8** Stage 12 preview — **do not build MP in this task** |
| 4 | [`README.md`](./README.md) | Demo keys (**F** = fps-test) |
| 5 | [`CONTRIBUTING.md`](./CONTRIBUTING.md) | Conventions, verification commands |

**Implementation references (after the docs):**

- [`examples/hello-cube/scenes/fps-test.ts`](./examples/hello-cube/scenes/fps-test.ts) — register new systems, create/remove HUD DOM in `setup` / `teardown`
- [`examples/hello-cube/src/healthSystem.ts`](./examples/hello-cube/src/healthSystem.ts) — target death today; extend or add a system to increment kills / transition `GameState`
- [`examples/hello-cube/src/weaponSystem.ts`](./examples/hello-cube/src/weaponSystem.ts) — future: damage local player (PRD §7; Stage 12); for Stage 11 a **damage zone** or test hook is enough for player HP
- [`packages/input/src/components.ts`](./packages/input/src/components.ts) — `InputState.keys` for **R** respawn

---

## Context

- Root **`pnpm test`**, **`pnpm typecheck`**, **`pnpm build`** must pass before you finish.
- Keep **`GameState`**, **`gameStateSystem`**, and HUD-specific components **example-local** (`examples/hello-cube`) unless you have a strong reason to promote to core and update docs.
- **DOM HUD** only (plain `div` / CSS) — not Three.js UI meshes for this stage.
- **Do not** implement **Stage 12** (`packages/server`, `networkSyncSystem`, `scenes/multiplayer.ts`) unless the user explicitly expands scope.

---

## Stage 11 goal (from PRD §7)

- Inject **`<div id="arcane-hud">`** (or equivalent stable id) over the canvas; **remove it in `teardown`**.
- **Crosshair**: small CSS cross, viewport center, **pointer-events: none**, must not break pointer lock.
- **Health bar**: player **current / max** HP, bottom-left (or PRD-consistent placement).
- **Kill counter**: top-right; increments when a **target** is destroyed (hook where targets die — e.g. when `healthSystem` destroys an entity that had the shootable-target pattern, or a dedicated `Target` tag component).
- **`GameState`** on a **singleton entity** (or one clear entity queried first each tick):

  ```ts
  GameState: {
    kills: number;
    playerHp: number;
    phase: 'playing' | 'dead' | 'win';
  }
  ```

- **`gameStateSystem`**: drives overlays and DOM text updates (`textContent` is fine — no virtual DOM required).
  - **`dead`**: “You died — press **R** to respawn” (or PRD copy).
  - **`win`**: all targets destroyed → “You win” overlay.
  - **R** while `dead`: respawn player at start position, full HP, `phase: 'playing'`.
- **Player damage (single-player)**: PRD allows a **test mechanism** (e.g. damage zone on the floor) so the health bar moves before multiplayer.

---

## Technical notes

- **System order**: add **`gameStateSystem`** where it can read stable combat results — typically **after** `healthSystem` (same tick as kill / death updates) and **before** `renderSystem`, or immediately after `weaponSystem` / `healthSystem` depending on when you write `GameState`. Ensure **no double-increment** kills.
- **Player `Health`**: add **`Health`** to the player entity in `fps-test` if not already present; wire **`GameState.playerHp`** from it each frame or on change.
- **Win condition**: count initial targets vs destroyed, or query entities with a **`ShootableTarget`** (or reuse **`Health`** on targets only) — pick one clear rule and test it.
- **Respawn**: reset `Position`, `Health.current`, `CharacterController` / velocity fields if needed, and clear `phase`.

---

## Files you will likely create or touch

```
examples/hello-cube/
├── src/components/gameState.ts     — new (or co-located)
├── src/gameStateSystem.ts          — new
├── src/hud/…                       — optional CSS helpers
├── scenes/fps-test.ts              — HUD DOM, player Health, register systems
└── tests/                          — GameState, gameStateSystem, HUD smoke as needed
```

---

## Tests to add (minimum bar from PRD)

- **`GameState`** default / component behavior.
- **`gameStateSystem`**: mock or minimal world — phase transitions, kill increment on target death, respawn clears `dead`.
- Optional: DOM structure test (container exists, crosshair node present) if easy in Vitest/jsdom.

---

## Verification

```sh
pnpm test
pnpm typecheck
pnpm build
```

Manual: `pnpm --filter hello-cube dev`, **F**, pointer lock — crosshair visible, shoot targets and see kills, trigger death (if implemented), **R** respawn, win when all targets gone.

---

## What comes next (do not build in this task)

- **Stage 12**: `packages/server`, WebSocket relay, `networkSyncSystem`, ghost `RemotePlayer` meshes, **M** key scene — see PRD §8.

---

## Summary (checklist — Stage 11 shipped)

1. Read **CLAUDE → AGENTS → PRD §7**.  
2. Add **DOM HUD** + **`GameState`** + **`gameStateSystem`** in **hello-cube**.  
3. Extend **`fps-test`**: player **Health**, kill tracking, death/win overlays, **R** respawn, optional damage zone.  
4. Keep **`pnpm test` / typecheck / build** green.  
5. Update **PRD §9 / CLAUDE / AGENTS** when the milestone lands.

Next: **[`PROMPT.md`](./PROMPT.md)** (Stage 12).
