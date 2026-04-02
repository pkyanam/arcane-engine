import { beforeAll, describe, expect, it } from 'vitest';
import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
  hasComponent,
} from '@arcane-engine/core';
import { FPSCamera, InputState } from '@arcane-engine/input';
import { Position, Rotation } from '@arcane-engine/renderer';
import {
  BoxCollider,
  CharacterController,
  RapierBodyRef,
  RapierColliderRef,
  RigidBody,
  TriggerVolume,
} from '../src/components.js';
import { getEntityByColliderHandle } from '../src/colliderLookup.js';
import { characterControllerSystem } from '../src/characterControllerSystem.js';
import { createPhysicsContext, initPhysics } from '../src/physicsContext.js';
import { physicsSystem } from '../src/physicsSystem.js';
import {
  getEntitiesInTrigger,
  isInsideTrigger,
  spawnTriggerVolume,
  triggerVolumeSystem,
} from '../src/triggerVolumeSystem.js';

beforeAll(async () => {
  await initPhysics();
});

function runStep(
  world: ReturnType<typeof createWorld>,
  physics: ReturnType<typeof physicsSystem>,
  triggers: ReturnType<typeof triggerVolumeSystem>,
): void {
  physics(world, 1 / 60);
  triggers(world, 1 / 60);
}

function spawnBoxBody(
  world: ReturnType<typeof createWorld>,
  options: {
    position: { x: number; y: number; z: number };
    type: 'fixed' | 'dynamic' | 'kinematic';
    halfExtents?: { x: number; y: number; z: number };
  },
): number {
  const entity = createEntity(world);
  addComponent(world, entity, Position, options.position);
  addComponent(world, entity, Rotation);
  addComponent(world, entity, RigidBody, { type: options.type });
  addComponent(world, entity, BoxCollider, {
    hx: options.halfExtents?.x ?? 0.5,
    hy: options.halfExtents?.y ?? 0.5,
    hz: options.halfExtents?.z ?? 0.5,
  });
  return entity;
}

describe('triggerVolumeSystem', () => {
  it('creates a Rapier sensor collider lazily and registers its collider lookup', () => {
    const world = createWorld();
    const ctx = createPhysicsContext({ gravity: { x: 0, y: 0, z: 0 } });
    const physics = physicsSystem(ctx);
    const triggers = triggerVolumeSystem(ctx);

    const trigger = spawnTriggerVolume(world, ctx, {
      position: { x: 0, y: 0, z: 0 },
      shape: 'box',
      halfExtents: { x: 1, y: 1, z: 1 },
    });

    expect(hasComponent(world, trigger, RapierColliderRef)).toBe(false);

    runStep(world, physics, triggers);

    expect(hasComponent(world, trigger, RapierColliderRef)).toBe(true);
    const colliderRef = getComponent(world, trigger, RapierColliderRef)!;
    expect(colliderRef.handle).toBeGreaterThanOrEqual(0);
    expect(getEntityByColliderHandle(ctx, colliderRef.handle)).toBe(trigger);
  });

  it('tracks enter, stay, and exit for dynamic bodies in a box trigger', () => {
    const world = createWorld();
    const ctx = createPhysicsContext({ gravity: { x: 0, y: 0, z: 0 } });
    const physics = physicsSystem(ctx);
    const triggers = triggerVolumeSystem(ctx);

    const triggerEntity = spawnTriggerVolume(world, ctx, {
      position: { x: 0, y: 0, z: 0 },
      shape: 'box',
      halfExtents: { x: 1, y: 1, z: 1 },
    });
    const bodyEntity = spawnBoxBody(world, {
      position: { x: 4, y: 0, z: 0 },
      type: 'dynamic',
    });

    runStep(world, physics, triggers);

    let trigger = getComponent(world, triggerEntity, TriggerVolume)!;
    expect(trigger.entered.size).toBe(0);
    expect(trigger.entities.size).toBe(0);

    const body = ctx.world.getRigidBody(getComponent(world, bodyEntity, RapierBodyRef)!.handle)!;
    body.setTranslation({ x: 0, y: 0, z: 0 }, true);

    runStep(world, physics, triggers);

    trigger = getComponent(world, triggerEntity, TriggerVolume)!;
    expect(trigger.entered.has(bodyEntity)).toBe(true);
    expect(trigger.exited.size).toBe(0);
    expect(isInsideTrigger(world, triggerEntity, bodyEntity)).toBe(true);
    expect(getEntitiesInTrigger(world, triggerEntity)).toEqual([bodyEntity]);

    runStep(world, physics, triggers);

    trigger = getComponent(world, triggerEntity, TriggerVolume)!;
    expect(trigger.entered.size).toBe(0);
    expect(trigger.exited.size).toBe(0);
    expect(trigger.entities.has(bodyEntity)).toBe(true);

    body.setTranslation({ x: 4, y: 0, z: 0 }, true);

    runStep(world, physics, triggers);

    trigger = getComponent(world, triggerEntity, TriggerVolume)!;
    expect(trigger.entities.size).toBe(0);
    expect(trigger.entered.size).toBe(0);
    expect(trigger.exited.has(bodyEntity)).toBe(true);
  });

  it('supports sphere triggers and multiple overlapping bodies', () => {
    const world = createWorld();
    const ctx = createPhysicsContext({ gravity: { x: 0, y: 0, z: 0 } });
    const physics = physicsSystem(ctx);
    const triggers = triggerVolumeSystem(ctx);

    const triggerEntity = spawnTriggerVolume(world, ctx, {
      position: { x: 0, y: 0, z: 0 },
      shape: 'sphere',
      radius: 2,
    });
    const first = spawnBoxBody(world, {
      position: { x: 0.5, y: 0, z: 0 },
      type: 'dynamic',
    });
    const second = spawnBoxBody(world, {
      position: { x: 1.5, y: 0, z: 0 },
      type: 'dynamic',
    });

    runStep(world, physics, triggers);
    runStep(world, physics, triggers);

    const inside = getEntitiesInTrigger(world, triggerEntity).sort((a, b) => a - b);
    expect(inside).toEqual([first, second]);

    const trigger = getComponent(world, triggerEntity, TriggerVolume)!;
    expect(trigger.entered.has(first)).toBe(true);
    expect(trigger.entered.has(second)).toBe(true);
  });

  it('detects kinematic rigid bodies after Rapier applies the next translation', () => {
    const world = createWorld();
    const ctx = createPhysicsContext({ gravity: { x: 0, y: 0, z: 0 } });
    const physics = physicsSystem(ctx);
    const triggers = triggerVolumeSystem(ctx);

    const triggerEntity = spawnTriggerVolume(world, ctx, {
      position: { x: 0, y: 0, z: 0 },
      shape: 'box',
      halfExtents: { x: 1, y: 1, z: 1 },
    });
    const bodyEntity = spawnBoxBody(world, {
      position: { x: 5, y: 0, z: 0 },
      type: 'kinematic',
    });

    runStep(world, physics, triggers);

    const body = ctx.world.getRigidBody(getComponent(world, bodyEntity, RapierBodyRef)!.handle)!;
    body.setNextKinematicTranslation({ x: 0, y: 0, z: 0 });

    runStep(world, physics, triggers);

    const trigger = getComponent(world, triggerEntity, TriggerVolume)!;
    expect(trigger.entered.has(bodyEntity)).toBe(true);
    expect(trigger.entities.has(bodyEntity)).toBe(true);
  });

  it('detects character-controller bodies entering a trigger after movement is solved', () => {
    const world = createWorld();
    const ctx = createPhysicsContext({ gravity: { x: 0, y: -9.81, z: 0 } });
    const physics = physicsSystem(ctx);
    const triggers = triggerVolumeSystem(ctx);
    const moveCharacter = characterControllerSystem(ctx);

    spawnBoxBody(world, {
      position: { x: 0, y: -0.5, z: 0 },
      type: 'fixed',
      halfExtents: { x: 10, y: 0.5, z: 10 },
    });

    const inputEntity = createEntity(world);
    addComponent(world, inputEntity, InputState, {
      keys: new Set(['KeyD']),
    });

    const triggerEntity = spawnTriggerVolume(world, ctx, {
      position: { x: 0, y: 1, z: 0 },
      shape: 'box',
      halfExtents: { x: 1, y: 1, z: 1 },
    });
    const player = createEntity(world);
    addComponent(world, player, Position, { x: -2, y: 0.55, z: 0 });
    addComponent(world, player, Rotation);
    addComponent(world, player, FPSCamera, { yaw: 0, pitch: 0, height: 1.6 });
    addComponent(world, player, RigidBody, { type: 'kinematic' });
    addComponent(world, player, BoxCollider, { hx: 0.35, hy: 0.9, hz: 0.35 });
    addComponent(world, player, CharacterController, {
      speed: 3,
      jumpSpeed: 5,
      grounded: true,
      _velocityY: 0,
    });

    runStep(world, physics, triggers);
    moveCharacter(world, 1);
    runStep(world, physics, triggers);

    const trigger = getComponent(world, triggerEntity, TriggerVolume)!;
    expect(trigger.entered.has(player)).toBe(true);
    expect(trigger.entities.has(player)).toBe(true);
  });
});
