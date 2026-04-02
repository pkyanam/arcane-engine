import type { Entity } from '@arcane-engine/core';
import type { PhysicsContext } from './physicsContext.js';

/**
 * Resolve a Rapier collider handle back to the ECS entity that owns it.
 *
 * This works for both rigid-body colliders created by {@link physicsSystem}
 * and sensor colliders created by {@link triggerVolumeSystem}.
 */
export function getEntityByColliderHandle(
  ctx: PhysicsContext,
  handle: number,
): Entity | undefined {
  return ctx.colliderEntities.get(handle);
}

export function registerColliderEntityHandle(
  ctx: PhysicsContext,
  handle: number,
  entity: Entity,
): void {
  ctx.colliderEntities.set(handle, entity);
}
