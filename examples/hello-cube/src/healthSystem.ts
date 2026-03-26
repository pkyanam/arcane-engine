import {
  destroyEntity,
  getComponent,
  hasComponent,
  query,
  removeComponent,
} from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';
import { Controllable } from '@arcane-engine/input';
import { MeshRef } from '@arcane-engine/renderer';
import type { RendererContext } from '@arcane-engine/renderer';
import { RapierBodyRef } from '@arcane-engine/physics';
import type { PhysicsContext } from '@arcane-engine/physics';
import { Damage } from './components/damage.js';
import { GameState } from './components/gameState.js';
import { Health } from './components/health.js';
import { ShootableTarget } from './components/shootableTarget.js';

/**
 * Applies {@link Damage}, removes it, and destroys entities at 0 hp.
 * Removes Rapier bodies and scene meshes when present.
 */
export const healthSystem = (
  physCtx: PhysicsContext,
  rendererCtx: RendererContext,
): SystemFn => {
  return (world: World): void => {
    const gsEnt = query(world, [GameState])[0];
    const gs = gsEnt !== undefined ? getComponent(world, gsEnt, GameState) : undefined;

    for (const entity of query(world, [Health, Damage])) {
      if (hasComponent(world, entity, Controllable) && gs?.phase === 'dead') {
        removeComponent(world, entity, Damage);
        continue;
      }

      const health = getComponent(world, entity, Health)!;
      const damage = getComponent(world, entity, Damage)!;
      health.current -= damage.amount;
      removeComponent(world, entity, Damage);

      if (health.current > 0) continue;

      if (hasComponent(world, entity, Controllable)) {
        health.current = 0;
        if (gs !== undefined) {
          gs.phase = 'dead';
        }
        continue;
      }

      if (hasComponent(world, entity, ShootableTarget) && gs !== undefined) {
        gs.kills += 1;
      }

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
