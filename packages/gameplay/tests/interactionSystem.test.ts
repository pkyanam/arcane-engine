import { describe, expect, it } from 'vitest';
import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
  hasComponent,
  removeComponent,
} from '@arcane-engine/core';
import { FPSCamera, InputState } from '../../input/src/components.js';
import { TriggerVolume } from '../../physics/src/components.js';
import { Position } from '../../renderer/src/components.js';
import { Activated } from '../src/components/Activated.js';
import { InInteractionRange } from '../src/components/InInteractionRange.js';
import { Interactable } from '../src/components/Interactable.js';
import { Player } from '../src/components/Player.js';
import { interactionSystem } from '../src/interactionSystem.js';
import { makeInteractable, setInteractableEnabled, wasActivated } from '../src/utils.js';

function setupWorld() {
  const world = createWorld();

  const inputEntity = createEntity(world);
  addComponent(world, inputEntity, InputState);

  const player = createEntity(world);
  addComponent(world, player, Player);
  addComponent(world, player, Position, { x: 0, y: 0, z: 0 });
  addComponent(world, player, FPSCamera, { yaw: 0, pitch: 0, height: 1.6 });

  return { world, inputEntity, player };
}

function spawnInteractable(
  world: ReturnType<typeof createWorld>,
  options: {
    position: { x: number; y: number; z: number };
    promptText?: string;
    interactionRange?: number;
    requiresFacing?: boolean;
    cooldown?: number;
    enabled?: boolean;
  },
) {
  const entity = createEntity(world);
  addComponent(world, entity, Position, options.position);
  const data: Partial<ReturnType<typeof Interactable.default>> = {};
  if (options.promptText !== undefined) data.promptText = options.promptText;
  if (options.interactionRange !== undefined) data.interactionRange = options.interactionRange;
  if (options.requiresFacing !== undefined) data.requiresFacing = options.requiresFacing;
  if (options.cooldown !== undefined) data.cooldown = options.cooldown;
  if (options.enabled !== undefined) data.enabled = options.enabled;
  addComponent(world, entity, Interactable, data);
  return entity;
}

function run(world: ReturnType<typeof createWorld>, dt = 0.1) {
  interactionSystem(world, dt);
}

describe('interactionSystem', () => {
  it('focuses the closest valid interactable and writes HUD-friendly focus data to the player', () => {
    const { world, player } = setupWorld();
    const far = spawnInteractable(world, {
      position: { x: 0, y: 0, z: -3 },
      interactionRange: 5,
    });
    const near = spawnInteractable(world, {
      position: { x: 0, y: 0, z: -1 },
      interactionRange: 5,
    });

    run(world);

    const focus = getComponent(world, player, InInteractionRange)!;
    expect(focus.interactableEntity).toBe(near);
    expect(focus.distance).toBeCloseTo(1);
    expect(focus.interactableEntity).not.toBe(far);
  });

  it('ignores disabled interactables and updates focus when they are re-enabled', () => {
    const { world, player } = setupWorld();
    const disabledNear = spawnInteractable(world, {
      position: { x: 0, y: 0, z: -1 },
      interactionRange: 5,
      enabled: false,
    });
    const enabledFar = spawnInteractable(world, {
      position: { x: 0, y: 0, z: -2 },
      interactionRange: 5,
    });

    run(world);
    expect(getComponent(world, player, InInteractionRange)!.interactableEntity).toBe(enabledFar);

    setInteractableEnabled(world, disabledNear, true);
    run(world);

    expect(getComponent(world, player, InInteractionRange)!.interactableEntity).toBe(disabledNear);
  });

  it('requires facing only for interactables that opt into it', () => {
    const { world, player } = setupWorld();
    spawnInteractable(world, {
      position: { x: 0, y: 0, z: 2 },
      interactionRange: 5,
      requiresFacing: true,
    });

    run(world);
    expect(hasComponent(world, player, InInteractionRange)).toBe(false);

    spawnInteractable(world, {
      position: { x: 0, y: 0, z: -2 },
      interactionRange: 5,
      requiresFacing: true,
    });

    run(world);
    expect(getComponent(world, player, InInteractionRange)!.distance).toBeCloseTo(2);
  });

  it('activates the focused interactable on a KeyE press and cleans Activated on the next tick', () => {
    const { world, inputEntity, player } = setupWorld();
    const terminal = spawnInteractable(world, {
      position: { x: 0, y: 0, z: -1 },
      interactionRange: 3,
      cooldown: 1,
    });
    const input = getComponent(world, inputEntity, InputState)!;

    run(world);
    input.keys.add('KeyE');
    run(world);

    expect(hasComponent(world, terminal, Activated)).toBe(true);
    expect(wasActivated(world, terminal)).toEqual({ activatedBy: player });

    run(world);
    expect(hasComponent(world, terminal, Activated)).toBe(false);

    input.keys.delete('KeyE');
    run(world, 0.3);
    input.keys.add('KeyE');
    run(world, 0.3);
    expect(hasComponent(world, terminal, Activated)).toBe(false);

    input.keys.delete('KeyE');
    run(world, 0.3);
    input.keys.add('KeyE');
    run(world, 0.3);
    expect(hasComponent(world, terminal, Activated)).toBe(true);
  });

  it('treats cooldown 0 as one-shot interaction', () => {
    const { world, inputEntity } = setupWorld();
    const switchEntity = spawnInteractable(world, {
      position: { x: 0, y: 0, z: -1 },
      interactionRange: 3,
      cooldown: 0,
    });
    const input = getComponent(world, inputEntity, InputState)!;

    input.keys.add('KeyE');
    run(world);
    expect(hasComponent(world, switchEntity, Activated)).toBe(true);

    input.keys.delete('KeyE');
    run(world, 0.5);
    input.keys.add('KeyE');
    run(world, 5);

    expect(hasComponent(world, switchEntity, Activated)).toBe(false);
  });

  it('uses trigger membership when TriggerVolume data is present, even outside distance fallback range', () => {
    const { world, player } = setupWorld();
    const door = spawnInteractable(world, {
      position: { x: 0, y: 0, z: -10 },
      interactionRange: 1,
    });
    addComponent(world, door, TriggerVolume, {
      entities: new Set([player]),
      entered: new Set(),
      exited: new Set(),
    });

    run(world);

    const focus = getComponent(world, player, InInteractionRange)!;
    expect(focus.interactableEntity).toBe(door);
    expect(focus.distance).toBeCloseTo(10);
  });

  it('clears stale focus when the target stops being valid', () => {
    const { world, player } = setupWorld();
    const crate = spawnInteractable(world, {
      position: { x: 0, y: 0, z: -1 },
      interactionRange: 3,
    });

    run(world);
    expect(getComponent(world, player, InInteractionRange)!.interactableEntity).toBe(crate);

    removeComponent(world, crate, Interactable);
    run(world);

    expect(hasComponent(world, player, InInteractionRange)).toBe(false);
  });

  it('supports makeInteractable helper-created entities in the interaction flow', () => {
    const { world, player } = setupWorld();
    const switchEntity = createEntity(world);
    addComponent(world, switchEntity, Position, { x: 0, y: 0, z: -1.5 });
    makeInteractable(world, switchEntity, {
      promptText: 'Press E to flip switch',
      range: 2,
      requiresFacing: true,
    });

    run(world);

    const focus = getComponent(world, player, InInteractionRange)!;
    expect(focus.interactableEntity).toBe(switchEntity);
    expect(getComponent(world, switchEntity, Interactable)!.promptText).toBe('Press E to flip switch');
  });
});
