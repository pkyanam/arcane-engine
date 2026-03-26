import { defineComponent, getComponent, query } from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';
import { Position } from '@arcane-engine/renderer';

type MotionBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
};

type Velocity = {
  x: number;
  y: number;
  z: number;
};

/**
 * Describes the drifting motion envelope used by the hello-cube ambient cubes.
 */
export const FloatingMotion = defineComponent<{
  velocity: Velocity;
  bounds: MotionBounds;
}>('FloatingMotion', () => ({
  velocity: { x: 0.75, y: 0.45, z: 0.6 },
  bounds: {
    minX: -1,
    maxX: 1,
    minY: 1,
    maxY: 3,
    minZ: -1,
    maxZ: 1,
  },
}));

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Moves floating cubes inside their configured bounds and bounces their
 * velocity when they reach an edge.
 */
export const floatingMotionSystem: SystemFn = (world: World, dt: number): void => {
  for (const entity of query(world, [FloatingMotion, Position])) {
    const motion = getComponent(world, entity, FloatingMotion)!;
    const position = getComponent(world, entity, Position)!;

    position.x += motion.velocity.x * dt;
    position.y += motion.velocity.y * dt;
    position.z += motion.velocity.z * dt;

    if (position.x <= motion.bounds.minX || position.x >= motion.bounds.maxX) {
      motion.velocity.x *= -1;
      position.x = clamp(position.x, motion.bounds.minX, motion.bounds.maxX);
    }

    if (position.y <= motion.bounds.minY || position.y >= motion.bounds.maxY) {
      motion.velocity.y *= -1;
      position.y = clamp(position.y, motion.bounds.minY, motion.bounds.maxY);
    }

    if (position.z <= motion.bounds.minZ || position.z >= motion.bounds.maxZ) {
      motion.velocity.z *= -1;
      position.z = clamp(position.z, motion.bounds.minZ, motion.bounds.maxZ);
    }
  }
};
