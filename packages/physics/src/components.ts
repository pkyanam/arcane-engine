import { defineComponent } from '@arcane-engine/core';
import type { Entity } from '@arcane-engine/core';

/**
 * Describes whether an entity participates in physics simulation as a fixed
 * (immovable), dynamic (gravity + forces), or kinematic (user-controlled) body.
 *
 * - `'fixed'` — never moves; immovable collider.
 * - `'dynamic'` — driven by gravity and forces; transform synced back to ECS.
 * - `'kinematic'` — moved by the caller each frame via
 *   `body.setNextKinematicTranslation()`; not driven by gravity.  The physics
 *   system does **not** sync kinematic transforms back into ECS.
 *
 * Add alongside {@link BoxCollider} so the physics system can create a Rapier
 * rigid body for the entity.
 *
 * @example
 * addComponent(world, ground,    RigidBody, { type: 'fixed' });
 * addComponent(world, cube,      RigidBody, { type: 'dynamic' });
 * addComponent(world, platform,  RigidBody, { type: 'kinematic' });
 */
export const RigidBody = defineComponent<{ type: 'fixed' | 'dynamic' | 'kinematic' }>(
  'RigidBody',
  () => ({ type: 'dynamic' }),
);

/**
 * Axis-aligned box collider expressed as half-extents (metres).
 *
 * A half-extent of 0.5 on each axis produces a 1 m × 1 m × 1 m collision box.
 *
 * Optional `restitution` (bounciness, 0–1) and `friction` (0–1) tune the
 * surface material.  Both default to Rapier's built-in values when omitted.
 *
 * Add alongside {@link RigidBody} so the physics system can attach a collider
 * to the entity's Rapier body.
 *
 * @example
 * // 1 × 1 × 1 cube collider with a slight bounce
 * addComponent(world, cube, BoxCollider, { hx: 0.5, hy: 0.5, hz: 0.5, restitution: 0.3 });
 *
 * // Wide, flat ground collider
 * addComponent(world, ground, BoxCollider, { hx: 10, hy: 0.1, hz: 10, friction: 0.8 });
 */
export const BoxCollider = defineComponent<{
  hx: number;
  hy: number;
  hz: number;
  restitution?: number;
  friction?: number;
}>('BoxCollider', () => ({ hx: 0.5, hy: 0.5, hz: 0.5 }));

/**
 * Internal component written by {@link physicsSystem} to store the Rapier
 * rigid body handle for an entity.
 *
 * Do not add or modify this component directly.  The physics system manages it
 * automatically when an entity has both {@link RigidBody} and {@link BoxCollider}.
 */
export const RapierBodyRef = defineComponent<{ handle: number }>(
  'RapierBodyRef',
  () => ({ handle: -1 }),
);

/**
 * Internal component written by {@link triggerVolumeSystem} to store the Rapier
 * sensor collider handle for a trigger volume entity.
 *
 * Do not add or modify this component directly. The trigger volume system
 * manages it automatically when an entity has {@link TriggerVolume} and
 * {@link Position}.
 */
export const RapierColliderRef = defineComponent<{ handle: number }>(
  'RapierColliderRef',
  () => ({ handle: -1 }),
);

/**
 * Sensor-backed trigger volume for proximity checks.
 *
 * Add this alongside {@link Position}. {@link triggerVolumeSystem} creates and
 * updates the Rapier sensor collider, then fills the `entities`, `entered`, and
 * `exited` sets each tick.
 *
 * Read these sets in gameplay systems, but do not write to them directly.
 */
export const TriggerVolume = defineComponent<{
  shape: 'box' | 'sphere';
  hx: number;
  hy: number;
  hz: number;
  radius: number;
  entities: Set<Entity>;
  entered: Set<Entity>;
  exited: Set<Entity>;
}>('TriggerVolume', () => ({
  shape: 'box',
  hx: 0.5,
  hy: 0.5,
  hz: 0.5,
  radius: 0.5,
  entities: new Set<Entity>(),
  entered: new Set<Entity>(),
  exited: new Set<Entity>(),
}));

/**
 * FPS-style character motor backed by Rapier’s kinematic character controller.
 *
 * Add on a **kinematic** {@link RigidBody} with {@link BoxCollider}, {@link Position},
 * and {@link FPSCamera} from `@arcane-engine/input`. Drive movement with
 * {@link characterControllerSystem}.
 *
 * `grounded` is overwritten each tick. `_velocityY` stores vertical speed between
 * frames for gravity and jumping — do not assign it manually.
 *
 * @example
 * addComponent(world, player, CharacterController, {
 *   speed: 5,
 *   jumpSpeed: 6,
 *   grounded: false,
 *   _velocityY: 0,
 * });
 */
export const CharacterController = defineComponent<{
  /** Horizontal move speed in m/s. */
  speed: number;
  /** Upward velocity applied when jumping, in m/s. */
  jumpSpeed: number;
  /** Whether the controller detected ground contact last solve. */
  grounded: boolean;
  /**
   * Internal vertical velocity (m/s) used for gravity and jumps.
   * @internal
   */
  _velocityY: number;
}>('CharacterController', () => ({
  speed: 5,
  jumpSpeed: 6,
  grounded: false,
  _velocityY: 0,
}));
