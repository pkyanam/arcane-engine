import { defineComponent } from '@arcane-engine/core';

/**
 * Singleton-style input snapshot written by the DOM input manager.
 */
export const InputState = defineComponent<{
  keys: Set<string>;
  mouse: { x: number; y: number; dx: number; dy: number };
}>('InputState', () => ({
  keys: new Set(),
  mouse: { x: 0, y: 0, dx: 0, dy: 0 },
}));

/**
 * Tag component for entities that should respond to player input.
 */
export const Controllable = defineComponent('Controllable', () => ({}));
