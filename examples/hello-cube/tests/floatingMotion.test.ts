import { addComponent, createEntity, createWorld, getComponent } from '@arcane-engine/core';
import { describe, expect, it } from 'vitest';
import { Position } from '@arcane-engine/renderer';
import { FloatingMotion, floatingMotionSystem } from '../src/floatingMotion.js';

describe('floatingMotionSystem', () => {
  it('moves entities by their configured velocity', () => {
    const world = createWorld();
    const entity = createEntity(world);

    addComponent(world, entity, Position, { x: 1, y: 2, z: 3 });
    addComponent(world, entity, FloatingMotion, {
      velocity: { x: 2, y: -1, z: 0.5 },
      bounds: {
        minX: -10,
        maxX: 10,
        minY: -10,
        maxY: 10,
        minZ: -10,
        maxZ: 10,
      },
    });

    floatingMotionSystem(world, 0.5);

    expect(getComponent(world, entity, Position)).toEqual({
      x: 2,
      y: 1.5,
      z: 3.25,
    });
  });

  it('clamps positions and reverses velocity when bounds are hit', () => {
    const world = createWorld();
    const entity = createEntity(world);

    addComponent(world, entity, Position, { x: 1.9, y: 1.9, z: -1.9 });
    addComponent(world, entity, FloatingMotion, {
      velocity: { x: 2, y: 2, z: -2 },
      bounds: {
        minX: -2,
        maxX: 2,
        minY: 1,
        maxY: 2,
        minZ: -2,
        maxZ: 2,
      },
    });

    floatingMotionSystem(world, 0.2);

    expect(getComponent(world, entity, Position)).toEqual({
      x: 2,
      y: 2,
      z: -2,
    });
    expect(getComponent(world, entity, FloatingMotion)?.velocity).toEqual({
      x: -2,
      y: -2,
      z: 2,
    });
  });
});
