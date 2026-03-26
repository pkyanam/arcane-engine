import { destroyEntity, getComponent, query, removeComponent } from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';
import { MeshRef } from '@arcane-engine/renderer';
import type { RendererContext } from '@arcane-engine/renderer';
import { RapierBodyRef } from '@arcane-engine/physics';
import type { PhysicsContext } from '@arcane-engine/physics';
import { Damage } from './components/damage.js';
import { Health } from './components/health.js';

/**
 * Applies {@link Damage}, removes it, and destroys entities at 0 hp.
 * Removes Rapier bodies and scene meshes when present.
 */
export const healthSystem = (
  physCtx: PhysicsContext,
  rendererCtx: RendererContext,
): SystemFn => {
  return (world: World): void => {
    for (const entity of query(world, [Health, Damage])) {
      const health = getComponent(world, entity, Health)!;
      const damage = getComponent(world, entity, Damage)!;
      health.current -= damage.amount;
      removeComponent(world, entity, Damage);

      if (health.current > 0) continue;

      const meshRef = getComponent(world, entity, MeshRef);
      if (meshRef?.mesh) {
        rendererCtx.scene.remove(meshRef.mesh);
      }

      const bodyRef = getComponent(world, entity, RapierBodyRef);
      if (bodyRef) {
        const body = physCtx.world.getRigidBody(bodyRef.handle);
        if (body) {
          physCtx.world.removeRigidBody(body);
        }
      }

      destroyEntity(world, entity);
    }
  };
};
