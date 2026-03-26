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
import { FPSCamera, InputState } from '../src/components.js';
import { fpsCameraSystem } from '../src/fpsCameraSystem.js';

function makeMockCtx(): RendererContext {
  return {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    renderer: { render: vi.fn() } as unknown as THREE.WebGLRenderer,
  };
}

function addInputEntity(world: ReturnType<typeof createWorld>, dx = 0, dy = 0) {
  const entity = createEntity(world);
  addComponent(world, entity, InputState);
  const input = getComponent(world, entity, InputState)!;
  input.mouse.dx = dx;
  input.mouse.dy = dy;
  return input;
}

function addPlayer(
  world: ReturnType<typeof createWorld>,
  pos = { x: 0, y: 0, z: 0 },
  cam = { yaw: 0, pitch: 0, height: 1.6 },
) {
  const entity = createEntity(world);
  addComponent(world, entity, Position, pos);
  addComponent(world, entity, FPSCamera, cam);
  return entity;
}

describe('fpsCameraSystem — no-op cases', () => {
  it('does not throw when there is no InputState entity', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    addPlayer(world);
    expect(() => fpsCameraSystem(ctx)(world, 1 / 60)).not.toThrow();
  });

  it('does not throw when there is no FPSCamera entity', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    addInputEntity(world, 10, 5);
    expect(() => fpsCameraSystem(ctx)(world, 1 / 60)).not.toThrow();
  });

  it('clears mouse delta even when no FPSCamera entity exists', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    const input = addInputEntity(world, 10, 5);

    fpsCameraSystem(ctx)(world, 1 / 60);

    expect(input.mouse.dx).toBe(0);
    expect(input.mouse.dy).toBe(0);
  });
});

describe('fpsCameraSystem — camera position', () => {
  it('positions camera at entity Position with height offset', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    addInputEntity(world);
    addPlayer(world, { x: 3, y: 1, z: -5 }, { yaw: 0, pitch: 0, height: 1.6 });

    fpsCameraSystem(ctx)(world, 1 / 60);

    expect(ctx.camera.position.x).toBeCloseTo(3);
    expect(ctx.camera.position.y).toBeCloseTo(1 + 1.6);
    expect(ctx.camera.position.z).toBeCloseTo(-5);
  });

  it('respects custom height values', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    addInputEntity(world);
    addPlayer(world, { x: 0, y: 2, z: 0 }, { yaw: 0, pitch: 0, height: 2.0 });

    fpsCameraSystem(ctx)(world, 1 / 60);

    expect(ctx.camera.position.y).toBeCloseTo(4.0);
  });
});

describe('fpsCameraSystem — yaw and pitch', () => {
  it('updates FPSCamera.yaw from mouse dx', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    addInputEntity(world, 100, 0);
    const entity = addPlayer(world);
    const cam = getComponent(world, entity, FPSCamera)!;

    fpsCameraSystem(ctx, { sensitivity: 0.002 })(world, 1 / 60);

    expect(cam.yaw).toBeCloseTo(-0.2);
  });

  it('updates FPSCamera.pitch from mouse dy', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    addInputEntity(world, 0, 50);
    const entity = addPlayer(world);
    const cam = getComponent(world, entity, FPSCamera)!;

    fpsCameraSystem(ctx, { sensitivity: 0.002 })(world, 1 / 60);

    expect(cam.pitch).toBeCloseTo(-0.1);
  });

  it('clamps pitch to +85°', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    addInputEntity(world, 0, -1_000_000);
    const entity = addPlayer(world);
    const cam = getComponent(world, entity, FPSCamera)!;

    fpsCameraSystem(ctx)(world, 1 / 60);

    const maxPitch = (85 * Math.PI) / 180;
    expect(cam.pitch).toBeCloseTo(maxPitch);
  });

  it('clamps pitch to -85°', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    addInputEntity(world, 0, 1_000_000);
    const entity = addPlayer(world);
    const cam = getComponent(world, entity, FPSCamera)!;

    fpsCameraSystem(ctx)(world, 1 / 60);

    const minPitch = -(85 * Math.PI) / 180;
    expect(cam.pitch).toBeCloseTo(minPitch);
  });

  it('applies yaw and pitch to camera rotation using YXZ order', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    addInputEntity(world);
    addPlayer(world, { x: 0, y: 0, z: 0 }, { yaw: 1.0, pitch: 0.5, height: 1.6 });

    fpsCameraSystem(ctx)(world, 1 / 60);

    expect(ctx.camera.rotation.order).toBe('YXZ');
    expect(ctx.camera.rotation.y).toBeCloseTo(1.0);
    expect(ctx.camera.rotation.x).toBeCloseTo(-0.5);
  });
});

describe('fpsCameraSystem — mouse delta consumption', () => {
  it('clears dx and dy after each tick', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    const input = addInputEntity(world, 30, -10);
    addPlayer(world);

    fpsCameraSystem(ctx)(world, 1 / 60);

    expect(input.mouse.dx).toBe(0);
    expect(input.mouse.dy).toBe(0);
  });

  it('does not accumulate yaw across ticks with no new mouse input', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    const input = addInputEntity(world, 100, 0);
    const entity = addPlayer(world);
    const cam = getComponent(world, entity, FPSCamera)!;
    const system = fpsCameraSystem(ctx, { sensitivity: 0.002 });

    system(world, 1 / 60); // yaw changes by -0.2
    const yawAfterFirst = cam.yaw;

    input.mouse.dx = 0;
    system(world, 1 / 60); // no new input → yaw stays

    expect(cam.yaw).toBeCloseTo(yawAfterFirst);
  });
});
