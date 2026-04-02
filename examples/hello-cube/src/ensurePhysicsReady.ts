import { initPhysics } from '@arcane-engine/physics';

let physicsReady: Promise<void> | undefined;

/**
 * Load Rapier on demand for physics-backed hello-cube scenes.
 */
export function ensurePhysicsReady(): Promise<void> {
  physicsReady ??= initPhysics();
  return physicsReady;
}
