import { describe, expect, it, beforeAll } from 'vitest';
import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
  hasComponent,
} from '@arcane-engine/core';
import { FPSCamera, InputState } from '@arcane-engine/input';
import { Position } from '@arcane-engine/renderer';
import { BoxCollider, CharacterController, RapierBodyRef, RigidBody } from '../src/components.js';
import { characterControllerSystem } from '../src/characterControllerSystem.js';
import { createPhysicsContext, initPhysics } from '../src/physicsContext.js';
import { physicsSystem } from '../src/physicsSystem.js';

const DT = 1 / 60;

beforeAll(async () => {
  await initPhysics();
});

function tick(world: ReturnType<typeof createWorld>, ctx: ReturnType<typeof createPhysicsContext>): void {
  physicsSystem(ctx)(world, DT);
  characterControllerSystem(ctx)(world, DT);
}

function addInput(world: ReturnType<typeof createWorld>): void {
  const e = createEntity(world);
  addComponent(world, e, InputState);
}

describe('CharacterController component', () => {
  it('has expected default values', () => {
    const world = createWorld();
    const entity = createEntity(world);
    addComponent(world, entity, CharacterController);

    const cc = getComponent(world, entity, CharacterController)!;
    expect(cc.speed).toBe(5);
    expect(cc.jumpSpeed).toBe(6);
    expect(cc.grounded).toBe(false);
    expect(cc._velocityY).toBe(0);
  });
});

describe('characterControllerSystem', () => {
  it('after settling on a flat floor, an idle tick keeps the player grounded', () => {
    const world = createWorld();
    const ctx = createPhysicsContext();
    addInput(world);

    const floor = createEntity(world);
    addComponent(world, floor, Position, { x: 0, y: 0, z: 0 });
    addComponent(world, floor, RigidBody, { type: 'fixed' });
    addComponent(world, floor, BoxCollider, { hx: 10, hy: 0.25, hz: 10 });

    const player = createEntity(world);
    addComponent(world, player, Position, { x: 0, y: 1.15, z: 0 });
    addComponent(world, player, RigidBody, { type: 'kinematic' });
    addComponent(world, player, BoxCollider, { hx: 0.4, hy: 0.9, hz: 0.4 });
    addComponent(world, player, FPSCamera, { yaw: 0, pitch: 0, height: 1.7 });
    addComponent(world, player, CharacterController, {
      speed: 5,
      jumpSpeed: 6,
      grounded: false,
      _velocityY: 0,
    });

    let cc = getComponent(world, player, CharacterController)!;
    for (let i = 0; i < 40 && !cc.grounded; i++) {
      tick(world, ctx);
      cc = getComponent(world, player, CharacterController)!;
    }
    expect(cc.grounded).toBe(true);

    tick(world, ctx);
    cc = getComponent(world, player, CharacterController)!;
    expect(cc.grounded).toBe(true);
  });

  it('after one tick with no input, a player spawned above the floor falls (Y decreases)', () => {
    const world = createWorld();
    const ctx = createPhysicsContext();
    addInput(world);

    const floor = createEntity(world);
    addComponent(world, floor, Position, { x: 0, y: 0, z: 0 });
    addComponent(world, floor, RigidBody, { type: 'fixed' });
    addComponent(world, floor, BoxCollider, { hx: 10, hy: 0.25, hz: 10 });

    const player = createEntity(world);
    addComponent(world, player, Position, { x: 0, y: 5, z: 0 });
    addComponent(world, player, RigidBody, { type: 'kinematic' });
    addComponent(world, player, BoxCollider, { hx: 0.4, hy: 0.9, hz: 0.4 });
    addComponent(world, player, FPSCamera, { yaw: 0, pitch: 0, height: 1.7 });
    addComponent(world, player, CharacterController, {
      speed: 5,
      jumpSpeed: 6,
      grounded: false,
      _velocityY: 0,
    });

    const y0 = getComponent(world, player, Position)!.y;
    tick(world, ctx);
    const y1 = getComponent(world, player, Position)!.y;

    expect(y1).toBeLessThan(y0);
  });

  it('with KeyW held, player moves in -Z at yaw=0 after one tick', () => {
    const world = createWorld();
    const ctx = createPhysicsContext();

    const inputEnt = createEntity(world);
    addComponent(world, inputEnt, InputState);
    getComponent(world, inputEnt, InputState)!.keys.add('KeyW');

    const floor = createEntity(world);
    addComponent(world, floor, Position, { x: 0, y: 0, z: 0 });
    addComponent(world, floor, RigidBody, { type: 'fixed' });
    addComponent(world, floor, BoxCollider, { hx: 10, hy: 0.25, hz: 10 });

    const player = createEntity(world);
    addComponent(world, player, Position, { x: 0, y: 1.15, z: 0 });
    addComponent(world, player, RigidBody, { type: 'kinematic' });
    addComponent(world, player, BoxCollider, { hx: 0.4, hy: 0.9, hz: 0.4 });
    addComponent(world, player, FPSCamera, { yaw: 0, pitch: 0, height: 1.7 });
    addComponent(world, player, CharacterController, {
      speed: 5,
      jumpSpeed: 6,
      grounded: false,
      _velocityY: 0,
    });

    const z0 = getComponent(world, player, Position)!.z;
    tick(world, ctx);
    const z1 = getComponent(world, player, Position)!.z;

    expect(z1).toBeLessThan(z0);
  });

  it('when Space is pressed and grounded, _velocityY becomes jumpSpeed', () => {
    const world = createWorld();
    const ctx = createPhysicsContext();

    const inputEnt = createEntity(world);
    addComponent(world, inputEnt, InputState);
    const input = getComponent(world, inputEnt, InputState)!;
    input.keys.add('Space');

    const floor = createEntity(world);
    addComponent(world, floor, Position, { x: 0, y: 0, z: 0 });
    addComponent(world, floor, RigidBody, { type: 'fixed' });
    addComponent(world, floor, BoxCollider, { hx: 10, hy: 0.25, hz: 10 });

    const player = createEntity(world);
    addComponent(world, player, Position, { x: 0, y: 1.15, z: 0 });
    addComponent(world, player, RigidBody, { type: 'kinematic' });
    addComponent(world, player, BoxCollider, { hx: 0.4, hy: 0.9, hz: 0.4 });
    addComponent(world, player, FPSCamera, { yaw: 0, pitch: 0, height: 1.7 });
    addComponent(world, player, CharacterController, {
      speed: 5,
      jumpSpeed: 6,
      grounded: true,
      _velocityY: 0,
    });

    tick(world, ctx);

    const cc = getComponent(world, player, CharacterController)!;
    expect(cc._velocityY).toBe(6);
  });

  it('player does not fall through a fixed floor after 3 seconds of simulation', () => {
    const world = createWorld();
    const ctx = createPhysicsContext();
    addInput(world);

    const floor = createEntity(world);
    addComponent(world, floor, Position, { x: 0, y: 0, z: 0 });
    addComponent(world, floor, RigidBody, { type: 'fixed' });
    addComponent(world, floor, BoxCollider, { hx: 10, hy: 0.25, hz: 10 });

    const player = createEntity(world);
    addComponent(world, player, Position, { x: 0, y: 2, z: 0 });
    addComponent(world, player, RigidBody, { type: 'kinematic' });
    addComponent(world, player, BoxCollider, { hx: 0.4, hy: 0.9, hz: 0.4 });
    addComponent(world, player, FPSCamera, { yaw: 0, pitch: 0, height: 1.7 });
    addComponent(world, player, CharacterController, {
      speed: 5,
      jumpSpeed: 6,
      grounded: false,
      _velocityY: 0,
    });

    const steps = Math.ceil(3 / DT);
    for (let i = 0; i < steps; i++) {
      tick(world, ctx);
    }

    const pos = getComponent(world, player, Position)!;
    const bottomY = pos.y - 0.9;
    expect(bottomY).toBeGreaterThanOrEqual(0.24);
    expect(hasComponent(world, player, RapierBodyRef)).toBe(true);
  });
});
