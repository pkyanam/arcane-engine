import type { Entity, World } from '@arcane-engine/core';
import { getEntityByColliderHandle } from '@arcane-engine/physics';
import type { PhysicsContext } from '@arcane-engine/physics';

/**
 * Map a Rapier collider handle from {@link raycast} to the owning ECS entity.
 */
export function findEntityByColliderHandle(
  _world: World,
  physCtx: PhysicsContext,
  colliderHandle: number,
): Entity | undefined {
  return getEntityByColliderHandle(physCtx, colliderHandle);
}
