import { addComponent, getComponent, query } from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';
import { Controllable } from '@arcane-engine/input';
import { Position } from '@arcane-engine/renderer';
import { Damage } from './components/damage.js';
import { Health } from './components/health.js';
import { GameState } from './components/gameState.js';

export interface DamageZone {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface DamageZoneOptions {
  zone: DamageZone;
  /** Seconds between applying one {@link Damage} tick while inside the zone. */
  intervalSec?: number;
  /** HP removed each tick. */
  amount?: number;
}

function inZone(
  x: number,
  y: number,
  z: number,
  zr: DamageZone,
): boolean {
  return (
    x >= zr.minX &&
    x <= zr.maxX &&
    y >= zr.minY &&
    y <= zr.maxY &&
    z >= zr.minZ &&
    z <= zr.maxZ
  );
}

/**
 * Applies periodic {@link Damage} to the local player when their position lies inside a box.
 * Stage 11 test hook for player HP (PRD); runs before {@link healthSystem}.
 */
export const damageZoneSystem = (options: DamageZoneOptions): SystemFn => {
  const zone = options.zone;
  const intervalSec = options.intervalSec ?? 0.35;
  const amount = options.amount ?? 2;
  let acc = 0;

  return (world: World, dt: number): void => {
    const gsEntities = query(world, [GameState]);
    const gs =
      gsEntities[0] !== undefined ? getComponent(world, gsEntities[0], GameState) : undefined;
    if (gs?.phase !== 'playing') {
      acc = 0;
      return;
    }

    const players = query(world, [Controllable, Position, Health]);
    if (!players.length) return;

    const player = players[0];
    const pos = getComponent(world, player, Position)!;

    if (!inZone(pos.x, pos.y, pos.z, zone)) {
      acc = 0;
      return;
    }

    acc += dt;
    while (acc >= intervalSec) {
      acc -= intervalSec;
      addComponent(world, player, Damage, { amount });
    }
  };
};
