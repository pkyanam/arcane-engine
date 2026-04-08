import { describe, expect, it } from 'vitest';
import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
  hasComponent,
  removeComponent,
} from '@arcane-engine/core';
import { TriggerVolume } from '../../physics/src/components.js';
import { Position } from '../../renderer/src/components.js';
import { Damage } from '../src/components/Damage.js';
import { DamageZone } from '../src/components/DamageZone.js';
import { Health } from '../src/components/Health.js';
import { damageZoneSystem } from '../src/damageZoneSystem.js';
import { setDamageZoneEnabled, spawnDamageZone } from '../src/utils.js';

function addManualTrigger(
  world: ReturnType<typeof createWorld>,
  entity: number,
  options?: Partial<ReturnType<typeof TriggerVolume.default>>,
) {
  addComponent(world, entity, TriggerVolume, {
    entities: new Set<number>(),
    entered: new Set<number>(),
    exited: new Set<number>(),
    ...options,
  });
}

describe('damageZoneSystem', () => {
  it('applies burst damage once on entry and uses the zone entity as the default source', () => {
    const world = createWorld();
    const target = createEntity(world);
    addComponent(world, target, Health, { current: 10, max: 10 });

    const zone = createEntity(world);
    addComponent(world, zone, DamageZone, {
      burstDamage: 3,
    });
    addManualTrigger(world, zone, {
      entities: new Set([target]),
      entered: new Set([target]),
    });

    damageZoneSystem(world, 0.1);

    expect(getComponent(world, target, Damage)).toEqual({
      amount: 3,
      source: zone,
    });

    removeComponent(world, target, Damage);
    const trigger = getComponent(world, zone, TriggerVolume)!;
    trigger.entered.clear();

    damageZoneSystem(world, 0.1);

    expect(hasComponent(world, target, Damage)).toBe(false);
  });

  it('throttles continuous damage by damageInterval and resets the timer after leaving', () => {
    const world = createWorld();
    const target = createEntity(world);
    addComponent(world, target, Health, { current: 10, max: 10 });

    const zone = createEntity(world);
    addComponent(world, zone, DamageZone, {
      damagePerSecond: 8,
      damageInterval: 0.25,
    });
    addManualTrigger(world, zone, {
      entities: new Set([target]),
      entered: new Set([target]),
    });

    damageZoneSystem(world, 0.1);
    expect(hasComponent(world, target, Damage)).toBe(false);

    const trigger = getComponent(world, zone, TriggerVolume)!;
    trigger.entered.clear();
    damageZoneSystem(world, 0.15);
    expect(getComponent(world, target, Damage)).toEqual({
      amount: 2,
      source: zone,
    });

    removeComponent(world, target, Damage);
    trigger.entities.clear();
    trigger.exited.add(target);
    damageZoneSystem(world, 0.1);

    trigger.exited.clear();
    trigger.entities.add(target);
    trigger.entered.add(target);
    damageZoneSystem(world, 0.1);

    expect(hasComponent(world, target, Damage)).toBe(false);
  });

  it('applies per-frame continuous damage when damageInterval is 0', () => {
    const world = createWorld();
    const target = createEntity(world);
    addComponent(world, target, Health, { current: 10, max: 10 });

    const zone = createEntity(world);
    addComponent(world, zone, DamageZone, {
      damagePerSecond: 6,
      damageInterval: 0,
    });
    addManualTrigger(world, zone, {
      entities: new Set([target]),
      entered: new Set([target]),
    });

    damageZoneSystem(world, 0.2);

    expect(getComponent(world, target, Damage)?.amount).toBeCloseTo(1.2);
    expect(getComponent(world, target, Damage)?.source).toBe(zone);
  });

  it('supports explicit source attribution and disabled zones', () => {
    const world = createWorld();
    const owner = createEntity(world);
    const target = createEntity(world);
    addComponent(world, target, Health, { current: 10, max: 10 });

    const zone = createEntity(world);
    addComponent(world, zone, DamageZone, {
      burstDamage: 2,
      enabled: false,
      source: owner,
    });
    addManualTrigger(world, zone, {
      entities: new Set([target]),
      entered: new Set([target]),
    });

    damageZoneSystem(world, 0.1);
    expect(hasComponent(world, target, Damage)).toBe(false);

    setDamageZoneEnabled(world, zone, true);
    damageZoneSystem(world, 0.1);

    expect(getComponent(world, target, Damage)).toEqual({
      amount: 2,
      source: owner,
    });
  });

  it('spawns a trigger-backed damage zone entity with gameplay defaults', () => {
    const world = createWorld();

    const zone = spawnDamageZone(world, {} as never, {
      position: { x: 7.75, y: 2, z: 7.75 },
      shape: 'box',
      halfExtents: { x: 1.4, y: 2, z: 1.4 },
      damagePerSecond: 2 / 0.35,
      damageInterval: 0.35,
    });

    expect(getComponent(world, zone, Position)).toEqual({ x: 7.75, y: 2, z: 7.75 });
    expect(getComponent(world, zone, TriggerVolume)).toEqual({
      shape: 'box',
      hx: 1.4,
      hy: 2,
      hz: 1.4,
      radius: 0,
      entities: new Set<number>(),
      entered: new Set<number>(),
      exited: new Set<number>(),
    });
    expect(getComponent(world, zone, DamageZone)).toEqual({
      damagePerSecond: 2 / 0.35,
      burstDamage: 0,
      damageInterval: 0.35,
      enabled: true,
      source: null,
    });
  });
});
