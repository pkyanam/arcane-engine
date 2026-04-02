import {
  createWorld,
  getComponent,
  hasComponent,
} from '@arcane-engine/core';
import { describe, expect, it } from 'vitest';
import { Controllable, FPSCamera } from '@arcane-engine/input';
import {
  BoxCollider,
  CharacterController,
  RigidBody,
} from '@arcane-engine/physics';
import { Position } from '@arcane-engine/renderer';
import { GameState } from '../src/components/gameState.js';
import { Health } from '../src/components/health.js';
import {
  spawnFpsGameState,
  spawnFpsPlayerRig,
} from '../src/fpsPlayerSetup.js';

describe('spawnFpsPlayerRig', () => {
  it('spawns the shared local FPS player with the shipped defaults', () => {
    const world = createWorld();

    const player = spawnFpsPlayerRig(world);

    expect(getComponent(world, player, Position)).toEqual({ x: 0, y: 2, z: 0 });
    expect(getComponent(world, player, RigidBody)).toEqual({ type: 'kinematic' });
    expect(getComponent(world, player, BoxCollider)).toMatchObject({ hx: 0.4, hy: 0.9, hz: 0.4 });
    expect(getComponent(world, player, FPSCamera)).toEqual({ yaw: 0, pitch: 0, height: 1.7 });
    expect(getComponent(world, player, CharacterController)).toMatchObject({
      speed: 5,
      jumpSpeed: 6,
      grounded: false,
      _velocityY: 0,
    });
    expect(getComponent(world, player, Health)).toEqual({ current: 10, max: 10 });
    expect(hasComponent(world, player, Controllable)).toBe(true);
  });

  it('supports overriding spawn, loadout, and health values', () => {
    const world = createWorld();

    const player = spawnFpsPlayerRig(world, {
      spawn: { x: 4, y: 3, z: -2 },
      moveSpeed: 7,
      jumpSpeed: 8,
      health: { current: 6, max: 12 },
    });

    expect(getComponent(world, player, Position)).toEqual({ x: 4, y: 3, z: -2 });
    expect(getComponent(world, player, CharacterController)).toMatchObject({
      speed: 7,
      jumpSpeed: 8,
    });
    expect(getComponent(world, player, Health)).toEqual({ current: 6, max: 12 });
  });
});

describe('spawnFpsGameState', () => {
  it('creates the shared FPS game state with readable defaults', () => {
    const world = createWorld();

    const entity = spawnFpsGameState(world);

    expect(getComponent(world, entity, GameState)).toEqual({
      kills: 0,
      playerHp: 10,
      phase: 'playing',
    });
  });

  it('supports overriding the tracked HUD and flow state', () => {
    const world = createWorld();

    const entity = spawnFpsGameState(world, {
      kills: 3,
      playerHp: 4,
      phase: 'dead',
    });

    expect(getComponent(world, entity, GameState)).toEqual({
      kills: 3,
      playerHp: 4,
      phase: 'dead',
    });
  });
});
