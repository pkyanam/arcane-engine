import { getComponent, query } from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';
import { Position } from '@arcane-engine/renderer';
import { Controllable, InputState } from './components.js';

/**
 * Create a movement system that translates controllable entities on the X/Z
 * plane using WASD or arrow-key input.
 */
export const movementSystem = (speed = 5): SystemFn =>
  (world: World, dt: number): void => {
    const inputEntities = query(world, [InputState]);
    if (!inputEntities.length) return;

    const input = getComponent(world, inputEntities[0], InputState)!;

    for (const entity of query(world, [Controllable, Position])) {
      const position = getComponent(world, entity, Position)!;

      if (input.keys.has('KeyW') || input.keys.has('ArrowUp')) position.z -= speed * dt;
      if (input.keys.has('KeyS') || input.keys.has('ArrowDown')) position.z += speed * dt;
      if (input.keys.has('KeyA') || input.keys.has('ArrowLeft')) position.x -= speed * dt;
      if (input.keys.has('KeyD') || input.keys.has('ArrowRight')) position.x += speed * dt;
    }
  };
