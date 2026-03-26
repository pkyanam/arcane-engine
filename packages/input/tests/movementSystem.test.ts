import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
} from '@arcane-engine/core';
import { describe, expect, it } from 'vitest';
import { Position } from '@arcane-engine/renderer';
import { Controllable, InputState } from '../src/components.js';
import { movementSystem } from '../src/movementSystem.js';

function setupInputWorld() {
  const world = createWorld();
  const inputEntity = createEntity(world);
  addComponent(world, inputEntity, InputState);
  const input = getComponent(world, inputEntity, InputState)!;

  return { world, input };
}

function setupPlayer(world: ReturnType<typeof createWorld>) {
  const player = createEntity(world);
  addComponent(world, player, Position, { x: 0, y: 0, z: 0 });
  addComponent(world, player, Controllable);
  return player;
}

describe('movementSystem', () => {
  it('is a no-op when no InputState entity exists', () => {
    const world = createWorld();
    const player = setupPlayer(world);
    const position = getComponent(world, player, Position)!;

    expect(() => movementSystem()(world, 1)).not.toThrow();
    expect(position).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('moves controllable entities forward with KeyW', () => {
    const { world, input } = setupInputWorld();
    const player = setupPlayer(world);
    input.keys.add('KeyW');

    movementSystem(5)(world, 1);

    expect(getComponent(world, player, Position)!.z).toBe(-5);
  });

  it('moves controllable entities backward with KeyS', () => {
    const { world, input } = setupInputWorld();
    const player = setupPlayer(world);
    input.keys.add('KeyS');

    movementSystem(5)(world, 1);

    expect(getComponent(world, player, Position)!.z).toBe(5);
  });

  it('moves controllable entities left with KeyA', () => {
    const { world, input } = setupInputWorld();
    const player = setupPlayer(world);
    input.keys.add('KeyA');

    movementSystem(5)(world, 1);

    expect(getComponent(world, player, Position)!.x).toBe(-5);
  });

  it('moves controllable entities right with KeyD', () => {
    const { world, input } = setupInputWorld();
    const player = setupPlayer(world);
    input.keys.add('KeyD');

    movementSystem(5)(world, 1);

    expect(getComponent(world, player, Position)!.x).toBe(5);
  });

  it('supports arrow keys with the same movement mapping as WASD', () => {
    const { world, input } = setupInputWorld();
    const player = setupPlayer(world);

    input.keys.add('ArrowUp');
    input.keys.add('ArrowRight');

    movementSystem(2)(world, 0.5);

    expect(getComponent(world, player, Position)).toEqual({
      x: 1,
      y: 0,
      z: -1,
    });
  });

  it('does not move entities without Controllable', () => {
    const { world, input } = setupInputWorld();
    const entity = createEntity(world);
    addComponent(world, entity, Position, { x: 0, y: 0, z: 0 });
    input.keys.add('KeyW');

    movementSystem(5)(world, 1);

    expect(getComponent(world, entity, Position)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('applies a custom speed value', () => {
    const { world, input } = setupInputWorld();
    const player = setupPlayer(world);
    input.keys.add('KeyD');

    movementSystem(12)(world, 0.25);

    expect(getComponent(world, player, Position)!.x).toBe(3);
  });

  it('handles large controllable sets within a practical frame budget', () => {
    const { world, input } = setupInputWorld();

    for (let index = 0; index < 1000; index += 1) {
      setupPlayer(world);
    }

    input.keys.add('KeyW');
    const system = movementSystem(5);
    const start = performance.now();

    system(world, 1 / 60);

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(5);
  });
});
