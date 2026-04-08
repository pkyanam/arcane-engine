# @arcane-engine/gameplay

Core gameplay primitives for Arcane Engine: health, damage, damage zones, interaction, game state, spawn points, and helper functions.

## Install

```sh
pnpm add @arcane-engine/gameplay
```

`@arcane-engine/core` is a peer dependency — make sure it's installed too.

If you want to use `interactionSystem()`, your game should also have:

- `InputState` from `@arcane-engine/input`
- `Position` (and optionally `Rotation`) from `@arcane-engine/renderer`
- optional `TriggerVolume` from `@arcane-engine/physics` when you want physics-backed proximity

If you want to use `damageZoneSystem()` or `spawnDamageZone()`, your game should also have:

- `triggerVolumeSystem()` from `@arcane-engine/physics`
- `Position` from `@arcane-engine/renderer`

## What's included

### Components

| Component    | Fields                                                        | Purpose                                   |
| ------------ | ------------------------------------------------------------- | ----------------------------------------- |
| `Health`     | `current`, `max`                                              | Hit points                                |
| `Damage`     | `amount`, `source`                                            | One-shot damage event                     |
| `DamageZone` | `damagePerSecond`, `burstDamage`, `damageInterval`, `enabled`, `source` | Trigger-backed hazard rules |
| `Interactable` | `promptText`, `interactionRange`, `enabled`, `requiresFacing`, `cooldown`, `lastActivatedAt` | Standard `E` interaction target |
| `Activated`  | `activatedBy`                                                 | One-tick interaction event                |
| `InInteractionRange` | `interactableEntity`, `distance`                      | Current focused interaction target on the player |
| `GameState`  | `phase`, `customPhase`, `kills`, `score`, `elapsedTime`       | Singleton game flow state                 |
| `Hostile`    | `scoreValue`                                                  | Marks enemies (kill credit)               |
| `Player`     | _(empty)_                                                     | Tag for the player entity                 |
| `Dead`       | `killedBy`                                                    | Marker added at 0 hp                      |
| `SpawnPoint` | `id`, `x`, `y`, `z`, `yaw`                                   | Named spawn location                      |

### Systems

- **`healthSystem(world, dt)`** — processes `Damage`, updates `Health`, adds `Dead` at 0 hp, destroys non-player entities, increments `GameState.kills` for hostiles.
- **`damageZoneSystem(world, dt)`** — reads trigger membership from `TriggerVolume`, applies burst damage on entry, and throttles continuous hazard damage while targets stay inside.
- **`gameStateSystem(world, dt)`** — updates `GameState.elapsedTime`, checks win condition (all hostiles destroyed).
- **`interactionSystem(world, dt)`** — finds the closest valid interactable, writes `InInteractionRange` to the player, and adds `Activated` when the player presses `E`.

Both systems are pure ECS — no DOM, no rendering.

### Utilities

- **`dealDamage(world, target, amount, source?)`** — adds a `Damage` component to the target.
- **`spawnDamageZone(world, physicsCtx, options)`** — creates a trigger-backed hazard entity with `DamageZone`.
- **`makeInteractable(world, entity, options)`** — marks an entity as interactable with standard defaults.
- **`respawn(world, entity, spawnId?)`** — resets health, removes `Dead`, repositions to a spawn point, resets game phase for players.
- **`setDamageZoneEnabled(world, entity, enabled)`** — toggles whether a hazard is active.
- **`setInteractableEnabled(world, entity, enabled)`** — toggles whether an interactable can be focused or activated.
- **`wasActivated(world, entity)`** — returns this tick's `Activated` event data or `null`.
- **`getGameState(world)`** — returns the `GameState` data from the singleton entity.
- **`getPlayer(world)`** — returns the first entity with a `Player` component.

## Quick start

```ts
import { createWorld, createEntity, addComponent, registerSystem } from '@arcane-engine/core';
import {
  Health, Player, Hostile, GameState, SpawnPoint,
  healthSystem, gameStateSystem, dealDamage, getGameState,
} from '@arcane-engine/gameplay';

const world = createWorld();

// Create game state singleton
const gsEntity = createEntity(world);
addComponent(world, gsEntity, GameState);

// Create player
const player = createEntity(world);
addComponent(world, player, Player);
addComponent(world, player, Health, { current: 100, max: 100 });

// Create an enemy
const enemy = createEntity(world);
addComponent(world, enemy, Health, { current: 3, max: 3 });
addComponent(world, enemy, Hostile, { scoreValue: 10 });

// Register systems
registerSystem(world, healthSystem);
registerSystem(world, gameStateSystem);

// Deal damage
dealDamage(world, enemy, 3, player);

// After systems run, enemy is destroyed and kills incremented
const gs = getGameState(world);
console.log(gs?.kills); // 1
console.log(gs?.score); // 10
```

## Hazard Zone Example

This shows the standard trigger-backed hazard flow. Run the trigger system
before `damageZoneSystem()`, and run `healthSystem()` after it so the queued
`Damage` gets resolved in the same frame.

```ts
import { registerSystem } from '@arcane-engine/core';
import {
  createPhysicsContext,
  initPhysics,
  physicsSystem,
  triggerVolumeSystem,
} from '@arcane-engine/physics';
import {
  damageZoneSystem,
  healthSystem,
  spawnDamageZone,
} from '@arcane-engine/gameplay';

await initPhysics();

const physics = createPhysicsContext();
registerSystem(world, physicsSystem(physics));
registerSystem(world, triggerVolumeSystem(physics));
registerSystem(world, damageZoneSystem);
registerSystem(world, healthSystem);

spawnDamageZone(world, physics, {
  position: { x: 7.75, y: 2, z: 7.75 },
  shape: 'box',
  halfExtents: { x: 1.4, y: 2, z: 1.4 },
  damagePerSecond: 2 / 0.35,
  damageInterval: 0.35,
});
```

`burstDamage` applies once when a target enters the zone. Continuous damage uses
`damagePerSecond * damageInterval` each tick, or `damagePerSecond * dt` when
`damageInterval` is `0`. When `source` is omitted, the zone entity itself is
written to `Damage.source` so later game code can inspect which hazard dealt
the damage.

## Door Switch Example

This keeps the UI out of the gameplay package, but still exposes enough data for
your HUD to show a prompt.

```ts
import { addComponent, createEntity, getComponent, registerSystem } from '@arcane-engine/core';
import { InputState } from '@arcane-engine/input';
import { Position } from '@arcane-engine/renderer';
import {
  InInteractionRange,
  Interactable,
  Player,
  interactionSystem,
  makeInteractable,
  wasActivated,
} from '@arcane-engine/gameplay';

const inputEntity = createEntity(world);
addComponent(world, inputEntity, InputState);

const player = createEntity(world);
addComponent(world, player, Player);
addComponent(world, player, Position, { x: 0, y: 0, z: 0 });

const switchEntity = createEntity(world);
addComponent(world, switchEntity, Position, { x: 0, y: 0, z: -1.5 });
makeInteractable(world, switchEntity, {
  promptText: 'Press E to open the door',
  range: 2,
  requiresFacing: true,
  cooldown: 1,
});

registerSystem(world, interactionSystem);
registerSystem((world) => {
  const focus = getComponent(world, player, InInteractionRange);
  if (focus) {
    const interactable = getComponent(world, focus.interactableEntity, Interactable);
    console.log(interactable?.promptText);
  }

  if (wasActivated(world, switchEntity)) {
    console.log('Open the door now');
  }
});
```

`Activated` is a one-tick event. `interactionSystem()` removes old activation
events at the start of the next tick, so later systems in the same frame can
still respond to them.
