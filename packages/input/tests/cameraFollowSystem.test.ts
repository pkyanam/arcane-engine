import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
} from '@arcane-engine/core';
import { describe, expect, it, vi } from 'vitest';
import { Position } from '@arcane-engine/renderer';
import type { RendererContext } from '@arcane-engine/renderer';
import * as THREE from 'three';
import { Controllable, InputState } from '../src/components.js';
import { cameraFollowSystem } from '../src/cameraFollowSystem.js';

function makeMockCtx(): RendererContext {
  return {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    renderer: { render: vi.fn() } as unknown as THREE.WebGLRenderer,
  };
}

function addPlayer(world: ReturnType<typeof createWorld>, position = { x: 1, y: 2, z: 3 }) {
  const entity = createEntity(world);
  addComponent(world, entity, Position, position);
  addComponent(world, entity, Controllable);
  return entity;
}

function addInput(world: ReturnType<typeof createWorld>, dx = 0, dy = 0) {
  const entity = createEntity(world);
  addComponent(world, entity, InputState);
  const input = getComponent(world, entity, InputState)!;
  input.mouse.dx = dx;
  input.mouse.dy = dy;
  return input;
}

function expectCameraLookingAt(ctx: RendererContext, target: { x: number; y: number; z: number }) {
  ctx.camera.updateMatrixWorld(true);

  const expectedDirection = new THREE.Vector3(
    target.x - ctx.camera.position.x,
    target.y - ctx.camera.position.y,
    target.z - ctx.camera.position.z,
  ).normalize();
  const actualDirection = new THREE.Vector3();

  ctx.camera.getWorldDirection(actualDirection);

  expect(actualDirection.x).toBeCloseTo(expectedDirection.x, 5);
  expect(actualDirection.y).toBeCloseTo(expectedDirection.y, 5);
  expect(actualDirection.z).toBeCloseTo(expectedDirection.z, 5);
}

describe('cameraFollowSystem', () => {
  it('is a no-op when there is no controllable entity', () => {
    const world = createWorld();
    const ctx = makeMockCtx();

    expect(() => cameraFollowSystem(ctx)(world, 0)).not.toThrow();
  });

  it('positions the camera relative to the target even without InputState', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    addPlayer(world, { x: 1, y: 2, z: 3 });

    cameraFollowSystem(ctx)(world, 0);

    expect(ctx.camera.position.x).toBeCloseTo(1, 5);
    expect(ctx.camera.position.y).toBeCloseTo(2 + 10 * Math.sin(0.4), 5);
    expect(ctx.camera.position.z).toBeCloseTo(3 + 10 * Math.cos(0.4), 5);
  });

  it('orients the camera to look at the controllable entity position', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    addPlayer(world, { x: 4, y: 1, z: -2 });

    cameraFollowSystem(ctx)(world, 0);

    expectCameraLookingAt(ctx, { x: 4, y: 1, z: -2 });
  });

  it('changes horizontal orbit position from mouse dx input', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    addPlayer(world, { x: 0, y: 0, z: 0 });
    addInput(world, 100, 0);

    cameraFollowSystem(ctx)(world, 0);

    expect(ctx.camera.position.x).toBeCloseTo(10 * Math.sin(-0.3) * Math.cos(0.4), 5);
    expect(ctx.camera.position.z).toBeCloseTo(10 * Math.cos(-0.3) * Math.cos(0.4), 5);
  });

  it('changes vertical orbit position from mouse dy input', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    addPlayer(world, { x: 0, y: 0, z: 0 });
    addInput(world, 0, -100);

    cameraFollowSystem(ctx)(world, 0);

    expect(ctx.camera.position.y).toBeCloseTo(10 * Math.sin(0.7), 5);
  });

  it('clamps pitch to plus or minus sixty degrees', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    addPlayer(world, { x: 0, y: 0, z: 0 });
    addInput(world, 0, -100000);

    cameraFollowSystem(ctx)(world, 0);

    expect(ctx.camera.position.y).toBeCloseTo(10 * Math.sin(Math.PI / 3), 5);
    expect(ctx.camera.position.z).toBeCloseTo(10 * Math.cos(Math.PI / 3), 5);
  });

  it('resets consumed mouse deltas after each run', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    addPlayer(world, { x: 0, y: 0, z: 0 });
    const input = addInput(world, 4, -6);

    cameraFollowSystem(ctx)(world, 0);

    expect(input.mouse.dx).toBe(0);
    expect(input.mouse.dy).toBe(0);
  });

  it('respects radius and sensitivity options', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    addPlayer(world, { x: 0, y: 0, z: 0 });
    addInput(world, 10, 0);

    cameraFollowSystem(ctx, { radius: 5, sensitivity: 0.1, initialPitch: 0 })(world, 0);

    expect(ctx.camera.position.x).toBeCloseTo(5 * Math.sin(-1), 5);
    expect(ctx.camera.position.y).toBeCloseTo(0, 5);
    expect(ctx.camera.position.z).toBeCloseTo(5 * Math.cos(-1), 5);
  });
});
