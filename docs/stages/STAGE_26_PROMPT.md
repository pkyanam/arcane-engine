# Stage 26 — Interaction System

## Task Summary

- **task name:** Add a standard interaction system to `@arcane-engine/gameplay`
- **user outcome:** Games can mark entities as interactable, detect when the player is in range, and fire a standard "press E to interact" activation event without each game inventing its own input and prompt wiring.
- **why this work matters:** Doors, switches, terminals, pickups, and objectives all need the same activation pattern. Stage 25 added trigger volumes in `@arcane-engine/physics`; Stage 26 turns that proximity data into a reusable gameplay-level interaction workflow.
- **current shipped behavior:** `@arcane-engine/gameplay` currently ships health, damage, game state, spawn points, and a few helpers. There is no engine-level interaction primitive, no `Interactable` / `Activated` component, and no shared "focused interactable" logic.

## Read First

Read these before editing:

1. `README.md`
2. `AGENTS.md`
3. `CONTRIBUTING.md`
4. `PRDs/ARCANE_ENGINE_PRD_V4.md` — Section 6, Stage 26
5. `docs/stages/STAGE_25_PROMPT.md`
6. `packages/gameplay/README.md`
7. `packages/gameplay/package.json`
8. `packages/gameplay/src/index.ts`
9. `packages/gameplay/src/components/Health.ts`
10. `packages/gameplay/src/components/Damage.ts`
11. `packages/gameplay/src/components/GameState.ts`
12. `packages/gameplay/src/healthSystem.ts`
13. `packages/gameplay/src/gameStateSystem.ts`
14. `packages/gameplay/src/utils.ts`
15. `packages/gameplay/tests/components.test.ts`
16. `packages/gameplay/tests/healthSystem.test.ts`
17. `packages/gameplay/tests/gameStateSystem.test.ts`
18. `packages/gameplay/tests/utils.test.ts`
19. `packages/input/src/components.ts` — `InputState`
20. `packages/input/src/inputManager.ts`
21. `packages/physics/src/components.ts` — `TriggerVolume`
22. `packages/physics/src/triggerVolumeSystem.ts`
23. `packages/physics/README.md`

## In Scope

- Add `Interactable`, `Activated`, and `InInteractionRange` components in `packages/gameplay/src/components/`.
- Export those new components from `packages/gameplay/src/index.ts`.
- Add `interactionSystem(world, dt)` to `@arcane-engine/gameplay`.
- The system must read `InputState` and use `E` as the default activation key.
- The system must determine the currently focused interactable as the closest valid target.
- The system must support two proximity paths:
  - trigger-volume-backed detection when the interactable entity already has a Stage 25 `TriggerVolume`
  - distance-check fallback using `interactionRange` when no trigger volume is present
- `requiresFacing` must filter out interactables behind the player.
- Pressing `E` on the focused valid interactable must add `Activated` to that interactable entity.
- `Activated` must be treated as an event component and cleaned up so it is only visible for one tick.
- `cooldown` and one-shot interactions must work correctly using `lastActivatedAt`.
- Add `makeInteractable(world, entity, options)`, `wasActivated(world, entity)`, and `setInteractableEnabled(world, entity, enabled)`.
- Expose enough data for a HUD layer to know what the current focus is, but do not build UI rendering in this stage.
- Update `packages/gameplay/README.md` with a concrete "door switch" or similar interaction example.
- Add Vitest coverage for all new public behavior.

## Explicitly Out Of Scope

- Building a DOM prompt, HUD widget, or any other UI package behavior
- Adding new input-manager abstractions or rebinding systems
- Full item pickup, door-opening, quest, or objective logic
- Stage 27 damage zones
- Stage 32 UI rendering
- New physics features beyond consuming Stage 25 trigger data
- Refactoring existing gameplay systems unless needed for this task

## Constraints

- This work lives in `@arcane-engine/gameplay`, not `@arcane-engine/physics`.
- Keep `@arcane-engine/gameplay` usable without physics; the distance fallback is part of the contract.
- If you import from `@arcane-engine/physics`, keep that dependency optional in behavior and limited to trigger consumption.
- Components must use `defineComponent()` and stay plain objects.
- Systems must stay pure `(world, dt) => void`.
- `Activated` is event-style and must not become sticky.
- `InInteractionRange` should reflect the current valid focus data, not accumulate stale entries forever.
- Keep public docs and exports aligned.
- Update tests in `packages/gameplay/tests/` for all new APIs.
- `pnpm test`, `pnpm typecheck`, and `pnpm build` must pass from repo root.

## Suggested Approach

1. Inspect the current `@arcane-engine/gameplay` package shape and keep the new interaction API consistent with the existing component/system/util style.
2. Define the three new components first and decide where "current focused interactable" data should live so HUD code can read it later without adding UI here.
3. Implement the simplest valid target selection path using `InputState`, `Player`, `Position`, and `Interactable`.
4. Layer in Stage 25 trigger-volume support, then add the distance fallback for games without physics-backed triggers.
5. Add facing checks and cooldown handling.
6. Add `Activated` cleanup so the event only lasts one tick.
7. Write tests for focus selection, activation, disabled interactables, cooldowns, requires-facing, trigger-backed detection, and distance fallback.
8. Update the gameplay README with a short interaction example.
9. Verify with targeted gameplay tests first, then repo-wide checks.

## Verification

Use the smallest useful set first:

- `pnpm --filter @arcane-engine/gameplay test`
- `pnpm --filter @arcane-engine/gameplay typecheck`
- `pnpm --filter @arcane-engine/gameplay build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`

## Definition Of Done

- `Interactable`, `Activated`, and `InInteractionRange` are exported from `@arcane-engine/gameplay`
- `interactionSystem(world, dt)` is exported and documented
- interaction works through `E` using `InputState`
- the closest valid interactable becomes the focused target
- `requiresFacing` works
- disabled interactables are ignored
- cooldown and one-shot behavior work
- trigger-volume-backed detection works when Stage 25 triggers are present
- distance fallback works when physics is not in use
- `Activated` is visible for exactly one tick
- docs match the shipped exports
- tests cover the new public behavior
- repo verification passes

## Final Summary Checklist

After completing the work, confirm:

- [ ] what changed in `@arcane-engine/gameplay` (new components, system, utilities, exports)
- [ ] how focus data is exposed for future HUD work
- [ ] how trigger-backed detection and distance fallback both work
- [ ] what stayed intentionally out of scope (UI, door logic, pickups, damage zones)
- [ ] what docs were updated
- [ ] what verification was run
