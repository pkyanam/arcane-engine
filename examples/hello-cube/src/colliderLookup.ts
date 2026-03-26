import { getComponent, query } from '@arcane-engine/core';
import type { Entity, World } from '@arcane-engine/core';
import { RapierBodyRef } from '@arcane-engine/physics';
import type { PhysicsContext } from '@arcane-engine/physics';

/**
 * Map a Rapier collider handle from {@link raycast} to the owning ECS entity.
 */
export function findEntityByColliderHandle(
  world: World,
  physCtx: PhysicsContext,
  colliderHandle: number,
): Entity | undefined {
  for (const entity of query(world, [RapierBodyRef])) {
    const ref = getComponent(world, entity, RapierBodyRef)!;
    const body = physCtx.world.getRigidBody(ref.handle);
    if (!body) continue;
    const n = body.numColliders();
    for (let i = 0; i < n; i++) {
      if (body.collider(i).handle === colliderHandle) return entity;
    }
  }
  return undefined;
}
