import RAPIER from '@dimforge/rapier3d-compat';
import {
  addComponent,
  createEntity,
  getComponent,
  hasComponent,
  query,
} from '@arcane-engine/core';
import type { Entity, SystemFn, World } from '@arcane-engine/core';
import { Position } from '@arcane-engine/renderer';
import { getEntityByColliderHandle, registerColliderEntityHandle } from './colliderLookup.js';
import { RapierColliderRef, TriggerVolume } from './components.js';
import type { PhysicsContext } from './physicsContext.js';

export interface SpawnTriggerVolumeOptions {
  position: { x: number; y: number; z: number };
  shape: 'box' | 'sphere';
  halfExtents?: { x: number; y: number; z: number };
  radius?: number;
}

function createTriggerColliderDesc(trigger: ReturnType<typeof TriggerVolume.default>): RAPIER.ColliderDesc {
  const desc =
    trigger.shape === 'sphere'
      ? RAPIER.ColliderDesc.ball(trigger.radius)
      : RAPIER.ColliderDesc.cuboid(trigger.hx, trigger.hy, trigger.hz);

  return desc
    .setSensor(true)
    .setActiveCollisionTypes(RAPIER.ActiveCollisionTypes.ALL);
}

function syncTriggerPosition(
  ctx: PhysicsContext,
  handle: number,
  position: { x: number; y: number; z: number },
): void {
  const collider = ctx.world.getCollider(handle);
  if (!collider) return;

  const parent = collider.parent();
  if (parent) {
    parent.setTranslation(position, false);
    return;
  }

  collider.setTranslation(position);
}

/**
 * Spawn a trigger volume entity with a world-space position and shape.
 *
 * The returned entity gets {@link Position} and {@link TriggerVolume}. The
 * Rapier sensor collider is still created lazily by {@link triggerVolumeSystem}
 * on the next tick.
 */
export function spawnTriggerVolume(
  world: World,
  _ctx: PhysicsContext,
  options: SpawnTriggerVolumeOptions,
): Entity {
  const entity = createEntity(world);
  addComponent(world, entity, Position, options.position);

  if (options.shape === 'box') {
    if (!options.halfExtents) {
      throw new Error('spawnTriggerVolume: halfExtents are required for box triggers');
    }

    addComponent(world, entity, TriggerVolume, {
      shape: 'box',
      hx: options.halfExtents.x,
      hy: options.halfExtents.y,
      hz: options.halfExtents.z,
      radius: 0,
    });
    return entity;
  }

  if (options.radius === undefined) {
    throw new Error('spawnTriggerVolume: radius is required for sphere triggers');
  }

  addComponent(world, entity, TriggerVolume, {
    shape: 'sphere',
    radius: options.radius,
    hx: 0,
    hy: 0,
    hz: 0,
  });
  return entity;
}

/**
 * Return `true` when `testEntity` is currently overlapping the trigger.
 */
export function isInsideTrigger(
  world: World,
  triggerEntity: Entity,
  testEntity: Entity,
): boolean {
  return getComponent(world, triggerEntity, TriggerVolume)?.entities.has(testEntity) ?? false;
}

/**
 * Return every entity currently inside the trigger as a plain array.
 */
export function getEntitiesInTrigger(
  world: World,
  triggerEntity: Entity,
): Entity[] {
  const trigger = getComponent(world, triggerEntity, TriggerVolume);
  return trigger ? [...trigger.entities] : [];
}

/**
 * System factory that creates Rapier sensor colliders for {@link TriggerVolume}
 * components and computes enter/stay/exit sets each tick.
 *
 * Register this after {@link physicsSystem} so the trigger queries read the
 * latest collider positions from the physics world.
 */
export const triggerVolumeSystem = (ctx: PhysicsContext): SystemFn =>
  (world: World, _dt: number): void => {
    for (const entity of query(world, [TriggerVolume, Position])) {
      if (hasComponent(world, entity, RapierColliderRef)) continue;

      const position = getComponent(world, entity, Position)!;
      const trigger = getComponent(world, entity, TriggerVolume)!;

      const body = ctx.world.createRigidBody(
        RAPIER.RigidBodyDesc.fixed().setTranslation(position.x, position.y, position.z),
      );
      const collider = ctx.world.createCollider(createTriggerColliderDesc(trigger), body);

      addComponent(world, entity, RapierColliderRef, { handle: collider.handle });
      registerColliderEntityHandle(ctx, collider.handle, entity);
    }

    for (const entity of query(world, [TriggerVolume])) {
      const trigger = getComponent(world, entity, TriggerVolume)!;
      trigger.entered.clear();
      trigger.exited.clear();
    }

    for (const entity of query(world, [TriggerVolume, Position, RapierColliderRef])) {
      const position = getComponent(world, entity, Position)!;
      const trigger = getComponent(world, entity, TriggerVolume)!;
      const colliderRef = getComponent(world, entity, RapierColliderRef)!;
      const previousEntities = new Set(trigger.entities);
      const currentEntities = new Set<Entity>();

      syncTriggerPosition(ctx, colliderRef.handle, position);

      const collider = ctx.world.getCollider(colliderRef.handle);
      if (!collider) {
        trigger.entities.clear();
        continue;
      }

      ctx.world.intersectionPairsWith(collider, (otherCollider) => {
        const otherEntity = getEntityByColliderHandle(ctx, otherCollider.handle);
        if (otherEntity !== undefined && otherEntity !== entity) {
          currentEntities.add(otherEntity);
        }
      });

      for (const otherEntity of currentEntities) {
        if (!previousEntities.has(otherEntity)) {
          trigger.entered.add(otherEntity);
        }
      }

      for (const otherEntity of previousEntities) {
        if (!currentEntities.has(otherEntity)) {
          trigger.exited.add(otherEntity);
        }
      }

      trigger.entities.clear();
      for (const otherEntity of currentEntities) {
        trigger.entities.add(otherEntity);
      }
    }
  };
