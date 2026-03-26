import { describe, expect, it, beforeAll } from 'vitest';
import { addComponent, createEntity, createWorld } from '@arcane-engine/core';
import { Position, Rotation } from '@arcane-engine/renderer';
import { BoxCollider, RigidBody } from '../src/components.js';
import { createPhysicsContext, initPhysics } from '../src/physicsContext.js';
import { physicsSystem } from '../src/physicsSystem.js';
import { raycast } from '../src/raycast.js';

beforeAll(async () => {
  await initPhysics();
});

/** Helper: create a physics context with a fixed box at the given position, step once. */
function makeSceneWithBox(bx: number, by: number, bz: number) {
  const world = createWorld();
  const ctx = createPhysicsContext();

  const box = createEntity(world);
  addComponent(world, box, Position, { x: bx, y: by, z: bz });
  addComponent(world, box, Rotation);
  addComponent(world, box, RigidBody, { type: 'fixed' });
  addComponent(world, box, BoxCollider, { hx: 0.5, hy: 0.5, hz: 0.5 });

  const system = physicsSystem(ctx);
  system(world, 1 / 60); // registers the collider with Rapier

  return ctx;
}

describe('raycast — no hit', () => {
  it('returns null when no collider is in the path', () => {
    const ctx = makeSceneWithBox(100, 100, 100); // box far away
    const hit = raycast(ctx, { x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, 10);
    expect(hit).toBeNull();
  });

  it('returns null for a zero-length direction vector', () => {
    const ctx = makeSceneWithBox(0, -2, 0);
    const hit = raycast(ctx, { x: 0, y: 5, z: 0 }, { x: 0, y: 0, z: 0 }, 20);
    expect(hit).toBeNull();
  });
});

describe('raycast — hit', () => {
  it('returns a RaycastHit when a fixed body is in the path', () => {
    const ctx = makeSceneWithBox(0, 0, 0);
    const hit = raycast(ctx, { x: 0, y: 5, z: 0 }, { x: 0, y: -1, z: 0 }, 20);
    expect(hit).not.toBeNull();
  });

  it('hit.distance is approximately correct (within 0.1 m)', () => {
    // Box centre at y = 0, half-extent 0.5 → top surface at y = 0.5.
    // Ray origin at y = 5, pointing down → expected distance ≈ 4.5.
    const ctx = makeSceneWithBox(0, 0, 0);
    const hit = raycast(ctx, { x: 0, y: 5, z: 0 }, { x: 0, y: -1, z: 0 }, 20);
    expect(hit).not.toBeNull();
    expect(hit!.distance).toBeCloseTo(4.5, 0); // within 0.5 (closeTo precision 0 = ±0.5)
    expect(Math.abs(hit!.distance - 4.5)).toBeLessThan(0.1);
  });

  it('hit.colliderHandle is a non-negative integer', () => {
    const ctx = makeSceneWithBox(0, 0, 0);
    const hit = raycast(ctx, { x: 0, y: 5, z: 0 }, { x: 0, y: -1, z: 0 }, 20);
    expect(hit).not.toBeNull();
    expect(Number.isInteger(hit!.colliderHandle)).toBe(true);
    expect(hit!.colliderHandle).toBeGreaterThanOrEqual(0);
  });

  it('hit.normal is a unit vector (length ≈ 1.0)', () => {
    const ctx = makeSceneWithBox(0, 0, 0);
    const hit = raycast(ctx, { x: 0, y: 5, z: 0 }, { x: 0, y: -1, z: 0 }, 20);
    expect(hit).not.toBeNull();
    const { x, y, z } = hit!.normal;
    const len = Math.sqrt(x * x + y * y + z * z);
    expect(len).toBeCloseTo(1.0, 5);
  });

  it('normalises un-normalised direction input without throwing', () => {
    const ctx = makeSceneWithBox(0, 0, 0);
    // Direction vector with length > 1; should still work correctly.
    expect(() =>
      raycast(ctx, { x: 0, y: 5, z: 0 }, { x: 0, y: -3, z: 0 }, 20),
    ).not.toThrow();
    const hit = raycast(ctx, { x: 0, y: 5, z: 0 }, { x: 0, y: -3, z: 0 }, 20);
    expect(hit).not.toBeNull();
  });
});
