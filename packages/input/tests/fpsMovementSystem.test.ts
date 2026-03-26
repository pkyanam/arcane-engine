import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
} from '@arcane-engine/core';
import { describe, expect, it } from 'vitest';
import { Position } from '@arcane-engine/renderer';
import { Controllable, FPSCamera, InputState } from '../src/components.js';
import { fpsMovementSystem } from '../src/fpsMovementSystem.js';

function setupWorld() {
  const world = createWorld();
  const inputEntity = createEntity(world);
  addComponent(world, inputEntity, InputState);
  const input = getComponent(world, inputEntity, InputState)!;
  return { world, input };
}

function addPlayer(
  world: ReturnType<typeof createWorld>,
  yaw = 0,
  pos = { x: 0, y: 0, z: 0 },
) {
  const entity = createEntity(world);
  addComponent(world, entity, Position, pos);
  addComponent(world, entity, Controllable);
  addComponent(world, entity, FPSCamera, { yaw, pitch: 0, height: 1.6 });
  return entity;
}

describe('fpsMovementSystem — no-op cases', () => {
  it('is a no-op when no InputState entity exists', () => {
    const world = createWorld();
    const entity = addPlayer(world);
    expect(() => fpsMovementSystem()(world, 1)).not.toThrow();
    expect(getComponent(world, entity, Position)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('does not move entities that lack FPSCamera', () => {
    const { world, input } = setupWorld();
    const entity = createEntity(world);
    addComponent(world, entity, Position, { x: 0, y: 0, z: 0 });
    addComponent(world, entity, Controllable);
    // No FPSCamera added
    input.keys.add('KeyW');

    fpsMovementSystem(5)(world, 1);

    expect(getComponent(world, entity, Position)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('does not move entities that lack Controllable', () => {
    const { world, input } = setupWorld();
    const entity = createEntity(world);
    addComponent(world, entity, Position, { x: 0, y: 0, z: 0 });
    addComponent(world, entity, FPSCamera, { yaw: 0, pitch: 0, height: 1.6 });
    // No Controllable added
    input.keys.add('KeyW');

    fpsMovementSystem(5)(world, 1);

    expect(getComponent(world, entity, Position)).toEqual({ x: 0, y: 0, z: 0 });
  });
});

describe('fpsMovementSystem — world-axis movement at yaw = 0', () => {
  // At yaw=0, forward = (0, 0, -1) and right = (1, 0, 0).
  it('W moves in -Z direction', () => {
    const { world, input } = setupWorld();
    const entity = addPlayer(world, 0);
    input.keys.add('KeyW');

    fpsMovementSystem(5)(world, 1);

    const pos = getComponent(world, entity, Position)!;
    expect(pos.x).toBeCloseTo(0);
    expect(pos.y).toBe(0); // Y is never touched
    expect(pos.z).toBeCloseTo(-5);
  });

  it('S moves in +Z direction', () => {
    const { world, input } = setupWorld();
    const entity = addPlayer(world, 0);
    input.keys.add('KeyS');

    fpsMovementSystem(5)(world, 1);

    expect(getComponent(world, entity, Position)!.z).toBeCloseTo(5);
  });

  it('D strafes in +X direction', () => {
    const { world, input } = setupWorld();
    const entity = addPlayer(world, 0);
    input.keys.add('KeyD');

    fpsMovementSystem(5)(world, 1);

    expect(getComponent(world, entity, Position)!.x).toBeCloseTo(5);
  });

  it('A strafes in -X direction', () => {
    const { world, input } = setupWorld();
    const entity = addPlayer(world, 0);
    input.keys.add('KeyA');

    fpsMovementSystem(5)(world, 1);

    expect(getComponent(world, entity, Position)!.x).toBeCloseTo(-5);
  });

  it('arrow keys map to the same directions as WASD', () => {
    const { world, input } = setupWorld();
    const entity = addPlayer(world, 0);
    input.keys.add('ArrowUp');

    fpsMovementSystem(5)(world, 1);

    expect(getComponent(world, entity, Position)!.z).toBeCloseTo(-5);
  });

  it('Y position is never modified', () => {
    const { world, input } = setupWorld();
    const entity = addPlayer(world, 0, { x: 0, y: 3, z: 0 });
    input.keys.add('KeyW');
    input.keys.add('KeyD');

    fpsMovementSystem(5)(world, 1);

    expect(getComponent(world, entity, Position)!.y).toBe(3);
  });
});

describe('fpsMovementSystem — rotated movement', () => {
  // At yaw = π/2, the player has turned 90° left.
  // forward = (-sin(π/2), 0, -cos(π/2)) = (-1, 0, 0)
  // right   = (cos(π/2), 0, -sin(π/2))  = (0, 0, -1)
  it('W moves in -X direction when yaw = π/2', () => {
    const { world, input } = setupWorld();
    const entity = addPlayer(world, Math.PI / 2);
    input.keys.add('KeyW');

    fpsMovementSystem(5)(world, 1);

    const pos = getComponent(world, entity, Position)!;
    expect(pos.x).toBeCloseTo(-5);
    expect(pos.z).toBeCloseTo(0);
  });

  it('D strafes in -Z direction when yaw = π/2', () => {
    const { world, input } = setupWorld();
    const entity = addPlayer(world, Math.PI / 2);
    input.keys.add('KeyD');

    fpsMovementSystem(5)(world, 1);

    const pos = getComponent(world, entity, Position)!;
    expect(pos.x).toBeCloseTo(0);
    expect(pos.z).toBeCloseTo(-5);
  });
});

describe('fpsMovementSystem — speed and dt', () => {
  it('applies custom speed', () => {
    const { world, input } = setupWorld();
    const entity = addPlayer(world, 0);
    input.keys.add('KeyW');

    fpsMovementSystem(10)(world, 0.5);

    expect(getComponent(world, entity, Position)!.z).toBeCloseTo(-5);
  });
});
