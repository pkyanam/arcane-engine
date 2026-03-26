import type { World, SystemFn } from './world.js';

/**
 * Register a system function to run each frame.
 * Systems run in the order they are registered.
 */
export function registerSystem(world: World, system: SystemFn): void {
  world.systems.push(system);
}

/**
 * Unregister a previously added system.
 * No-op if the system is not found.
 */
export function unregisterSystem(world: World, system: SystemFn): void {
  const idx = world.systems.indexOf(system);
  if (idx !== -1) world.systems.splice(idx, 1);
}

/**
 * Run every registered system in registration order.
 *
 * @param dt  Delta time in seconds since the last frame.
 */
export function runSystems(world: World, dt: number): void {
  for (const system of world.systems) {
    system(world, dt);
  }
}
