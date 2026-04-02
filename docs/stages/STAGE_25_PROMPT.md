# Stage 25 — Trigger Volume System

## Task Summary

- **task name:** Add trigger volumes to `@arcane-engine/physics`
- **user outcome:** Games can detect when entities enter, stay in, or leave spatial regions using Rapier sensor colliders — enabling doors, pickups, objectives, damage zones, and alert radii without ad hoc distance checks.
- **why this work matters:** Nearly every game needs proximity detection. Without a standard system, every game reinvents spatial checks with scattered `Math.hypot` calls or bounding-box arithmetic. `hello-cube` already has a `damageZoneSystem` that does manual AABB checks — trigger volumes replace that pattern with physics-backed detection. Stages 26 (interaction), 27 (damage zones), and 30 (AI detection) all depend on this.
- **current shipped behavior:** No sensor or trigger support exists in `@arcane-engine/physics`. The only proximity detection is `hello-cube`'s example-local `damageZoneSystem` which manually checks if a player's `Position` falls inside a hardcoded bounding box.

## Read First

1. `README.md`
2. `CLAUDE.md`
3. `CONTRIBUTING.md`
4. `PRDs/ARCANE_ENGINE_PRD_V4.md` — Section 5 (Stage 25)
5. `packages/physics/src/index.ts` — current exports
6. `packages/physics/src/components.ts` — `BoxCollider`, `RigidBody`, `RapierBodyRef`, `CharacterController`
7. `packages/physics/src/physicsSystem.ts` — how bodies and colliders are lazily created, how the simulation is stepped, how transforms sync back
8. `packages/physics/src/physicsContext.ts` — `PhysicsContext` structure and Rapier world creation
9. `packages/physics/src/raycast.ts` — existing Rapier utility pattern
10. `packages/physics/src/characterControllerSystem.ts` — another system that reads `PhysicsContext`
11. `packages/physics/package.json` — Rapier version (`@dimforge/rapier3d-compat ^0.14.0`)
12. `packages/physics/tsconfig.json` and `packages/physics/tsconfig.build.json`
13. `packages/physics/vitest.config.ts`
14. `packages/physics/tests/physicsSystem.test.ts` — test patterns for physics systems
15. `packages/core/src/index.ts` — ECS primitives (`defineComponent`, `Entity`, `World`, `SystemFn`, `query`, etc.)
16. `examples/hello-cube/src/damageZoneSystem.ts` — the ad hoc AABB damage zone this system replaces
17. `examples/hello-cube/src/colliderLookup.ts` — example-local collider→entity mapping (this pattern should move into the package)

## In Scope

### New components (in `packages/physics/`)

- `TriggerVolume` component:
  ```
  {
    shape: 'box' | 'sphere',
    hx: number, hy: number, hz: number,   // box half-extents (used when shape is 'box')
    radius: number,                         // sphere radius (used when shape is 'sphere')
    entities: Set<Entity>,                  // currently inside this tick
    entered: Set<Entity>,                   // entered this tick
    exited: Set<Entity>,                    // exited this tick
  }
  ```
  The `entities`, `entered`, and `exited` sets are managed by `triggerVolumeSystem` — users should read them but not write them.

- `RapierColliderRef` component (internal): `{ handle: number }` — stores the Rapier sensor collider handle for a trigger volume entity. Managed by the system, not user-facing.

### New system

- `triggerVolumeSystem(physCtx: PhysicsContext): SystemFn` — runs **after** `physicsSystem`. Each tick:
  1. **Lazy sensor creation:** For entities with `TriggerVolume` + `Position` that don't yet have a `RapierColliderRef`, create a Rapier sensor collider (fixed body, `setSensor(true)`) at the entity's position. Use `ColliderDesc.cuboid()` for box shape, `ColliderDesc.ball()` for sphere shape.
  2. **Clear per-tick sets:** Clear `entered` and `exited` on all `TriggerVolume` components.
  3. **Read intersection events:** Use Rapier's intersection event system to determine which colliders are currently overlapping each sensor. Map collider handles back to ECS entities.
  4. **Compute enter/stay/exit:** Compare the current set of overlapping entities against the previous `entities` set. Populate `entered` (new this tick), `exited` (gone this tick), and update `entities` (current set).

### Collider-to-entity mapping (promote from hello-cube)

- The package currently has no way to map a Rapier collider handle back to an ECS entity. `hello-cube` has an example-local `findEntityByColliderHandle` that scans all `RapierBodyRef` entities — this is O(n) and does not cover sensor colliders.
- Add an internal `Map<number, Entity>` (collider handle → entity) to `PhysicsContext` or as a module-level cache maintained by `physicsSystem` and `triggerVolumeSystem`. This map should be updated whenever a body or sensor is created.
- Export a `getEntityByColliderHandle(physCtx, handle): Entity | undefined` utility from the package.

### Utility functions

- `spawnTriggerVolume(world, physCtx, options): Entity` — creates an entity with `Position` and `TriggerVolume`, returns the entity. Options:
  ```
  {
    position: { x: number, y: number, z: number },
    shape: 'box' | 'sphere',
    halfExtents?: { x: number, y: number, z: number },  // required for 'box'
    radius?: number,                                      // required for 'sphere'
  }
  ```

- `isInsideTrigger(world, triggerEntity, testEntity): boolean` — checks if `testEntity` is in the trigger's `entities` set.

- `getEntitiesInTrigger(world, triggerEntity): Entity[]` — returns all entities currently inside the trigger as an array.

### Export updates

- Add all new components, the system, and utility functions to `packages/physics/src/index.ts`.
- Export `getEntityByColliderHandle` from the package.

### hello-cube migration

- Update `examples/hello-cube/src/colliderLookup.ts` to use the package-level `getEntityByColliderHandle` instead of its own O(n) scan. Or remove the file entirely and update `weaponSystem.ts` and `networkSyncSystem.ts` to import `getEntityByColliderHandle` from `@arcane-engine/physics`.

## Explicitly Out Of Scope

- Interaction system (Stage 26)
- Damage zone package primitive (Stage 27)
- AI detection system (Stage 30)
- `TriggerFilter` component (mentioned in PRD but not needed until Stage 26 or 27 — skip unless trivial)
- Sphere colliders for non-sensor rigid bodies (only sensor colliders need sphere support now)
- Any DOM, rendering, or HUD logic
- Moving `damageZoneSystem` into a package (Stage 27)

## Constraints

- Rapier version is `@dimforge/rapier3d-compat ^0.14.0` — do not upgrade
- Components must use `defineComponent()` from `@arcane-engine/core`
- Systems must be `(world: World, dt: number) => void` functions (or factories returning `SystemFn`)
- `triggerVolumeSystem` must run **after** `physicsSystem` so that body positions are up-to-date
- Sensor colliders must not block movement — they must use Rapier's `setSensor(true)`
- `entered` and `exited` sets must be accurate for exactly one tick (cleared at tick start)
- All existing tests must continue to pass
- `pnpm test`, `pnpm typecheck`, and `pnpm build` must pass from repo root
- The physics package must not import from `@arcane-engine/renderer`, `@arcane-engine/input`, `@arcane-engine/gameplay`, or `@arcane-engine/assets` (it currently imports `Position` and `Rotation` from `@arcane-engine/renderer` — that dependency already exists and is fine)

## Rapier Sensor API Notes

Rapier 0.14 provides two main approaches for sensor detection:

1. **Intersection events via `EventQueue`:** Create an `EventQueue`, pass it to `world.step(eventQueue)`, then iterate `eventQueue.drainIntersectionEvents((handle1, handle2, started) => ...)`. This fires when two colliders start or stop intersecting, where at least one is a sensor. This is the **recommended approach** — it is event-driven and efficient.

2. **Active intersection test:** `world.intersectionPairsWith(colliderHandle, callback)` enumerates all colliders currently intersecting a given collider. This can be used as a fallback or for querying current state.

Use approach 1 (EventQueue) as the primary mechanism. Create the EventQueue once and reuse it. The `physicsSystem` currently calls `ctx.world.step()` with no arguments — you will need to coordinate so the EventQueue is passed to `step()`. Options:
- Store the EventQueue on `PhysicsContext`
- Have `triggerVolumeSystem` create the EventQueue and modify `physicsSystem` to accept it
- Or have `triggerVolumeSystem` use `intersectionPairsWith` as a simpler polling approach if the EventQueue approach is too invasive

Choose the approach that minimizes changes to existing code while remaining correct.

## Suggested Approach

1. **Read the existing physics package thoroughly.** Understand `physicsSystem`, `PhysicsContext`, and how Rapier bodies/colliders are created.
2. **Prototype Rapier sensor detection.** Write a small test that creates a sensor collider, steps the world, and reads intersection events. This validates the Rapier API before writing production code.
3. **Add the collider→entity map.** Extend `PhysicsContext` (or add a module-level store) and update `physicsSystem` to register mappings when it creates bodies. Export `getEntityByColliderHandle`.
4. **Write `TriggerVolume` and `RapierColliderRef` components.**
5. **Write `triggerVolumeSystem`.** Lazy sensor creation, event processing, enter/stay/exit computation.
6. **Write utility functions.** `spawnTriggerVolume`, `isInsideTrigger`, `getEntitiesInTrigger`.
7. **Write tests.** Cover: sensor creation, entry detection, exit detection, multi-entity overlaps, box and sphere shapes, entities that enter and leave across multiple ticks.
8. **Update the physics package README** with a trigger volume section and usage example.
9. **Migrate hello-cube.** Replace `colliderLookup.ts` with the package-level utility.
10. **Verify.** `pnpm test`, `pnpm typecheck`, `pnpm build` from repo root.

## Verification

```sh
pnpm test
pnpm typecheck
pnpm build
```

## Definition Of Done

- `TriggerVolume` and `RapierColliderRef` components are exported from `@arcane-engine/physics`
- `triggerVolumeSystem` is exported and correctly detects entry, presence, and exit of entities
- Sensor colliders do not block movement
- `entered` and `exited` sets are per-tick accurate (not sticky or duplicated)
- Both box and sphere trigger shapes work
- Works with dynamic, kinematic, and character-controller bodies entering the trigger
- `spawnTriggerVolume`, `isInsideTrigger`, `getEntitiesInTrigger` are exported and tested
- `getEntityByColliderHandle` is exported from the physics package
- `hello-cube` uses the package-level collider lookup instead of its own
- All new exports have Vitest coverage and JSDoc
- `pnpm test`, `pnpm typecheck`, and `pnpm build` pass from repo root
- No rendering, DOM, or gameplay logic exists in the physics package additions

## Final Summary Checklist

After completing the work, confirm:

- [ ] what changed (new components, new system, new utilities, collider map, updated exports)
- [ ] what stayed the same (existing physics components, physicsSystem behavior, characterControllerSystem)
- [ ] what docs were updated (physics README, any root doc changes)
- [ ] what verification was run (test, typecheck, build)
