import {
  addComponent,
  getComponent,
  hasComponent,
  query,
  removeComponent,
} from '@arcane-engine/core';
import type { Entity, SystemFn, World } from '@arcane-engine/core';
import { Activated } from './components/Activated.js';
import { InInteractionRange } from './components/InInteractionRange.js';
import { Interactable } from './components/Interactable.js';
import { Player } from './components/Player.js';
import {
  FPSCameraRef,
  InputStateRef,
  PositionRef,
  RotationRef,
  TriggerVolumeRef,
} from './interopComponents.js';

const INTERACT_KEY = 'KeyE';

interface InteractionRuntimeState {
  elapsedTime: number;
  wasInteractPressed: boolean;
}

const runtimeStateByWorld = new WeakMap<World, InteractionRuntimeState>();

function getRuntimeState(world: World): InteractionRuntimeState {
  const existing = runtimeStateByWorld.get(world);
  if (existing) return existing;

  const next = {
    elapsedTime: 0,
    wasInteractPressed: false,
  };
  runtimeStateByWorld.set(world, next);
  return next;
}

function getPlayerPosition(world: World, player: Entity) {
  return getComponent(world, player, PositionRef);
}

function getPlayerForward(world: World, player: Entity): { x: number; y: number; z: number } {
  const camera = getComponent(world, player, FPSCameraRef);
  if (camera) {
    const cosPitch = Math.cos(camera.pitch);
    return {
      x: -Math.sin(camera.yaw) * cosPitch,
      y: Math.sin(camera.pitch),
      z: -Math.cos(camera.yaw) * cosPitch,
    };
  }

  const rotation = getComponent(world, player, RotationRef);
  if (rotation) {
    const cosPitch = Math.cos(rotation.x);
    return {
      x: -Math.sin(rotation.y) * cosPitch,
      y: Math.sin(rotation.x),
      z: -Math.cos(rotation.y) * cosPitch,
    };
  }

  return { x: 0, y: 0, z: -1 };
}

function isInRange(
  world: World,
  entity: Entity,
  player: Entity,
  distance: number,
  interactionRange: number,
): boolean {
  if (hasComponent(world, entity, TriggerVolumeRef)) {
    const trigger = getComponent(world, entity, TriggerVolumeRef);
    return trigger?.entities.has(player) ?? false;
  }

  return distance <= interactionRange;
}

function isFacingTarget(
  world: World,
  player: Entity,
  dx: number,
  dy: number,
  dz: number,
): boolean {
  if (dx === 0 && dy === 0 && dz === 0) {
    return true;
  }

  const forward = getPlayerForward(world, player);
  return (forward.x * dx) + (forward.y * dy) + (forward.z * dz) > 0;
}

function canActivate(interactable: ReturnType<typeof Interactable.default>, now: number): boolean {
  const cooldown = Math.max(0, interactable.cooldown);

  if (cooldown === 0) {
    return interactable.lastActivatedAt === Number.NEGATIVE_INFINITY;
  }

  return now - interactable.lastActivatedAt >= cooldown;
}

/**
 * Selects the closest valid interactable for the current player, mirrors that
 * focus onto {@link InInteractionRange}, and writes one-tick {@link Activated}
 * events when the player presses `E`.
 *
 * The system reads:
 * - `Player` from `@arcane-engine/gameplay`
 * - `InputState` and optional `FPSCamera` from `@arcane-engine/input`
 * - `Position` and optional `Rotation` from `@arcane-engine/renderer`
 * - optional `TriggerVolume` data from `@arcane-engine/physics`
 */
export const interactionSystem: SystemFn = (world: World, dt: number): void => {
  const runtime = getRuntimeState(world);
  runtime.elapsedTime += dt;

  for (const entity of query(world, [Activated])) {
    removeComponent(world, entity, Activated);
  }

  const inputEntity = query(world, [InputStateRef])[0];
  const input = inputEntity !== undefined ? getComponent(world, inputEntity, InputStateRef) : undefined;
  const interactPressed = input?.keys.has(INTERACT_KEY) ?? false;
  const justPressed = interactPressed && !runtime.wasInteractPressed;

  const player = query(world, [Player])[0];
  if (player === undefined) {
    runtime.wasInteractPressed = interactPressed;
    return;
  }

  const playerPosition = getPlayerPosition(world, player);
  if (!playerPosition) {
    removeComponent(world, player, InInteractionRange);
    runtime.wasInteractPressed = interactPressed;
    return;
  }

  let focusedEntity: Entity | undefined;
  let focusedDistance = Number.POSITIVE_INFINITY;

  for (const entity of query(world, [Interactable, PositionRef])) {
    if (entity === player) continue;

    const interactable = getComponent(world, entity, Interactable)!;
    if (!interactable.enabled) continue;

    const position = getComponent(world, entity, PositionRef)!;
    const dx = position.x - playerPosition.x;
    const dy = position.y - playerPosition.y;
    const dz = position.z - playerPosition.z;
    const distance = Math.hypot(dx, dy, dz);

    if (!isInRange(world, entity, player, distance, interactable.interactionRange)) {
      continue;
    }

    if (interactable.requiresFacing && !isFacingTarget(world, player, dx, dy, dz)) {
      continue;
    }

    if (
      distance < focusedDistance ||
      (distance === focusedDistance && focusedEntity !== undefined && entity < focusedEntity)
    ) {
      focusedEntity = entity;
      focusedDistance = distance;
    }
  }

  if (focusedEntity === undefined) {
    removeComponent(world, player, InInteractionRange);
    runtime.wasInteractPressed = interactPressed;
    return;
  }

  addComponent(world, player, InInteractionRange, {
    interactableEntity: focusedEntity,
    distance: focusedDistance,
  });

  if (!justPressed) {
    runtime.wasInteractPressed = interactPressed;
    return;
  }

  const interactable = getComponent(world, focusedEntity, Interactable)!;
  if (!canActivate(interactable, runtime.elapsedTime)) {
    runtime.wasInteractPressed = interactPressed;
    return;
  }

  addComponent(world, focusedEntity, Activated, { activatedBy: player });
  interactable.lastActivatedAt = runtime.elapsedTime;
  runtime.wasInteractPressed = interactPressed;
};
