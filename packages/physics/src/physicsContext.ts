import RAPIER from '@dimforge/rapier3d-compat';

/** Whether {@link initPhysics} has completed successfully. */
let initialized = false;

/**
 * Initialize the Rapier WASM module.
 *
 * Must be called and awaited once before calling {@link createPhysicsContext}.
 * Subsequent calls are no-ops and resolve immediately.
 *
 * @example
 * await initPhysics();
 * const physCtx = createPhysicsContext();
 */
export async function initPhysics(): Promise<void> {
  if (initialized) return;
  await RAPIER.init();
  initialized = true;
}

/** Gravity vector used by a {@link PhysicsContext}. */
export interface GravityOptions {
  x?: number;
  y?: number;
  z?: number;
}

/**
 * Options accepted by {@link createPhysicsContext}.
 */
export interface PhysicsOptions {
  /**
   * World-space gravity in m/s².
   * Defaults to `{ x: 0, y: -9.81, z: 0 }` (standard Earth gravity downward).
   */
  gravity?: GravityOptions;
}

/**
 * Shared Rapier objects used by {@link physicsSystem}.
 *
 * Create one context per active physics scene and pass it to the system
 * factory.  Contexts are not reused across scenes.
 */
export interface PhysicsContext {
  /** The Rapier physics world. */
  readonly world: RAPIER.World;
}

/**
 * Create a new Rapier physics world.
 *
 * {@link initPhysics} must be awaited before calling this function.
 *
 * @param options  Optional gravity override.  Defaults to standard Earth gravity.
 * @throws If {@link initPhysics} has not been called.
 *
 * @example
 * const physCtx = createPhysicsContext();
 * registerSystem(world, physicsSystem(physCtx));
 */
export function createPhysicsContext(options?: PhysicsOptions): PhysicsContext {
  if (!initialized) {
    throw new Error(
      'createPhysicsContext: Rapier WASM is not initialized. Call and await initPhysics() first.',
    );
  }

  const g = options?.gravity ?? {};
  const gravity = { x: g.x ?? 0, y: g.y ?? -9.81, z: g.z ?? 0 };
  const world = new RAPIER.World(gravity);

  return { world };
}
