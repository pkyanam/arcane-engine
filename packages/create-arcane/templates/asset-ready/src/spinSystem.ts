import { query, getComponent } from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';
import { Spin, Rotation } from '@arcane-engine/renderer';

/** Increment each entity's rotation axis by spin.speed * dt each tick. */
export const spinSystem: SystemFn = (world: World, dt: number): void => {
  for (const entity of query(world, [Spin, Rotation])) {
    const spin = getComponent(world, entity, Spin)!;
    const rot = getComponent(world, entity, Rotation)!;
    rot[spin.axis] += spin.speed * dt;
  }
};
