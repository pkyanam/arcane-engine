import { describe, expect, it, beforeAll } from 'vitest';
import { createPhysicsContext, initPhysics } from '../src/physicsContext.js';

describe('initPhysics', () => {
  it('resolves without error', async () => {
    await expect(initPhysics()).resolves.toBeUndefined();
  });

  it('is idempotent — calling twice does not throw', async () => {
    await expect(initPhysics()).resolves.toBeUndefined();
    await expect(initPhysics()).resolves.toBeUndefined();
  });
});

describe('createPhysicsContext', () => {
  beforeAll(async () => {
    await initPhysics();
  });

  it('returns a context with a Rapier world', () => {
    const ctx = createPhysicsContext();
    expect(ctx).toBeDefined();
    expect(ctx.world).toBeDefined();
  });

  it('uses default gravity of (0, -9.81, 0)', () => {
    const ctx = createPhysicsContext();
    const g = ctx.world.gravity;
    expect(g.x).toBeCloseTo(0);
    expect(g.y).toBeCloseTo(-9.81);
    expect(g.z).toBeCloseTo(0);
  });

  it('accepts a custom gravity vector', () => {
    const ctx = createPhysicsContext({ gravity: { x: 0, y: -1.62, z: 0 } });
    expect(ctx.world.gravity.y).toBeCloseTo(-1.62);
  });

  it('accepts partial gravity overrides', () => {
    const ctx = createPhysicsContext({ gravity: { y: -3.7 } });
    expect(ctx.world.gravity.x).toBeCloseTo(0);
    expect(ctx.world.gravity.y).toBeCloseTo(-3.7);
    expect(ctx.world.gravity.z).toBeCloseTo(0);
  });

  it('each call returns an independent world', () => {
    const a = createPhysicsContext();
    const b = createPhysicsContext();
    expect(a.world).not.toBe(b.world);
  });
});
