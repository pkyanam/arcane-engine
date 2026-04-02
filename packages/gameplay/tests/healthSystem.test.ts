import { describe, it, expect } from 'vitest';
import {
  createWorld,
  createEntity,
  addComponent,
  getComponent,
  hasComponent,
  query,
} from '@arcane-engine/core';
import { Health } from '../src/components/Health.js';
import { Damage } from '../src/components/Damage.js';
import { Dead } from '../src/components/Dead.js';
import { GameState } from '../src/components/GameState.js';
import { Hostile } from '../src/components/Hostile.js';
import { Player } from '../src/components/Player.js';
import { healthSystem } from '../src/healthSystem.js';

function makeWorld() {
  const world = createWorld();
  const gsEntity = createEntity(world);
  addComponent(world, gsEntity, GameState);
  return { world, gsEntity };
}

describe('healthSystem', () => {
  it('applies damage and reduces health', () => {
    const { world } = makeWorld();
    const entity = createEntity(world);
    addComponent(world, entity, Health, { current: 10, max: 10 });
    addComponent(world, entity, Damage, { amount: 3, source: null });

    healthSystem(world, 0);

    const hp = getComponent(world, entity, Health)!;
    expect(hp.current).toBe(7);
    expect(hasComponent(world, entity, Damage)).toBe(false);
  });

  it('destroys non-player entities at 0 hp', () => {
    const { world } = makeWorld();
    const entity = createEntity(world);
    addComponent(world, entity, Health, { current: 1, max: 5 });
    addComponent(world, entity, Damage, { amount: 5, source: null });

    healthSystem(world, 0);

    // Entity should be destroyed — querying Health should not find it
    const alive = query(world, [Health]);
    expect(alive).not.toContain(entity);
  });

  it('adds Dead marker to player at 0 hp instead of destroying', () => {
    const { world } = makeWorld();
    const player = createEntity(world);
    addComponent(world, player, Player);
    addComponent(world, player, Health, { current: 1, max: 10 });
    addComponent(world, player, Damage, { amount: 5, source: null });

    healthSystem(world, 0);

    expect(hasComponent(world, player, Dead)).toBe(true);
    expect(getComponent(world, player, Health)!.current).toBe(0);
    // Player should still exist
    expect(query(world, [Player])).toContain(player);
  });

  it('sets GameState.phase to dead when player dies', () => {
    const { world, gsEntity } = makeWorld();
    const player = createEntity(world);
    addComponent(world, player, Player);
    addComponent(world, player, Health, { current: 1, max: 10 });
    addComponent(world, player, Damage, { amount: 1, source: null });

    healthSystem(world, 0);

    const gs = getComponent(world, gsEntity, GameState)!;
    expect(gs.phase).toBe('dead');
  });

  it('increments kills and score when hostile is destroyed', () => {
    const { world, gsEntity } = makeWorld();
    const enemy = createEntity(world);
    addComponent(world, enemy, Health, { current: 1, max: 3 });
    addComponent(world, enemy, Hostile, { scoreValue: 10 });
    addComponent(world, enemy, Damage, { amount: 5, source: null });

    healthSystem(world, 0);

    const gs = getComponent(world, gsEntity, GameState)!;
    expect(gs.kills).toBe(10);
    expect(gs.score).toBe(10);
  });

  it('does not apply damage to already-dead players', () => {
    const { world } = makeWorld();
    const player = createEntity(world);
    addComponent(world, player, Player);
    addComponent(world, player, Health, { current: 0, max: 10 });
    addComponent(world, player, Dead, { killedBy: null });
    addComponent(world, player, Damage, { amount: 5, source: null });

    healthSystem(world, 0);

    expect(getComponent(world, player, Health)!.current).toBe(0);
    expect(hasComponent(world, player, Damage)).toBe(false);
  });

  it('records damage source in Dead component', () => {
    const { world } = makeWorld();
    const attacker = createEntity(world);
    const player = createEntity(world);
    addComponent(world, player, Player);
    addComponent(world, player, Health, { current: 1, max: 10 });
    addComponent(world, player, Damage, { amount: 5, source: attacker });

    healthSystem(world, 0);

    const dead = getComponent(world, player, Dead)!;
    expect(dead.killedBy).toBe(attacker);
  });

  it('works without GameState entity', () => {
    const world = createWorld();
    const entity = createEntity(world);
    addComponent(world, entity, Health, { current: 5, max: 5 });
    addComponent(world, entity, Damage, { amount: 2, source: null });

    healthSystem(world, 0);

    expect(getComponent(world, entity, Health)!.current).toBe(3);
  });
});
