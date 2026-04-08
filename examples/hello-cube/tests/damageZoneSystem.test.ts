import { addComponent, createEntity, createWorld, getComponent, hasComponent, removeComponent } from '@arcane-engine/core';
import { beforeAll, describe, expect, it } from 'vitest';
import { Position } from '@arcane-engine/renderer';
import { BoxCollider, RigidBody, createPhysicsContext, initPhysics, physicsSystem, triggerVolumeSystem } from '@arcane-engine/physics';
import { Damage, Health } from '../../../packages/gameplay/src/index.js';
import { damageZoneSystem, setDamageZoneEnabled, spawnDamageZone } from '../../../packages/gameplay/src/index.js';
import { DAMAGE_ZONE_FPS } from '../src/fpsArenaSetup.js';

beforeAll(async () => {
  await initPhysics();
});

function runStep(
  world: ReturnType<typeof createWorld>,
  physics: ReturnType<typeof physicsSystem>,
  triggers: ReturnType<typeof triggerVolumeSystem>,
  dt: number,
): void {
  physics(world, dt);
  triggers(world, dt);
  damageZoneSystem(world, dt);
}

describe('damageZoneSystem', () => {
  it('applies shared gameplay hazard damage through the trigger-backed FPS arena zone', () => {
    const world = createWorld();
    const ctx = createPhysicsContext({ gravity: { x: 0, y: 0, z: 0 } });
    const physics = physicsSystem(ctx);
    const triggers = triggerVolumeSystem(ctx);

    const player = createEntity(world);
    addComponent(world, player, Position, { x: 7.75, y: 1, z: 7.75 });
    addComponent(world, player, RigidBody, { type: 'dynamic' });
    addComponent(world, player, BoxCollider, { hx: 0.4, hy: 0.9, hz: 0.4 });
    addComponent(world, player, Health, { current: 10, max: 10 });

    const zone = spawnDamageZone(world, ctx, DAMAGE_ZONE_FPS);

    runStep(world, physics, triggers, 1 / 60);
    runStep(world, physics, triggers, 0.1);
    expect(hasComponent(world, player, Damage)).toBe(false);

    runStep(world, physics, triggers, 0.26);
    expect(getComponent(world, player, Damage)?.amount).toBeCloseTo(2);
    expect(getComponent(world, player, Damage)?.source).toBe(zone);
  });

  it('stops dealing damage when the shared zone is disabled', () => {
    const world = createWorld();
    const ctx = createPhysicsContext({ gravity: { x: 0, y: 0, z: 0 } });
    const physics = physicsSystem(ctx);
    const triggers = triggerVolumeSystem(ctx);

    const player = createEntity(world);
    addComponent(world, player, Position, { x: 7.75, y: 1, z: 7.75 });
    addComponent(world, player, RigidBody, { type: 'dynamic' });
    addComponent(world, player, BoxCollider, { hx: 0.4, hy: 0.9, hz: 0.4 });
    addComponent(world, player, Health, { current: 10, max: 10 });

    const zone = spawnDamageZone(world, ctx, DAMAGE_ZONE_FPS);
    setDamageZoneEnabled(world, zone, false);

    runStep(world, physics, triggers, 1 / 60);
    runStep(world, physics, triggers, 0.5);
    expect(hasComponent(world, player, Damage)).toBe(false);

    setDamageZoneEnabled(world, zone, true);
    runStep(world, physics, triggers, 0.36);
    expect(getComponent(world, player, Damage)?.amount).toBeCloseTo(2);

    removeComponent(world, player, Damage);
    setDamageZoneEnabled(world, zone, false);
    runStep(world, physics, triggers, 0.36);
    expect(hasComponent(world, player, Damage)).toBe(false);
  });
});
