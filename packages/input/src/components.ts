import { defineComponent } from '@arcane-engine/core';

/**
 * Singleton-style input snapshot written by the DOM input manager.
 */
export const InputState = defineComponent<{
  keys: Set<string>;
  mouse: { x: number; y: number; dx: number; dy: number };
  /**
   * Mouse buttons currently held (`mousedown` active). DOM button indices:
   * `0` = left, `1` = middle, `2` = right.
   */
  mouseButtons: Set<number>;
}>('InputState', () => ({
  keys: new Set(),
  mouse: { x: 0, y: 0, dx: 0, dy: 0 },
  mouseButtons: new Set(),
}));

/**
 * Tag component for entities that should respond to player input.
 */
export const Controllable = defineComponent('Controllable', () => ({}));

/**
 * First-person camera state for an entity.
 *
 * Add this alongside {@link Controllable} and {@link Position} to enable FPS
 * look controls via {@link fpsCameraSystem} and direction-relative movement via
 * {@link fpsMovementSystem}.
 *
 * @example
 * addComponent(world, player, FPSCamera, { yaw: 0, pitch: 0, height: 1.6 });
 */
export const FPSCamera = defineComponent<{
  /** Horizontal look angle in radians.  Updated by {@link fpsCameraSystem}. */
  yaw: number;
  /**
   * Vertical look angle in radians, clamped to ±85°.
   * Updated by {@link fpsCameraSystem}.
   */
  pitch: number;
  /** Eye height offset above the entity's {@link Position} in metres. */
  height: number;
}>('FPSCamera', () => ({ yaw: 0, pitch: 0, height: 1.6 }));
