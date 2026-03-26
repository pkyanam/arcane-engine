import { defineComponent } from '@arcane-engine/core';

/**
 * Describes whether an entity participates in physics simulation as a fixed
 * (immovable) or dynamic (gravity + forces) body.
 *
 * Add alongside {@link BoxCollider} so the physics system can create a Rapier
 * rigid body for the entity.
 *
 * @example
 * addComponent(world, ground, RigidBody, { type: 'fixed' });
 * addComponent(world, cube,   RigidBody, { type: 'dynamic' });
 */
export const RigidBody = defineComponent<{ type: 'fixed' | 'dynamic' }>(
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
