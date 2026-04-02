import { getComponent, query } from '@arcane-engine/core';
import type { World } from '@arcane-engine/core';
import { GameState } from './components/GameState.js';
import { Hostile } from './components/Hostile.js';

/**
 * Updates {@link GameState.elapsedTime} and checks win condition
 * (all {@link Hostile} entities destroyed).
 *
 * Pure ECS — no DOM, HUD, or input handling. Games should layer their own
 * HUD system on top of the data this system maintains.
 */
export function gameStateSystem(world: World, dt: number): void {
  const gsEntities = query(world, [GameState]);
  if (!gsEntities.length) return;
  const gs = getComponent(world, gsEntities[0], GameState)!;

  if (gs.phase === 'playing') {
    gs.elapsedTime += dt;
  }

  // Win condition: all hostiles destroyed while still playing
  if (gs.phase === 'playing') {
    const hostileCount = query(world, [Hostile]).length;
    if (hostileCount === 0) {
      // Only auto-win if at least one hostile was ever killed
      if (gs.kills > 0) {
        gs.phase = 'win';
      }
    }
  }
}
