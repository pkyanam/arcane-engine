import { describe, it, expect } from 'vitest';
import { Activated } from '../src/components/Activated.js';
import { Health } from '../src/components/Health.js';
import { Damage } from '../src/components/Damage.js';
import { DamageZone } from '../src/components/DamageZone.js';
import { GameState } from '../src/components/GameState.js';
import { Hostile } from '../src/components/Hostile.js';
import { InInteractionRange } from '../src/components/InInteractionRange.js';
import { Interactable } from '../src/components/Interactable.js';
import { Player } from '../src/components/Player.js';
import { Dead } from '../src/components/Dead.js';
import { SpawnPoint } from '../src/components/SpawnPoint.js';

describe('Health', () => {
  it('has correct name', () => {
    expect(Health.name).toBe('Health');
  });
  it('provides defaults', () => {
    expect(Health.default()).toEqual({ current: 10, max: 10 });
  });
});

describe('Damage', () => {
  it('has correct name', () => {
    expect(Damage.name).toBe('Damage');
  });
  it('provides defaults with null source', () => {
    expect(Damage.default()).toEqual({ amount: 1, source: null });
  });
});

describe('DamageZone', () => {
  it('has correct name', () => {
    expect(DamageZone.name).toBe('DamageZone');
  });
  it('provides defaults', () => {
    expect(DamageZone.default()).toEqual({
      damagePerSecond: 0,
      burstDamage: 0,
      damageInterval: 0,
      enabled: true,
      source: null,
    });
  });
});

describe('Activated', () => {
  it('has correct name', () => {
    expect(Activated.name).toBe('Activated');
  });
  it('provides defaults', () => {
    expect(Activated.default()).toEqual({ activatedBy: -1 });
  });
});

describe('GameState', () => {
  it('has correct name', () => {
    expect(GameState.name).toBe('GameState');
  });
  it('provides defaults', () => {
    expect(GameState.default()).toEqual({
      phase: 'playing',
      customPhase: '',
      kills: 0,
      score: 0,
      elapsedTime: 0,
    });
  });
});

describe('Hostile', () => {
  it('has correct name', () => {
    expect(Hostile.name).toBe('Hostile');
  });
  it('provides defaults', () => {
    expect(Hostile.default()).toEqual({ scoreValue: 1 });
  });
});

describe('Interactable', () => {
  it('has correct name', () => {
    expect(Interactable.name).toBe('Interactable');
  });
  it('provides defaults', () => {
    expect(Interactable.default()).toEqual({
      promptText: 'Press E to interact',
      interactionRange: 2,
      enabled: true,
      requiresFacing: false,
      cooldown: 0,
      lastActivatedAt: Number.NEGATIVE_INFINITY,
    });
  });
});

describe('InInteractionRange', () => {
  it('has correct name', () => {
    expect(InInteractionRange.name).toBe('InInteractionRange');
  });
  it('provides defaults', () => {
    expect(InInteractionRange.default()).toEqual({
      interactableEntity: -1,
      distance: 0,
    });
  });
});

describe('Player', () => {
  it('has correct name', () => {
    expect(Player.name).toBe('Player');
  });
  it('provides empty defaults', () => {
    expect(Player.default()).toEqual({});
  });
});

describe('Dead', () => {
  it('has correct name', () => {
    expect(Dead.name).toBe('Dead');
  });
  it('provides defaults with null killedBy', () => {
    expect(Dead.default()).toEqual({ killedBy: null });
  });
});

describe('SpawnPoint', () => {
  it('has correct name', () => {
    expect(SpawnPoint.name).toBe('SpawnPoint');
  });
  it('provides defaults', () => {
    expect(SpawnPoint.default()).toEqual({ id: 'default', x: 0, y: 0, z: 0, yaw: 0 });
  });
});
