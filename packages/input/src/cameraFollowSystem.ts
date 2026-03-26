import { getComponent, query } from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';
import { Position } from '@arcane-engine/renderer';
import type { RendererContext } from '@arcane-engine/renderer';
import { Controllable, InputState } from './components.js';

/**
 * Optional tuning for the orbiting camera follow system.
 */
export interface CameraFollowOptions {
  /** Distance from the followed entity. */
  radius?: number;
  /** Mouse look sensitivity in radians per pixel. */
  sensitivity?: number;
  /** Initial up/down angle in radians. */
  initialPitch?: number;
}

/**
 * Create a system that orbits the renderer camera around the first
 * controllable entity using accumulated mouse movement.
 */
export const cameraFollowSystem = (
  ctx: RendererContext,
  options?: CameraFollowOptions,
): SystemFn => {
  const radius = options?.radius ?? 10;
  const sensitivity = options?.sensitivity ?? 0.003;
  let yaw = 0;
  let pitch = options?.initialPitch ?? 0.4;

  return (world: World, _dt: number): void => {
    const inputEntities = query(world, [InputState]);
    if (inputEntities.length) {
      const input = getComponent(world, inputEntities[0], InputState)!;
      yaw -= input.mouse.dx * sensitivity;
      pitch -= input.mouse.dy * sensitivity;
      pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch));
      input.mouse.dx = 0;
      input.mouse.dy = 0;
    }

    const controlled = query(world, [Controllable, Position]);
    if (!controlled.length) return;

    const target = getComponent(world, controlled[0], Position)!;

    ctx.camera.position.set(
      target.x + radius * Math.sin(yaw) * Math.cos(pitch),
      target.y + radius * Math.sin(pitch),
      target.z + radius * Math.cos(yaw) * Math.cos(pitch),
    );
    ctx.camera.lookAt(target.x, target.y, target.z);
  };
};
