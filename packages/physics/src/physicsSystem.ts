import RAPIER from '@dimforge/rapier3d-compat';
import { addComponent, getComponent, hasComponent, query } from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';
import { Position, Rotation } from '@arcane-engine/renderer';
import type { PhysicsContext } from './physicsContext.js';
import { BoxCollider, RapierBodyRef, RigidBody } from './components.js';
import { registerColliderEntityHandle } from './colliderLookup.js';

// ---------------------------------------------------------------------------
// Internal math helpers
// ---------------------------------------------------------------------------

/**
 * Convert XYZ Euler angles (radians) to a unit quaternion.
 * Matches the convention used by Three.js Euler with order 'XYZ'.
 */
function eulerXYZToQuat(
  ex: number,
  ey: number,
  ez: number,
): { x: number; y: number; z: number; w: number } {
  const cx = Math.cos(ex / 2);
  const sx = Math.sin(ex / 2);
  const cy = Math.cos(ey / 2);
  const sy = Math.sin(ey / 2);
  const cz = Math.cos(ez / 2);
  const sz = Math.sin(ez / 2);
  return {
    x: sx * cy * cz + cx * sy * sz,
    y: cx * sy * cz - sx * cy * sz,
    z: cx * cy * sz + sx * sy * cz,
    w: cx * cy * cz - sx * sy * sz,
  };
}

/**
 * Convert a unit quaternion to XYZ Euler angles (radians).
 * Matches the convention used by Three.js Euler with order 'XYZ'.
 */
function quatToEulerXYZ(
  qx: number,
  qy: number,
  qz: number,
  qw: number,
): { x: number; y: number; z: number } {
  const sinP = 2 * (qw * qy - qz * qx);
  const ey =
    Math.abs(sinP) >= 1
      ? (Math.PI / 2) * Math.sign(sinP)
      : Math.asin(sinP);
  const ex = Math.atan2(2 * (qw * qx + qy * qz), 1 - 2 * (qx * qx + qy * qy));
  const ez = Math.atan2(2 * (qw * qz + qx * qy), 1 - 2 * (qy * qy + qz * qz));
  return { x: ex, y: ey, z: ez };
}

// ---------------------------------------------------------------------------
// System factory
// ---------------------------------------------------------------------------

/**
 * Returns a system that:
 * 1. Lazily creates Rapier rigid bodies for entities that have both
 *    {@link RigidBody} and {@link BoxCollider} but no {@link RapierBodyRef}.
 * 2. Steps the Rapier world by one fixed tick (`world.timestep`, default 1/60 s).
 * 3. Syncs the resulting transforms back into the ECS {@link Position} and
 *    {@link Rotation} components for every dynamic body.
 *
 * Register this system after spawning physics entities, and before the render
 * system, so that the renderer always reads up-to-date positions.
 *
 * @param ctx  The {@link PhysicsContext} created by `createPhysicsContext()`.
 *
 * @example
 * const physCtx = createPhysicsContext();
 * registerSystem(world, physicsSystem(physCtx));
 * registerSystem(world, renderSystem(rendererCtx));
 */
export const physicsSystem = (ctx: PhysicsContext): SystemFn =>
  (world: World, _dt: number): void => {
    // -----------------------------------------------------------------------
    // 1. Lazy body + collider creation
    // -----------------------------------------------------------------------
    for (const entity of query(world, [RigidBody, BoxCollider])) {
      if (hasComponent(world, entity, RapierBodyRef)) continue;

      const rigidBodyComp = getComponent(world, entity, RigidBody)!;
      const boxCollider = getComponent(world, entity, BoxCollider)!;
      const pos = getComponent(world, entity, Position);
      const rot = getComponent(world, entity, Rotation);

      // Build rigid body descriptor
      let bodyDesc =
        rigidBodyComp.type === 'fixed'     ? RAPIER.RigidBodyDesc.fixed() :
        rigidBodyComp.type === 'kinematic' ? RAPIER.RigidBodyDesc.kinematicPositionBased() :
                                             RAPIER.RigidBodyDesc.dynamic();

      if (pos) {
        bodyDesc = bodyDesc.setTranslation(pos.x, pos.y, pos.z);
      }
      if (rot) {
        bodyDesc = bodyDesc.setRotation(eulerXYZToQuat(rot.x, rot.y, rot.z));
      }

      const body = ctx.world.createRigidBody(bodyDesc);

      // Build collider descriptor (half-extents)
      const colliderDesc = RAPIER.ColliderDesc.cuboid(
        boxCollider.hx,
        boxCollider.hy,
        boxCollider.hz,
      );
      if (boxCollider.restitution !== undefined) {
        colliderDesc.setRestitution(boxCollider.restitution);
      }
      if (boxCollider.friction !== undefined) {
        colliderDesc.setFriction(boxCollider.friction);
      }
      const collider = ctx.world.createCollider(colliderDesc, body);
      registerColliderEntityHandle(ctx, collider.handle, entity);

      addComponent(world, entity, RapierBodyRef, { handle: body.handle });
    }

    // -----------------------------------------------------------------------
    // 2. Step the simulation
    // -----------------------------------------------------------------------
    ctx.world.step();

    // -----------------------------------------------------------------------
    // 3. Sync dynamic body transforms back into ECS
    // -----------------------------------------------------------------------
    for (const entity of query(world, [RapierBodyRef, Position])) {
      const bodyRef = getComponent(world, entity, RapierBodyRef)!;
      const body = ctx.world.getRigidBody(bodyRef.handle);

      // Only dynamic bodies are driven by the simulation; skip fixed and kinematic.
      if (!body || !body.isDynamic()) continue;

      const translation = body.translation();
      const pos = getComponent(world, entity, Position)!;
      pos.x = translation.x;
      pos.y = translation.y;
      pos.z = translation.z;

      const rot = getComponent(world, entity, Rotation);
      if (rot) {
        const q = body.rotation();
        const euler = quatToEulerXYZ(q.x, q.y, q.z, q.w);
        rot.x = euler.x;
        rot.y = euler.y;
        rot.z = euler.z;
      }
    }
  };
