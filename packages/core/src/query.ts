import type { ComponentType } from './component.js';
import type { World, Entity } from './world.js';

/**
 * Return all entity IDs that have every listed component type attached.
 *
 * Uses bigint bitmask intersection — O(n) over live entities with a single
 * bitwise AND per entity. Component types that have never been added to any
 * entity produce an immediate empty result without iterating.
 *
 * @example
 * const moving = query(world, [Position, Velocity]);
 */
export function query(
  world: World,
  types: ComponentType<unknown>[],
): Entity[] {
  if (types.length === 0) return Array.from(world.entities);

  // Build the combined bitmask for all requested component types.
  let queryMask = 0n;
  for (const type of types) {
    const bit = world.componentBits.get(type.name);
    if (bit === undefined) {
      // This component type has never been registered — no entity can match.
      return [];
    }
    queryMask |= bit;
  }

  const results: Entity[] = [];
  for (const [entity, mask] of world.entityMasks) {
    if ((mask & queryMask) === queryMask) {
      results.push(entity);
    }
  }
  return results;
}
