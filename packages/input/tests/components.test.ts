import { describe, expect, it } from 'vitest';
import { Controllable, InputState } from '../src/components.js';

describe('InputState', () => {
  it('has default keyboard and mouse state', () => {
    expect(InputState.default()).toEqual({
      keys: new Set(),
      mouse: { x: 0, y: 0, dx: 0, dy: 0 },
      mouseButtons: new Set(),
    });
  });

  it('returns fresh nested values on each call', () => {
    const first = InputState.default();
    const second = InputState.default();

    expect(first).not.toBe(second);
    expect(first.keys).not.toBe(second.keys);
    expect(first.mouse).not.toBe(second.mouse);
    expect(first.mouseButtons).not.toBe(second.mouseButtons);

    first.keys.add('KeyW');
    first.mouse.dx = 12;
    first.mouseButtons.add(0);

    expect(second.keys.size).toBe(0);
    expect(second.mouse.dx).toBe(0);
    expect(second.mouseButtons.size).toBe(0);
  });
});

describe('Controllable', () => {
  it('has an empty object default', () => {
    expect(Controllable.default()).toEqual({});
  });

  it('returns a fresh object on each call', () => {
    const first = Controllable.default();
    const second = Controllable.default();

    expect(first).not.toBe(second);
  });
});
