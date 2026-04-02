import {
  addComponent,
  destroyEntity,
  getComponent,
  hasComponent,
  query,
  removeComponent,
} from '@arcane-engine/core';
import type { World } from '@arcane-engine/core';
import { Damage } from './components/Damage.js';
import { Dead } from './components/Dead.js';
import { GameState } from './components/GameState.js';
import { Health } from './components/Health.js';
import { Hostile } from './components/Hostile.js';
import { Player } from './components/Player.js';

/**
 * Processes {@link Damage} components, updates {@link Health}, adds {@link Dead}
 * marker at 0 hp, calls `destroyEntity` for non-{@link Player} entities, and
 * increments {@link GameState}.kills when a {@link Hostile} is destroyed.
 *
 * Pure ECS — no rendering or physics cleanup. Games should run their own
 * cleanup systems (mesh removal, body removal) before or after this one.
 */
export function healthSystem(world: World, _dt: number): void {
  const gsEnt = query(world, [GameState])[0];
  const gs = gsEnt !== undefined ? getComponent(world, gsEnt, GameState) : undefined;

  for (const entity of query(world, [Health, Damage])) {
    // Don't apply damage to already-dead players
    if (hasComponent(world, entity, Player) && hasComponent(world, entity, Dead)) {
      removeComponent(world, entity, Damage);
      continue;
    }

    const health = getComponent(world, entity, Health)!;
    const damage = getComponent(world, entity, Damage)!;
    health.current -= damage.amount;
    removeComponent(world, entity, Damage);

    if (health.current > 0) continue;

    health.current = 0;

    // Player entities get Dead marker but are not destroyed
    if (hasComponent(world, entity, Player)) {
      if (!hasComponent(world, entity, Dead)) {
        addComponent(world, entity, Dead, { killedBy: damage.source });
      }
      if (gs !== undefined) {
        gs.phase = 'dead';
      }
      continue;
    }

    // Credit kills for hostile entities
    if (hasComponent(world, entity, Hostile) && gs !== undefined) {
      const hostile = getComponent(world, entity, Hostile)!;
      gs.kills += hostile.scoreValue;
      gs.score += hostile.scoreValue;
    }

    destroyEntity(world, entity);
  }
}
