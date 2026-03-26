import { describe, expect, it } from 'vitest';
import { addComponent, createEntity, createWorld, getComponent, hasComponent } from '@arcane-engine/core';
import { BoxCollider, RapierBodyRef, RigidBody } from '../src/components.js';

describe('RigidBody', () => {
  it('has name "RigidBody"', () => {
    expect(RigidBody.name).toBe('RigidBody');
  });

  it('defaults to type "dynamic"', () => {
    expect(RigidBody.default()).toEqual({ type: 'dynamic' });
  });

  it('default factory returns a fresh object each call', () => {
    expect(RigidBody.default()).not.toBe(RigidBody.default());
  });

  it('can be added and retrieved from an entity', () => {
    const world = createWorld();
    const entity = createEntity(world);
    addComponent(world, entity, RigidBody, { type: 'fixed' });
    const comp = getComponent(world, entity, RigidBody);
    expect(comp?.type).toBe('fixed');
  });
});

describe('BoxCollider', () => {
  it('has name "BoxCollider"', () => {
    expect(BoxCollider.name).toBe('BoxCollider');
  });

  it('defaults to hx/hy/hz of 0.5 with no restitution or friction', () => {
    expect(BoxCollider.default()).toEqual({ hx: 0.5, hy: 0.5, hz: 0.5 });
  });

  it('default factory returns a fresh object each call', () => {
    expect(BoxCollider.default()).not.toBe(BoxCollider.default());
  });

  it('stores custom half-extents and surface properties', () => {
    const world = createWorld();
    const entity = createEntity(world);
    addComponent(world, entity, BoxCollider, {
      hx: 2,
      hy: 0.1,
      hz: 3,
      restitution: 0.5,
      friction: 0.8,
    });
    const comp = getComponent(world, entity, BoxCollider);
    expect(comp?.hx).toBe(2);
    expect(comp?.hy).toBe(0.1);
    expect(comp?.hz).toBe(3);
    expect(comp?.restitution).toBe(0.5);
    expect(comp?.friction).toBe(0.8);
  });
});

describe('RapierBodyRef', () => {
  it('has name "RapierBodyRef"', () => {
    expect(RapierBodyRef.name).toBe('RapierBodyRef');
  });

  it('defaults to handle -1', () => {
    expect(RapierBodyRef.default()).toEqual({ handle: -1 });
  });

  it('is not present on a plain entity', () => {
    const world = createWorld();
    const entity = createEntity(world);
    addComponent(world, entity, RigidBody);
    addComponent(world, entity, BoxCollider);
    expect(hasComponent(world, entity, RapierBodyRef)).toBe(false);
  });
});
