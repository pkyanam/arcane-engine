import RAPIER from '@dimforge/rapier3d-compat';
import type { PhysicsContext } from './physicsContext.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * The result of a successful {@link raycast} call.
 */
export interface RaycastHit {
  /**
   * Rapier collider handle of the first object hit.
   *
   * This is a low-level Rapier handle, not an ECS entity ID.  A future weapon
   * or interaction system will need to maintain a `Map<handle, Entity>` to
   * convert this into an entity reference.
   */
  colliderHandle: number;
  /** World-space point where the ray intersected the collider surface. */
  point: { x: number; y: number; z: number };
  /** Surface normal at the hit point. */
  normal: { x: number; y: number; z: number };
  /** Distance in metres from origin to hit point. */
  distance: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normalize(v: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Cast a ray from `origin` in `direction` and return the first Rapier
 * collider hit within `maxDistance` metres, or `null` if nothing was hit.
 *
 * `direction` does not need to be normalized — the function normalises it.
 * A zero-length direction vector returns `null` immediately.
 *
 * This is a pure function, not a system.  Call it imperatively, e.g. inside
 * a weapon system on fire input.
 *
 * @param ctx          The {@link PhysicsContext} for the active scene.
 * @param origin       World-space ray origin.
 * @param direction    Ray direction (normalised internally).
 * @param maxDistance  Maximum ray length in metres.
 *
 * @example
 * const hit = raycast(physCtx, { x: 0, y: 5, z: 0 }, { x: 0, y: -1, z: 0 }, 20);
 * if (hit) console.log('hit at', hit.point, 'distance', hit.distance);
 */
export function raycast(
  ctx: PhysicsContext,
  origin: { x: number; y: number; z: number },
  direction: { x: number; y: number; z: number },
  maxDistance: number,
): RaycastHit | null {
  const dir = normalize(direction);

  // Zero-length direction — no valid ray.
  if (dir.x === 0 && dir.y === 0 && dir.z === 0) return null;

  const ray = new RAPIER.Ray(origin, dir);
  const hit = ctx.world.castRayAndGetNormal(ray, maxDistance, true);

  if (!hit) return null;

  return {
    colliderHandle: hit.collider.handle,
    point: {
      x: origin.x + dir.x * hit.timeOfImpact,
      y: origin.y + dir.y * hit.timeOfImpact,
      z: origin.z + dir.z * hit.timeOfImpact,
    },
    normal: { x: hit.normal.x, y: hit.normal.y, z: hit.normal.z },
    distance: hit.timeOfImpact,
  };
}
