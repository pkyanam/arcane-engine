import { getComponent, query } from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';
import { Position } from '@arcane-engine/renderer';
import { Controllable, FPSCamera, InputState } from './components.js';

/**
 * Create a first-person movement system.
 *
 * Unlike the world-axis {@link movementSystem}, this system moves controllable
 * entities **relative to their look direction** (`FPSCamera.yaw`):
 *
 * - W / ArrowUp — move forward along the yaw direction
 * - S / ArrowDown — move backward
 * - D / ArrowRight — strafe right
 * - A / ArrowLeft — strafe left
 * - No vertical (Y) movement — gravity and jumping are handled by the
 *   character controller (Stage 9).
 *
 * The entity must have all three of {@link Controllable}, {@link Position},
 * and {@link FPSCamera}.  Entities missing any of those components are skipped.
 *
 * @param speed  Horizontal movement speed in metres per second.  Defaults to 5.
 *
 * @example
 * registerSystem(world, fpsMovementSystem(5));
 */
export const fpsMovementSystem = (speed = 5): SystemFn =>
  (world: World, dt: number): void => {
    const inputEntities = query(world, [InputState]);
    if (!inputEntities.length) return;

    const input = getComponent(world, inputEntities[0], InputState)!;

    for (const entity of query(world, [Controllable, Position, FPSCamera])) {
      const pos = getComponent(world, entity, Position)!;
      const cam = getComponent(world, entity, FPSCamera)!;

      // Derive horizontal direction vectors from yaw.
      // At yaw = 0, forward = (0, 0, -1) which matches Three.js default -Z look.
      const fx = -Math.sin(cam.yaw);
      const fz = -Math.cos(cam.yaw);
      // Right is forward rotated 90° clockwise around Y: (fz rotated) → (cos, -sin)
      const rx = -fz;  // cos(yaw)
      const rz = fx;   // -sin(yaw)

      if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) {
        pos.x += fx * speed * dt;
        pos.z += fz * speed * dt;
      }
      if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) {
        pos.x -= fx * speed * dt;
        pos.z -= fz * speed * dt;
      }
      if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) {
        pos.x += rx * speed * dt;
        pos.z += rz * speed * dt;
      }
      if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) {
        pos.x -= rx * speed * dt;
        pos.z -= rz * speed * dt;
      }
    }
  };
