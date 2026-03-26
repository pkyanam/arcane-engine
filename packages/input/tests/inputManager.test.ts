import { createWorld, getComponent } from '@arcane-engine/core';
import { describe, expect, it } from 'vitest';
import { InputState } from '../src/components.js';
import { createInputManager } from '../src/inputManager.js';

function dispatchMouseMove(
  movementX: number,
  movementY: number,
  clientX: number,
  clientY: number,
): void {
  const event = new MouseEvent('mousemove', { clientX, clientY });

  Object.defineProperties(event, {
    movementX: { value: movementX },
    movementY: { value: movementY },
  });

  window.dispatchEvent(event);
}

describe('createInputManager', () => {
  it('returns an input entity handle with a dispose function', () => {
    const world = createWorld();
    const handle = createInputManager(world);

    expect(handle.entity).toEqual(expect.any(Number));
    expect(handle.dispose).toEqual(expect.any(Function));

    handle.dispose();
  });

  it('adds InputState with default values to the created entity', () => {
    const world = createWorld();
    const handle = createInputManager(world);
    const input = getComponent(world, handle.entity, InputState);

    expect(input).toEqual({
      keys: new Set(),
      mouse: { x: 0, y: 0, dx: 0, dy: 0 },
    });

    handle.dispose();
  });

  it('tracks keydown events using KeyboardEvent.code', () => {
    const world = createWorld();
    const handle = createInputManager(world);
    const input = getComponent(world, handle.entity, InputState)!;

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));

    expect(input.keys.has('KeyW')).toBe(true);

    handle.dispose();
  });

  it('removes pressed keys on keyup', () => {
    const world = createWorld();
    const handle = createInputManager(world);
    const input = getComponent(world, handle.entity, InputState)!;

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));

    expect(input.keys.has('KeyW')).toBe(false);

    handle.dispose();
  });

  it('accumulates mouse deltas across multiple mousemove events', () => {
    const world = createWorld();
    const handle = createInputManager(world);
    const input = getComponent(world, handle.entity, InputState)!;

    dispatchMouseMove(5, -3, 100, 200);
    dispatchMouseMove(-2, 4, 120, 180);

    expect(input.mouse).toEqual({
      x: 120,
      y: 180,
      dx: 3,
      dy: 1,
    });

    handle.dispose();
  });

  it('stops tracking input after dispose removes event listeners', () => {
    const world = createWorld();
    const handle = createInputManager(world);
    const input = getComponent(world, handle.entity, InputState)!;

    handle.dispose();

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    dispatchMouseMove(5, -3, 100, 200);

    expect(input.keys.size).toBe(0);
    expect(input.mouse).toEqual({ x: 0, y: 0, dx: 0, dy: 0 });
  });
});
