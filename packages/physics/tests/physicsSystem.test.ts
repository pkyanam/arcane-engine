import { describe, expect, it, beforeAll } from 'vitest';
import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
  hasComponent,
} from '@arcane-engine/core';
import { Position, Rotation } from '@arcane-engine/renderer';
import { BoxCollider, RapierBodyRef, RigidBody } from '../src/components.js';
import { createPhysicsContext, initPhysics } from '../src/physicsContext.js';
import { physicsSystem } from '../src/physicsSystem.js';

beforeAll(async () => {
  await initPhysics();
});

describe('physicsSystem — lazy body creation', () => {
  it('adds RapierBodyRef after the first tick', () => {
    const world = createWorld();
    const ctx = createPhysicsContext();

    const entity = createEntity(world);
    addComponent(world, entity, Position, { x: 0, y: 5, z: 0 });
    addComponent(world, entity, Rotation);
    addComponent(world, entity, RigidBody, { type: 'dynamic' });
    addComponent(world, entity, BoxCollider, { hx: 0.5, hy: 0.5, hz: 0.5 });

    expect(hasComponent(world, entity, RapierBodyRef)).toBe(false);

    const system = physicsSystem(ctx);
    system(world, 1 / 60);

    expect(hasComponent(world, entity, RapierBodyRef)).toBe(true);
    const ref = getComponent(world, entity, RapierBodyRef);
    expect(ref?.handle).toBeGreaterThanOrEqual(0);
  });

  it('does not create duplicate bodies on subsequent ticks', () => {
    const world = createWorld();
    const ctx = createPhysicsContext();

    const entity = createEntity(world);
    addComponent(world, entity, Position, { x: 0, y: 5, z: 0 });
    addComponent(world, entity, Rotation);
    addComponent(world, entity, RigidBody, { type: 'dynamic' });
    addComponent(world, entity, BoxCollider, { hx: 0.5, hy: 0.5, hz: 0.5 });

    const system = physicsSystem(ctx);
    system(world, 1 / 60);
    const handleAfterFirst = getComponent(world, entity, RapierBodyRef)!.handle;

    system(world, 1 / 60);
    const handleAfterSecond = getComponent(world, entity, RapierBodyRef)!.handle;

    expect(handleAfterFirst).toBe(handleAfterSecond);
  });
});

describe('physicsSystem — gravity simulation', () => {
  it('dynamic body falls under gravity over 60 ticks (~1 second)', () => {
    const world = createWorld();
    const ctx = createPhysicsContext();

    const entity = createEntity(world);
    addComponent(world, entity, Position, { x: 0, y: 10, z: 0 });
    addComponent(world, entity, Rotation);
    addComponent(world, entity, RigidBody, { type: 'dynamic' });
    addComponent(world, entity, BoxCollider, { hx: 0.5, hy: 0.5, hz: 0.5 });

    const system = physicsSystem(ctx);
    for (let i = 0; i < 60; i++) {
      system(world, 1 / 60);
    }

    const pos = getComponent(world, entity, Position)!;
    // After ~1 s, y ≈ 10 - 4.9 ≈ 5.1. Must be clearly below the start.
    expect(pos.y).toBeLessThan(9);
  });

  it('dynamic body rotation is updated after falling', () => {
    const world = createWorld();
    const ctx = createPhysicsContext();

    const entity = createEntity(world);
    addComponent(world, entity, Position, { x: 0.1, y: 10, z: 0 });
    addComponent(world, entity, Rotation, { x: 0, y: 0, z: 0 });
    addComponent(world, entity, RigidBody, { type: 'dynamic' });
    addComponent(world, entity, BoxCollider, { hx: 0.5, hy: 0.5, hz: 0.5 });

    const system = physicsSystem(ctx);
    for (let i = 0; i < 60; i++) {
      system(world, 1 / 60);
    }

    // Rotation component must be a finite number (not NaN / undefined).
    const rot = getComponent(world, entity, Rotation)!;
    expect(Number.isFinite(rot.x)).toBe(true);
    expect(Number.isFinite(rot.y)).toBe(true);
    expect(Number.isFinite(rot.z)).toBe(true);
  });
});

describe('physicsSystem — fixed bodies', () => {
  it('fixed body position is not modified by the physics system', () => {
    const world = createWorld();
    const ctx = createPhysicsContext();

    const entity = createEntity(world);
    addComponent(world, entity, Position, { x: 0, y: -1, z: 0 });
    addComponent(world, entity, Rotation);
    addComponent(world, entity, RigidBody, { type: 'fixed' });
    addComponent(world, entity, BoxCollider, { hx: 10, hy: 0.5, hz: 10 });

    const system = physicsSystem(ctx);
    for (let i = 0; i < 10; i++) {
      system(world, 1 / 60);
    }

    const pos = getComponent(world, entity, Position)!;
    // Fixed body must remain exactly where it was placed.
    expect(pos.y).toBe(-1);
  });
});

describe('physicsSystem — collision', () => {
  it('dynamic cube settles on a fixed ground within 3 seconds', () => {
    const world = createWorld();
    const ctx = createPhysicsContext();

    // Ground
    const ground = createEntity(world);
    addComponent(world, ground, Position, { x: 0, y: 0, z: 0 });
    addComponent(world, ground, Rotation);
    addComponent(world, ground, RigidBody, { type: 'fixed' });
    addComponent(world, ground, BoxCollider, { hx: 10, hy: 0.5, hz: 10, friction: 0.5 });

    // Cube dropped from y = 5
    const cube = createEntity(world);
    addComponent(world, cube, Position, { x: 0, y: 5, z: 0 });
    addComponent(world, cube, Rotation);
    addComponent(world, cube, RigidBody, { type: 'dynamic' });
    addComponent(world, cube, BoxCollider, { hx: 0.5, hy: 0.5, hz: 0.5, restitution: 0.1 });

    const system = physicsSystem(ctx);
    // Simulate 3 seconds
    for (let i = 0; i < 180; i++) {
      system(world, 1 / 60);
    }

    const pos = getComponent(world, cube, Position)!;
    // Cube should rest on the ground surface. Ground top = 0.5, cube half = 0.5, so y ≈ 1.
    expect(pos.y).toBeGreaterThan(0.3);
    expect(pos.y).toBeLessThan(2.0);
  });
});

describe('physicsSystem — kinematic bodies', () => {
  it('kinematic body has RapierBodyRef after the first tick', () => {
    const world = createWorld();
    const ctx = createPhysicsContext();

    const entity = createEntity(world);
    addComponent(world, entity, Position, { x: 0, y: 3, z: 0 });
    addComponent(world, entity, Rotation);
    addComponent(world, entity, RigidBody, { type: 'kinematic' });
    addComponent(world, entity, BoxCollider, { hx: 0.5, hy: 0.5, hz: 0.5 });

    const system = physicsSystem(ctx);
    system(world, 1 / 60);

    expect(hasComponent(world, entity, RapierBodyRef)).toBe(true);
    const ref = getComponent(world, entity, RapierBodyRef);
    expect(ref?.handle).toBeGreaterThanOrEqual(0);
  });

  it('kinematic body ECS position is NOT updated by physicsSystem', () => {
    const world = createWorld();
    const ctx = createPhysicsContext();

    const entity = createEntity(world);
    addComponent(world, entity, Position, { x: 0, y: 5, z: 0 });
    addComponent(world, entity, Rotation);
    addComponent(world, entity, RigidBody, { type: 'kinematic' });
    addComponent(world, entity, BoxCollider, { hx: 0.5, hy: 0.5, hz: 0.5 });

    const system = physicsSystem(ctx);
    for (let i = 0; i < 60; i++) {
      system(world, 1 / 60);
    }

    // Kinematic bodies are not driven by the simulation; position must stay at 5.
    const pos = getComponent(world, entity, Position)!;
    expect(pos.y).toBe(5);
  });

  it('dynamic cube stops at a kinematic floor', () => {
    const world = createWorld();
    const ctx = createPhysicsContext();

    // Kinematic floor at y = 0
    const floor = createEntity(world);
    addComponent(world, floor, Position, { x: 0, y: 0, z: 0 });
    addComponent(world, floor, Rotation);
    addComponent(world, floor, RigidBody, { type: 'kinematic' });
    addComponent(world, floor, BoxCollider, { hx: 10, hy: 0.5, hz: 10 });

    // Dynamic cube dropped from y = 5
    const cube = createEntity(world);
    addComponent(world, cube, Position, { x: 0, y: 5, z: 0 });
    addComponent(world, cube, Rotation);
    addComponent(world, cube, RigidBody, { type: 'dynamic' });
    addComponent(world, cube, BoxCollider, { hx: 0.5, hy: 0.5, hz: 0.5, restitution: 0.0 });

    const system = physicsSystem(ctx);
    for (let i = 0; i < 180; i++) {
      system(world, 1 / 60);
    }

    // Cube rests on the kinematic floor. Floor top ≈ 0.5, cube half ≈ 0.5, so y ≈ 1.
    const pos = getComponent(world, cube, Position)!;
    expect(pos.y).toBeGreaterThan(0.3);
    expect(pos.y).toBeLessThan(2.0);
  });
});

describe('physicsSystem — entities without Position', () => {
  it('does not throw for entities missing Position component', () => {
    const world = createWorld();
    const ctx = createPhysicsContext();

    const entity = createEntity(world);
    addComponent(world, entity, RigidBody, { type: 'dynamic' });
    addComponent(world, entity, BoxCollider, { hx: 0.5, hy: 0.5, hz: 0.5 });
    // No Position added

    const system = physicsSystem(ctx);
    expect(() => system(world, 1 / 60)).not.toThrow();
  });
});
