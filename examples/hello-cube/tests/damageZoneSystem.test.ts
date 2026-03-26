import { addComponent, createEntity, createWorld, getComponent, hasComponent } from '@arcane-engine/core';
import { describe, expect, it } from 'vitest';
import { Controllable } from '@arcane-engine/input';
import { Position } from '@arcane-engine/renderer';
import { Damage } from '../src/components/damage.js';
import { GameState } from '../src/components/gameState.js';
import { Health } from '../src/components/health.js';
import { damageZoneSystem } from '../src/damageZoneSystem.js';

describe('damageZoneSystem', () => {
  it('applies Damage after the interval elapses while the player is inside the box', () => {
    const world = createWorld();
    const stateEnt = createEntity(world);
    addComponent(world, stateEnt, GameState, { kills: 0, playerHp: 10, phase: 'playing' });

    const player = createEntity(world);
    addComponent(world, player, Controllable);
    addComponent(world, player, Position, { x: 8, y: 1, z: 8 });
    addComponent(world, player, Health, { current: 10, max: 10 });

    const zone = {
      minX: 6,
      maxX: 9,
      minY: 0,
      maxY: 4,
      minZ: 6,
      maxZ: 9,
    };
    const sys = damageZoneSystem({ zone, intervalSec: 0.2, amount: 3 });

    sys(world, 0.1);
    expect(hasComponent(world, player, Damage)).toBe(false);

    sys(world, 0.11);
    expect(getComponent(world, player, Damage)?.amount).toBe(3);
  });

  it('does not tick while phase is not playing', () => {
    const world = createWorld();
    const stateEnt = createEntity(world);
    addComponent(world, stateEnt, GameState, { kills: 0, playerHp: 10, phase: 'dead' });

    const player = createEntity(world);
    addComponent(world, player, Controllable);
    addComponent(world, player, Position, { x: 8, y: 1, z: 8 });
    addComponent(world, player, Health, { current: 10, max: 10 });

    const sys = damageZoneSystem({
      zone: { minX: 6, maxX: 9, minY: 0, maxY: 4, minZ: 6, maxZ: 9 },
      intervalSec: 0.1,
      amount: 1,
    });
    sys(world, 1);
    expect(hasComponent(world, player, Damage)).toBe(false);
  });
});
