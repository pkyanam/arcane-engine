import RAPIER from '@dimforge/rapier3d-compat';
import { getComponent, query } from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';
import { FPSCamera, InputState } from '@arcane-engine/input';
import { Position } from '@arcane-engine/renderer';
import { CharacterController, RapierBodyRef, RigidBody } from './components.js';
import type { PhysicsContext } from './physicsContext.js';

/** World-space gravity along Y for the character (m/s²). */
const GRAVITY_Y = -20;

/**
 * System factory that moves kinematic bodies using Rapier’s kinematic character controller,
 * reading WASD + Space from the shared {@link InputState} entity and facing from
 * {@link FPSCamera}.
 *
 * Register **after** {@link physicsSystem} so the world has stepped before this system
 * applies the next kinematic translation, and **before** {@link fpsCameraSystem}.
 *
 * @remarks
 * **Stage 12 (multiplayer):** If several entities have {@link FPSCamera}, this system
 * currently updates every matching entity using the same {@link InputState}. Filter to
 * the local player when adding networked avatars.
 *
 * @param physCtx  Shared Rapier world from {@link createPhysicsContext}.
 *
 * @example
 * registerSystem(world, physicsSystem(physCtx));
 * registerSystem(world, characterControllerSystem(physCtx));
 * registerSystem(world, fpsCameraSystem(rendererCtx));
 */
export const characterControllerSystem = (physCtx: PhysicsContext): SystemFn => {
  const controller = physCtx.world.createCharacterController(0.01);
  controller.setUp({ x: 0, y: 1, z: 0 });
  controller.setApplyImpulsesToDynamicBodies(true);
  controller.enableSnapToGround(0.3);

  return (world: World, dt: number): void => {
    const inputEntities = query(world, [InputState]);
    if (!inputEntities.length) return;

    const input = getComponent(world, inputEntities[0], InputState)!;

    for (const entity of query(world, [
      CharacterController,
      RigidBody,
      RapierBodyRef,
      Position,
      FPSCamera,
    ])) {
      const rbComp = getComponent(world, entity, RigidBody)!;
      if (rbComp.type !== 'kinematic') continue;

      const cc = getComponent(world, entity, CharacterController)!;
      const bodyRef = getComponent(world, entity, RapierBodyRef)!;
      const pos = getComponent(world, entity, Position)!;
      const cam = getComponent(world, entity, FPSCamera)!;

      const body = physCtx.world.getRigidBody(bodyRef.handle);
      if (!body || body.numColliders() < 1) continue;

      const collider = body.collider(0);

      const fx = -Math.sin(cam.yaw);
      const fz = -Math.cos(cam.yaw);
      const rx = -fz;
      const rz = fx;

      let vx = 0;
      let vz = 0;
      if (input.keys.has('KeyW')) {
        vx += fx * cc.speed;
        vz += fz * cc.speed;
      }
      if (input.keys.has('KeyS')) {
        vx -= fx * cc.speed;
        vz -= fz * cc.speed;
      }
      if (input.keys.has('KeyD')) {
        vx += rx * cc.speed;
        vz += rz * cc.speed;
      }
      if (input.keys.has('KeyA')) {
        vx -= rx * cc.speed;
        vz -= rz * cc.speed;
      }

      if (cc.grounded) {
        cc._velocityY = 0;
      } else {
        cc._velocityY += GRAVITY_Y * dt;
      }

      if (input.keys.has('Space') && cc.grounded) {
        cc._velocityY = cc.jumpSpeed;
      }

      let dyy = cc._velocityY * dt;
      // Tiny downward probe so snap-to-ground and computedGrounded() stay stable when idle on a floor.
      if (cc.grounded && cc._velocityY <= 0 && !input.keys.has('Space')) {
        dyy -= 0.1 * dt;
      }

      const desired = new RAPIER.Vector3(vx * dt, dyy, vz * dt);
      controller.computeColliderMovement(collider, desired);
      const corrected = controller.computedMovement();

      pos.x += corrected.x;
      pos.y += corrected.y;
      pos.z += corrected.z;

      body.setNextKinematicTranslation({ x: pos.x, y: pos.y, z: pos.z });
      cc.grounded = controller.computedGrounded();
    }
  };
};
