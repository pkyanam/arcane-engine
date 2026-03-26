import { addComponent, createEntity, createWorld } from '@arcane-engine/core';
import { describe, expect, it, beforeAll } from 'vitest';
import { Position, Rotation } from '@arcane-engine/renderer';
import {
  BoxCollider,
  createPhysicsContext,
  initPhysics,
  physicsSystem,
  RigidBody,
  raycast,
} from '@arcane-engine/physics';
import { findEntityByColliderHandle } from '../src/colliderLookup.js';

beforeAll(async () => {
  await initPhysics();
});

describe('findEntityByColliderHandle', () => {
  it('returns the ECS entity that owns the hit collider', () => {
    const world = createWorld();
    const physCtx = createPhysicsContext();

    const target = createEntity(world);
    addComponent(world, target, Position, { x: 0, y: 0, z: 0 });
    addComponent(world, target, Rotation);
    addComponent(world, target, RigidBody, { type: 'fixed' });
    addComponent(world, target, BoxCollider, { hx: 0.5, hy: 0.5, hz: 0.5 });

    physicsSystem(physCtx)(world, 1 / 60);

    const hit = raycast(physCtx, { x: 0, y: 5, z: 0 }, { x: 0, y: -1, z: 0 }, 20);
    expect(hit).not.toBeNull();

    const resolved = findEntityByColliderHandle(world, physCtx, hit!.colliderHandle);
    expect(resolved).toBe(target);
  });
});
