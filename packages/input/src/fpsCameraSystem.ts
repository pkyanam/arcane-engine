import { getComponent, query } from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';
import { Position } from '@arcane-engine/renderer';
import type { RendererContext } from '@arcane-engine/renderer';
import { FPSCamera, InputState } from './components.js';

/** Maximum vertical look angle (85°) in radians. */
const MAX_PITCH = (85 * Math.PI) / 180;

/** Options accepted by {@link fpsCameraSystem}. */
export interface FPSCameraOptions {
  /**
   * Mouse look sensitivity in radians per pixel.
   * @defaultValue 0.002
   */
  sensitivity?: number;
}

/**
 * Create a first-person camera system.
 *
 * Each tick the system:
 * 1. Reads `InputState.mouse.dx/dy` and applies them to `FPSCamera.yaw/pitch`.
 * 2. Clamps pitch to ±85° to prevent over-rotation.
 * 3. Positions the renderer camera at the entity's `Position` plus the
 *    `FPSCamera.height` eye offset.
 * 4. Applies yaw and pitch to the camera using Three.js `YXZ` Euler order
 *    (yaw around world Y first, then pitch around local X).
 * 5. Clears `mouse.dx/dy` so other systems do not double-consume them.
 *
 * Register this system **before** the render system and **after**
 * `characterControllerSystem` (once that exists in Stage 9).
 *
 * @param ctx      The {@link RendererContext} whose camera will be driven.
 * @param options  Optional sensitivity tuning.
 *
 * @example
 * registerSystem(world, fpsCameraSystem(rendererCtx));
 */
export const fpsCameraSystem = (
  ctx: RendererContext,
  options?: FPSCameraOptions,
): SystemFn => {
  const sensitivity = options?.sensitivity ?? 0.002;

  return (world: World, _dt: number): void => {
    // Consume mouse delta even if there is no FPSCamera entity, so that
    // accumulated deltas do not bleed into the next system that reads them.
    const inputEntities = query(world, [InputState]);
    if (!inputEntities.length) return;
    const input = getComponent(world, inputEntities[0], InputState)!;

    const cameraEntities = query(world, [FPSCamera, Position]);
    if (!cameraEntities.length) {
      input.mouse.dx = 0;
      input.mouse.dy = 0;
      return;
    }

    const entity = cameraEntities[0];
    const cam = getComponent(world, entity, FPSCamera)!;
    const pos = getComponent(world, entity, Position)!;

    // Update look angles from accumulated mouse movement.
    cam.yaw -= input.mouse.dx * sensitivity;
    cam.pitch -= input.mouse.dy * sensitivity;
    cam.pitch = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, cam.pitch));

    // Clear deltas so no other consumer double-reads them.
    input.mouse.dx = 0;
    input.mouse.dy = 0;

    // Position camera at entity eye level.
    ctx.camera.position.set(pos.x, pos.y + cam.height, pos.z);

    // YXZ order: yaw (Y) applied first, then pitch (X), no roll (Z).
    ctx.camera.rotation.set(-cam.pitch, cam.yaw, 0, 'YXZ');
  };
};
