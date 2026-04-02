# Stage 24 — Gameplay Package: Core Primitives

## Task Summary

- **task name:** Create `@arcane-engine/gameplay` package with promoted gameplay primitives
- **user outcome:** Games built on Arcane Engine start with health, damage, game state, spawn points, and helper functions instead of copy-pasting from `examples/hello-cube`
- **why this work matters:** `Health`, `Damage`, and `GameState` have been stable since V2 but are stuck as example-local code. Every new project has to copy boilerplate. Promoting them unblocks the rest of V4 (triggers, interaction, damage zones, scoring, weapons all depend on this package).
- **current shipped behavior:** `Health`, `Damage`, `GameState`, `ShootableTarget`, and `HitFlash` components plus `healthSystem` and `gameStateSystem` live in `examples/hello-cube/src/`. They are not importable by other projects.

## Read First

1. `README.md`
2. `CLAUDE.md`
3. `CONTRIBUTING.md`
4. `PRDs/ARCANE_ENGINE_PRD_V4.md` — Section 4 (Stage 24)
5. `examples/hello-cube/src/components/health.ts`
6. `examples/hello-cube/src/components/damage.ts`
7. `examples/hello-cube/src/components/gameState.ts`
8. `examples/hello-cube/src/components/shootableTarget.ts`
9. `examples/hello-cube/src/components/hitFlash.ts`
10. `examples/hello-cube/src/healthSystem.ts`
11. `examples/hello-cube/src/gameStateSystem.ts`
12. `examples/hello-cube/src/fpsPlayerSetup.ts`
13. `packages/core/src/index.ts` — understand the ECS primitives (`defineComponent`, `Entity`, `World`, `SystemFn`, etc.)
14. `packages/core/package.json` — reference for package.json shape
15. `packages/assets/package.json` — reference for a newer package setup

## In Scope

### Package creation

- Create `packages/gameplay/` with `package.json`, `tsconfig.json`, `vitest.config.ts`, `src/index.ts`, and `README.md`
- Package name: `@arcane-engine/gameplay`
- Depends on `@arcane-engine/core` (peer dependency)
- Follow the same package structure as `packages/assets` or `packages/renderer`

### Promoted components (from hello-cube → gameplay package)

- `Health` component: `{ current: number, max: number }`
- `Damage` component: `{ amount: number, source: Entity | null }` — add `source` field for kill credit tracking (the existing hello-cube version has only `amount`)
- `GameState` component: `{ phase: 'playing' | 'paused' | 'dead' | 'win' | 'custom', customPhase: string, kills: number, score: number, elapsedTime: number }` — generalize the existing hello-cube version which has `phase: 'playing' | 'dead' | 'win'`
- `Hostile` component: `{ scoreValue: number }` — replaces `ShootableTarget` (which was an empty marker) with a more general version

### New components

- `Player` component: `{}` — tag for the player entity (enables `getPlayer()` helper)
- `Dead` component: `{ killedBy: Entity | null }` — marker added by `healthSystem` when entity reaches 0 hp
- `SpawnPoint` component: `{ id: string, x: number, y: number, z: number, yaw: number }`

### Promoted systems

- `healthSystem(world, dt)` — processes `Damage` components, updates `Health`, adds `Dead` marker at 0 hp, calls `destroyEntity` for non-`Player` entities, increments `GameState.kills` when a `Hostile` is destroyed. Read the existing `examples/hello-cube/src/healthSystem.ts` carefully and generalize it.
- `gameStateSystem(world, dt)` — updates `GameState.elapsedTime` by `dt`, syncs `GameState.playerHp` from the `Player` entity's `Health.current`. Read `examples/hello-cube/src/gameStateSystem.ts` and generalize. **Do NOT include any DOM/HUD logic** — the existing version writes to DOM elements; the package version must be pure ECS logic only.

### Utility functions

- `dealDamage(world, target, amount, source?)` — adds `Damage` component to target entity
- `respawn(world, entity, spawnId?)` — resets `Health` to max, removes `Dead`, repositions entity to the named `SpawnPoint` position, resets `GameState.phase` to `'playing'` if entity has `Player`
- `getGameState(world)` — query helper that returns the `GameState` component from the first entity that has it (singleton pattern)
- `getPlayer(world)` — query helper that returns the first `Entity` with a `Player` component

### hello-cube migration

- Update `examples/hello-cube` to import `Health`, `Damage`, `GameState`, `Hostile`, `Player`, `Dead` from `@arcane-engine/gameplay`
- Update `examples/hello-cube` to import `healthSystem`, `gameStateSystem`, `dealDamage`, `getGameState`, `getPlayer` from `@arcane-engine/gameplay`
- Remove or reduce the example-local component files that are now redundant
- `ShootableTarget` usages become `Hostile` with `scoreValue: 1`
- Keep `HitFlash` and `hitFlashRestoreSystem` example-local (visual feedback, not a gameplay primitive)
- Keep `NetworkState`, `RemotePlayer`, and all multiplayer code example-local
- Keep all DOM/HUD code example-local
- Keep `weaponSystem` example-local (promoted later in Stage 36)

### Monorepo wiring

- Add `packages/gameplay` to the root `pnpm-workspace.yaml` (if it uses a workspace file) or verify pnpm auto-discovers it
- Add `@arcane-engine/gameplay` as a dependency in `examples/hello-cube/package.json`

## Explicitly Out Of Scope

- Trigger volumes (Stage 25)
- Interaction system (Stage 26)
- Damage zones as a package primitive (Stage 27)
- Timer system (Stage 33)
- Scoring and persistence (Stage 34)
- Weapon system upgrade (Stage 36)
- UI system (Stage 35)
- Any DOM or HUD logic in the gameplay package
- Audio or VFX
- Creating the `gameplay-ready` template (Stage 37)
- Moving `weaponSystem`, `fpsArenaSetup`, `fpsSceneRuntime`, or any FPS-specific code into the package

## Constraints

- Components must use `defineComponent()` from `@arcane-engine/core`
- Systems must be pure `(world: World, dt: number) => void` functions
- `dt` is always in seconds
- `Entity` is just a number
- The gameplay package must NOT import from `@arcane-engine/renderer`, `@arcane-engine/physics`, `@arcane-engine/input`, or `@arcane-engine/assets`
- The gameplay package must NOT touch the DOM
- `@arcane-engine/core` is a peer dependency, not a bundled dependency
- `hello-cube` must still build and run correctly after migration
- All existing tests must continue to pass

## Suggested Approach

1. **Inspect the existing implementation first.** Read every file listed in "Read First" above. Understand how `healthSystem` and `gameStateSystem` currently work, including their DOM dependencies.
2. **Create the package scaffold.** Set up `packages/gameplay/` by modeling it on `packages/assets/` or another existing package. Get `package.json`, `tsconfig.json`, and the build working.
3. **Write the components.** Port `Health`, `Damage`, `GameState` from hello-cube, generalize them, and add `Player`, `Dead`, `Hostile`, `SpawnPoint`. Export everything from `src/index.ts`.
4. **Write the systems.** Port `healthSystem` and `gameStateSystem`, stripping DOM logic. The package versions should be pure ECS.
5. **Write the utility functions.** `dealDamage`, `respawn`, `getGameState`, `getPlayer`.
6. **Write tests.** Vitest coverage for every exported component, system, and function.
7. **Write the README.** Explain what the package provides, show a minimal usage example, document each export.
8. **Migrate hello-cube.** Update imports, replace `ShootableTarget` with `Hostile`, wire in the package systems. The example's `gameStateSystem` may still need a thin wrapper that calls the package version AND does DOM updates.
9. **Verify.** Run `pnpm test`, `pnpm typecheck`, `pnpm build` from repo root. Run `pnpm --filter hello-cube dev` and verify the game still works.

## Verification

```sh
pnpm test
pnpm typecheck
pnpm build
pnpm --filter hello-cube dev   # manual: title → gameplay → shoot targets → verify kills/health/death/win
```

## Definition Of Done

- `packages/gameplay/` exists with a working `package.json`, build, and README
- `Health`, `Damage`, `GameState`, `Hostile`, `Player`, `Dead`, `SpawnPoint` are exported from `@arcane-engine/gameplay`
- `healthSystem` and `gameStateSystem` are exported and work as pure ECS systems (no DOM)
- `dealDamage`, `respawn`, `getGameState`, `getPlayer` are exported and tested
- all new exports have Vitest coverage and JSDoc
- `examples/hello-cube` imports from `@arcane-engine/gameplay` instead of local component copies
- `hello-cube` builds, runs, and plays correctly (title → gameplay → FPS → multiplayer all still work)
- `ShootableTarget` is replaced by `Hostile` throughout hello-cube
- `pnpm test`, `pnpm typecheck`, and `pnpm build` pass from repo root
- no DOM or rendering code exists in `packages/gameplay/`

## Final Summary Checklist

After completing the work, confirm:

- [ ] what changed (new package, migrated imports, removed redundant files)
- [ ] what stayed intentionally local in hello-cube (HitFlash, weaponSystem, HUD, multiplayer, FPS helpers)
- [ ] what docs were updated (new README, any root doc changes)
- [ ] what verification was run (test, typecheck, build, manual dev server check)
