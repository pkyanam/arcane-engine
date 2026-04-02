import { addComponent, createEntity, createWorld, getComponent } from '@arcane-engine/core';
import { describe, expect, it, beforeAll } from 'vitest';
import { Controllable, InputState } from '@arcane-engine/input';
import {
  BoxCollider,
  CharacterController,
  createPhysicsContext,
  initPhysics,
  physicsSystem,
  RigidBody,
} from '@arcane-engine/physics';
import { Position } from '@arcane-engine/renderer';
import { Health } from '../src/components/health.js';
import { GameState } from '../src/components/gameState.js';
import { ShootableTarget } from '../src/components/shootableTarget.js';
import { gameStateSystem, type FpsHudHandles } from '../src/gameStateSystem.js';

beforeAll(async () => {
  await initPhysics();
});

function makeHud(): FpsHudHandles {
  return {
    healthFill: document.createElement('div'),
    healthLabel: document.createElement('div'),
    killsLabel: document.createElement('div'),
    overlay: document.createElement('div'),
  };
}

describe('gameStateSystem', () => {
  it('sets phase win when playing and no ShootableTarget entities remain', () => {
    const world = createWorld();
    const physCtx = createPhysicsContext();
    const hud = makeHud();
    const stateEnt = createEntity(world);
    addComponent(world, stateEnt, GameState, { kills: 0, playerHp: 10, phase: 'playing' });

    const sys = gameStateSystem(physCtx, hud, {
      spawn: { x: 0, y: 2, z: 0 },
      moveSpeed: 5,
      jumpSpeed: 6,
    });
    sys(world, 1 / 60);

    expect(getComponent(world, stateEnt, GameState)?.phase).toBe('win');
    expect(hud.overlay.style.display).toBe('flex');
  });

  it('does not override dead with win when targets are cleared', () => {
    const world = createWorld();
    const physCtx = createPhysicsContext();
    const hud = makeHud();
    const stateEnt = createEntity(world);
    addComponent(world, stateEnt, GameState, { kills: 0, playerHp: 0, phase: 'dead' });

    const sys = gameStateSystem(physCtx, hud, {
      spawn: { x: 0, y: 2, z: 0 },
      moveSpeed: 5,
      jumpSpeed: 6,
    });
    sys(world, 1 / 60);

    expect(getComponent(world, stateEnt, GameState)?.phase).toBe('dead');
  });

  it('respawns on R edge from dead: full health, spawn position, playing', () => {
    const world = createWorld();
    const physCtx = createPhysicsContext();
    const hud = makeHud();

    const inputEnt = createEntity(world);
    addComponent(world, inputEnt, InputState);

    const stateEnt = createEntity(world);
    addComponent(world, stateEnt, GameState, { kills: 2, playerHp: 0, phase: 'dead' });

    const player = createEntity(world);
    addComponent(world, player, Position, { x: 9, y: 2, z: 9 });
    addComponent(world, player, Health, { current: 0, max: 10 });
    addComponent(world, player, Controllable);
    addComponent(world, player, CharacterController, {
      speed: 5,
      jumpSpeed: 6,
      grounded: false,
      _velocityY: -3,
    });
    addComponent(world, player, RigidBody, { type: 'kinematic' });
    addComponent(world, player, BoxCollider, { hx: 0.4, hy: 0.9, hz: 0.4 });

    physicsSystem(physCtx)(world, 1 / 60);

    const input = getComponent(world, inputEnt, InputState)!;
    input.keys.add('KeyR');

    const sys = gameStateSystem(physCtx, hud, {
      spawn: { x: 0, y: 2, z: 0 },
      moveSpeed: 5,
      jumpSpeed: 6,
    });
    sys(world, 1 / 60);

    expect(getComponent(world, stateEnt, GameState)?.phase).toBe('playing');
    expect(getComponent(world, player, Health)?.current).toBe(10);
    expect(getComponent(world, player, Position)).toMatchObject({ x: 0, y: 2, z: 0 });
    expect(getComponent(world, player, CharacterController)?._velocityY).toBe(0);
  });

  it('keeps playing while ShootableTarget entities exist', () => {
    const world = createWorld();
    const physCtx = createPhysicsContext();
    const hud = makeHud();
    const stateEnt = createEntity(world);
    addComponent(world, stateEnt, GameState, { kills: 0, playerHp: 10, phase: 'playing' });

    const t = createEntity(world);
    addComponent(world, t, ShootableTarget);

    const sys = gameStateSystem(physCtx, hud, {
      spawn: { x: 0, y: 2, z: 0 },
      moveSpeed: 5,
      jumpSpeed: 6,
    });
    sys(world, 1 / 60);

    expect(getComponent(world, stateEnt, GameState)?.phase).toBe('playing');
  });

  it('reflects player HP in the HUD labels', () => {
    const world = createWorld();
    const physCtx = createPhysicsContext();
    const hud = makeHud();

    const stateEnt = createEntity(world);
    addComponent(world, stateEnt, GameState, { kills: 1, playerHp: 0, phase: 'playing' });

    const player = createEntity(world);
    addComponent(world, player, Health, { current: 7, max: 10 });
    addComponent(world, player, Controllable);
    addComponent(world, player, Position, { x: 0, y: 0, z: 0 });

    const sys = gameStateSystem(physCtx, hud, {
      spawn: { x: 0, y: 2, z: 0 },
      moveSpeed: 5,
      jumpSpeed: 6,
    });
    sys(world, 1 / 60);

    expect(hud.healthLabel.textContent).toBe('7 / 10');
    expect(hud.killsLabel.textContent).toBe('Kills 1');
    expect(hud.healthFill.style.transform).toContain('scaleX');
  });
});
