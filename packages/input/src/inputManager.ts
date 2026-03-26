import { addComponent, createEntity, getComponent } from '@arcane-engine/core';
import type { Entity, World } from '@arcane-engine/core';
import { InputState } from './components.js';

/**
 * Handle returned by {@link createInputManager}.
 */
export interface InputManagerHandle {
  /** ECS entity that stores the shared {@link InputState}. */
  readonly entity: Entity;
  /** Remove the DOM event listeners owned by this input manager. */
  dispose(): void;
}

/**
 * Create a DOM-backed input manager and mirror browser events into ECS state.
 */
export function createInputManager(world: World): InputManagerHandle {
  const entity = createEntity(world);
  addComponent(world, entity, InputState);

  function onKeyDown(event: KeyboardEvent): void {
    getComponent(world, entity, InputState)?.keys.add(event.code);
  }

  function onKeyUp(event: KeyboardEvent): void {
    getComponent(world, entity, InputState)?.keys.delete(event.code);
  }

  function onMouseMove(event: MouseEvent): void {
    const state = getComponent(world, entity, InputState);
    if (!state) return;

    state.mouse.x = event.clientX;
    state.mouse.y = event.clientY;
    state.mouse.dx += event.movementX;
    state.mouse.dy += event.movementY;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('mousemove', onMouseMove);

  return {
    entity,
    dispose() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
    },
  };
}
