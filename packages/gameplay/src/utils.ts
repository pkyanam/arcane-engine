import {
  addComponent,
  getComponent,
  hasComponent,
  query,
  removeComponent,
} from '@arcane-engine/core';
import type { Entity, World } from '@arcane-engine/core';
import { Activated } from './components/Activated.js';
import { Damage } from './components/Damage.js';
import { Dead } from './components/Dead.js';
import { GameState } from './components/GameState.js';
import { Health } from './components/Health.js';
import { Interactable } from './components/Interactable.js';
import { Player } from './components/Player.js';
import { SpawnPoint } from './components/SpawnPoint.js';

export interface MakeInteractableOptions {
  promptText: string;
  range?: number;
  interactionRange?: number;
  enabled?: boolean;
  requiresFacing?: boolean;
  cooldown?: number;
}

/** Apply damage to a target entity. Adds a {@link Damage} component that {@link healthSystem} will process. */
export function dealDamage(world: World, target: Entity, amount: number, source?: Entity): void {
  addComponent(world, target, Damage, { amount, source: source ?? null });
}

/**
 * Respawn an entity: reset {@link Health} to max, remove {@link Dead}, and
 * reposition to a {@link SpawnPoint}. If the entity has {@link Player},
 * resets {@link GameState.phase} to `'playing'`.
 */
export function respawn(world: World, entity: Entity, spawnId?: string): void {
  // Reset health
  if (hasComponent(world, entity, Health)) {
    const hp = getComponent(world, entity, Health)!;
    hp.current = hp.max;
  }

  // Remove Dead marker
  if (hasComponent(world, entity, Dead)) {
    removeComponent(world, entity, Dead);
  }

  // Find spawn point and reposition
  const spawnEntities = query(world, [SpawnPoint]);
  for (const spawnEnt of spawnEntities) {
    const sp = getComponent(world, spawnEnt, SpawnPoint)!;
    if (spawnId === undefined || sp.id === spawnId) {
      // Write spawn position onto the entity — games can read these
      // fields with their own Position component or transform system
      const anyEntity = getComponent(world, entity, Health);
      if (anyEntity) {
        (anyEntity as Record<string, unknown>)['_spawnX'] = sp.x;
        (anyEntity as Record<string, unknown>)['_spawnY'] = sp.y;
        (anyEntity as Record<string, unknown>)['_spawnZ'] = sp.z;
      }
      break;
    }
  }

  // Reset game state for player entities
  if (hasComponent(world, entity, Player)) {
    const gsEntities = query(world, [GameState]);
    if (gsEntities.length) {
      const gs = getComponent(world, gsEntities[0], GameState)!;
      gs.phase = 'playing';
    }
  }
}

/** Returns the {@link GameState} data from the first entity that has it, or `undefined`. */
export function getGameState(world: World) {
  const entities = query(world, [GameState]);
  if (!entities.length) return undefined;
  return getComponent(world, entities[0], GameState);
}

/** Returns the first {@link Entity} with a {@link Player} component, or `undefined`. */
export function getPlayer(world: World): Entity | undefined {
  const players = query(world, [Player]);
  return players[0];
}

/** Add or replace an {@link Interactable} component on an entity. */
export function makeInteractable(
  world: World,
  entity: Entity,
  options: MakeInteractableOptions,
): void {
  const data: Partial<ReturnType<typeof Interactable.default>> = {
    promptText: options.promptText,
  };

  if (options.interactionRange !== undefined || options.range !== undefined) {
    data.interactionRange = options.interactionRange ?? options.range;
  }
  if (options.enabled !== undefined) {
    data.enabled = options.enabled;
  }
  if (options.requiresFacing !== undefined) {
    data.requiresFacing = options.requiresFacing;
  }
  if (options.cooldown !== undefined) {
    data.cooldown = Math.max(0, options.cooldown);
  }

  addComponent(world, entity, Interactable, data);
}

/** Returns this tick's {@link Activated} event data, or `null` if the entity was not activated. */
export function wasActivated(world: World, entity: Entity) {
  return getComponent(world, entity, Activated) ?? null;
}

/** Enable or disable an existing {@link Interactable}. No-op when the entity is not interactable. */
export function setInteractableEnabled(world: World, entity: Entity, enabled: boolean): void {
  const interactable = getComponent(world, entity, Interactable);
  if (!interactable) return;
  interactable.enabled = enabled;
}
