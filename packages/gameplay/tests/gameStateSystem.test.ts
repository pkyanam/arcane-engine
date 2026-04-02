import { describe, it, expect } from 'vitest';
import {
  createWorld,
  createEntity,
  addComponent,
  getComponent,
  query,
} from '@arcane-engine/core';
import { GameState } from '../src/components/GameState.js';
import { Health } from '../src/components/Health.js';
import { Hostile } from '../src/components/Hostile.js';
import { Player } from '../src/components/Player.js';
import { gameStateSystem } from '../src/gameStateSystem.js';

function makeWorld() {
  const world = createWorld();
  const gsEntity = createEntity(world);
  addComponent(world, gsEntity, GameState);
  return { world, gsEntity };
}

describe('gameStateSystem', () => {
  it('increments elapsedTime while playing', () => {
    const { world, gsEntity } = makeWorld();

    gameStateSystem(world, 0.016);
    gameStateSystem(world, 0.016);

    const gs = getComponent(world, gsEntity, GameState)!;
    expect(gs.elapsedTime).toBeCloseTo(0.032);
  });

  it('does not increment elapsedTime when paused', () => {
    const { world, gsEntity } = makeWorld();
    const gs = getComponent(world, gsEntity, GameState)!;
    gs.phase = 'paused';

    gameStateSystem(world, 1.0);

    expect(gs.elapsedTime).toBe(0);
  });

  it('sets phase to win when all hostiles are destroyed and kills > 0', () => {
    const { world, gsEntity } = makeWorld();
    const gs = getComponent(world, gsEntity, GameState)!;
    gs.kills = 3; // Some kills already happened

    gameStateSystem(world, 0.016);

    expect(gs.phase).toBe('win');
  });

  it('does not auto-win with zero kills', () => {
    const { world, gsEntity } = makeWorld();

    gameStateSystem(world, 0.016);

    const gs = getComponent(world, gsEntity, GameState)!;
    expect(gs.phase).toBe('playing');
  });

  it('does not win while hostiles remain', () => {
    const { world, gsEntity } = makeWorld();
    const gs = getComponent(world, gsEntity, GameState)!;
    gs.kills = 1;

    const enemy = createEntity(world);
    addComponent(world, enemy, Hostile, { scoreValue: 1 });

    gameStateSystem(world, 0.016);

    expect(gs.phase).toBe('playing');
  });

  it('does nothing without a GameState entity', () => {
    const world = createWorld();
    // Should not throw
    gameStateSystem(world, 0.016);
  });
});
