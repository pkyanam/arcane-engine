# Stage 27 — Damage Zone System

## Status

- **completed on:** April 7, 2026
- **result:** `@arcane-engine/gameplay` now ships trigger-backed damage zones in the repo
- **next stage:** use `docs/stages/STAGE_30_PROMPT.md` for follow-up work

This file is now a short completion record instead of an active handoff prompt.

## Shipped Outcome

- `DamageZone` now ships from `@arcane-engine/gameplay`.
- `damageZoneSystem(world, dt)` reads trigger membership from physics `TriggerVolume` data and writes `Damage` events for valid targets.
- `spawnDamageZone(...)` creates shared trigger-backed hazard entities and `setDamageZoneEnabled(...)` toggles them at runtime.
- `hello-cube` now uses the package-level damage-zone flow instead of a local box-check system.
- `packages/gameplay/README.md` now includes a hazard-zone example.
- Package tests and repo-wide verification passed when the stage landed.

## Intentionally Deferred Beyond Stage 27

- UI or VFX for hazards
- Damage resistances, armor, team filtering, or broader combat systems
- Distance-check fallback logic when physics is not in use
- Audio hooks, settings UI, or later V4 systems

## Verification

- `pnpm --filter @arcane-engine/gameplay test`
- `pnpm --filter hello-cube test`
- `pnpm --filter @arcane-engine/gameplay typecheck`
- `pnpm --filter @arcane-engine/gameplay build`
- `pnpm test`
- `pnpm typecheck`
- `pnpm build`

## Definition Of Done

- complete and shipped

## Follow-Up

The next active handoff is `docs/stages/STAGE_30_PROMPT.md`.
