import { describe, it, expect } from 'vitest';
import {
  createWorld,
  createEntity,
  addComponent,
  getComponent,
  hasComponent,
} from '@arcane-engine/core';
import { Activated } from '../src/components/Activated.js';
import { Damage } from '../src/components/Damage.js';
import { Dead } from '../src/components/Dead.js';
import { GameState } from '../src/components/GameState.js';
import { Health } from '../src/components/Health.js';
import { Interactable } from '../src/components/Interactable.js';
import { Player } from '../src/components/Player.js';
import { SpawnPoint } from '../src/components/SpawnPoint.js';
import {
  dealDamage,
  getGameState,
  getPlayer,
  makeInteractable,
  respawn,
  setInteractableEnabled,
  wasActivated,
} from '../src/utils.js';

describe('dealDamage', () => {
  it('adds Damage component to target', () => {
    const world = createWorld();
    const target = createEntity(world);
    addComponent(world, target, Health, { current: 10, max: 10 });

    dealDamage(world, target, 5);

    const dmg = getComponent(world, target, Damage)!;
    expect(dmg.amount).toBe(5);
    expect(dmg.source).toBeNull();
  });

  it('records source entity', () => {
    const world = createWorld();
    const attacker = createEntity(world);
    const target = createEntity(world);
    addComponent(world, target, Health, { current: 10, max: 10 });

    dealDamage(world, target, 3, attacker);

    const dmg = getComponent(world, target, Damage)!;
    expect(dmg.source).toBe(attacker);
  });
});

describe('respawn', () => {
  it('resets health to max', () => {
    const world = createWorld();
    const entity = createEntity(world);
    addComponent(world, entity, Health, { current: 0, max: 10 });

    respawn(world, entity);

    expect(getComponent(world, entity, Health)!.current).toBe(10);
  });

  it('removes Dead marker', () => {
    const world = createWorld();
    const entity = createEntity(world);
    addComponent(world, entity, Health, { current: 0, max: 10 });
    addComponent(world, entity, Dead, { killedBy: null });

    respawn(world, entity);

    expect(hasComponent(world, entity, Dead)).toBe(false);
  });

  it('resets GameState.phase for player entities', () => {
    const world = createWorld();
    const gsEntity = createEntity(world);
    addComponent(world, gsEntity, GameState, {
      phase: 'dead',
      customPhase: '',
      kills: 0,
      score: 0,
      elapsedTime: 0,
    });

    const player = createEntity(world);
    addComponent(world, player, Player);
    addComponent(world, player, Health, { current: 0, max: 10 });
    addComponent(world, player, Dead, { killedBy: null });

    respawn(world, player);

    expect(getComponent(world, gsEntity, GameState)!.phase).toBe('playing');
  });

  it('does not reset phase for non-player entities', () => {
    const world = createWorld();
    const gsEntity = createEntity(world);
    addComponent(world, gsEntity, GameState, {
      phase: 'dead',
      customPhase: '',
      kills: 0,
      score: 0,
      elapsedTime: 0,
    });

    const enemy = createEntity(world);
    addComponent(world, enemy, Health, { current: 0, max: 5 });

    respawn(world, enemy);

    expect(getComponent(world, gsEntity, GameState)!.phase).toBe('dead');
  });
});

describe('getGameState', () => {
  it('returns GameState data from singleton entity', () => {
    const world = createWorld();
    const gsEntity = createEntity(world);
    addComponent(world, gsEntity, GameState);

    const gs = getGameState(world);
    expect(gs).toBeDefined();
    expect(gs!.phase).toBe('playing');
  });

  it('returns undefined when no GameState exists', () => {
    const world = createWorld();
    expect(getGameState(world)).toBeUndefined();
  });
});

describe('getPlayer', () => {
  it('returns first entity with Player component', () => {
    const world = createWorld();
    const player = createEntity(world);
    addComponent(world, player, Player);

    expect(getPlayer(world)).toBe(player);
  });

  it('returns undefined when no player exists', () => {
    const world = createWorld();
    expect(getPlayer(world)).toBeUndefined();
  });
});

describe('makeInteractable', () => {
  it('adds an Interactable with configured options', () => {
    const world = createWorld();
    const entity = createEntity(world);

    makeInteractable(world, entity, {
      promptText: 'Press E to open',
      range: 3,
      requiresFacing: true,
      cooldown: 2,
      enabled: false,
    });

    expect(getComponent(world, entity, Interactable)).toEqual({
      promptText: 'Press E to open',
      interactionRange: 3,
      enabled: false,
      requiresFacing: true,
      cooldown: 2,
      lastActivatedAt: Number.NEGATIVE_INFINITY,
    });
  });

  it('uses component defaults for omitted optional fields', () => {
    const world = createWorld();
    const entity = createEntity(world);

    makeInteractable(world, entity, { promptText: 'Press E to read' });

    expect(getComponent(world, entity, Interactable)).toEqual({
      promptText: 'Press E to read',
      interactionRange: 2,
      enabled: true,
      requiresFacing: false,
      cooldown: 0,
      lastActivatedAt: Number.NEGATIVE_INFINITY,
    });
  });
});

describe('wasActivated', () => {
  it('returns activation data when present', () => {
    const world = createWorld();
    const entity = createEntity(world);
    addComponent(world, entity, Activated, { activatedBy: 7 });

    expect(wasActivated(world, entity)).toEqual({ activatedBy: 7 });
  });

  it('returns null when activation data is absent', () => {
    const world = createWorld();
    const entity = createEntity(world);

    expect(wasActivated(world, entity)).toBeNull();
  });
});

describe('setInteractableEnabled', () => {
  it('toggles interactable enabled state', () => {
    const world = createWorld();
    const entity = createEntity(world);
    makeInteractable(world, entity, { promptText: 'Press E' });

    setInteractableEnabled(world, entity, false);
    expect(getComponent(world, entity, Interactable)!.enabled).toBe(false);

    setInteractableEnabled(world, entity, true);
    expect(getComponent(world, entity, Interactable)!.enabled).toBe(true);
  });
});
