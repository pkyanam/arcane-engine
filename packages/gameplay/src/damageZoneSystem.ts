import {
  addComponent,
  getComponent,
  hasComponent,
  query,
} from '@arcane-engine/core';
import type { Entity, SystemFn, World } from '@arcane-engine/core';
import { Damage } from './components/Damage.js';
import { DamageZone } from './components/DamageZone.js';
import { Health } from './components/Health.js';
import { TriggerVolumeRef } from './interopComponents.js';

interface DamageZoneTargetState {
  intervalElapsed: number;
}

interface DamageZoneRuntimeState {
  zones: Map<Entity, Map<Entity, DamageZoneTargetState>>;
}

const runtimeStateByWorld = new WeakMap<World, DamageZoneRuntimeState>();

function getRuntimeState(world: World): DamageZoneRuntimeState {
  const existing = runtimeStateByWorld.get(world);
  if (existing) return existing;

  const next = {
    zones: new Map<Entity, Map<Entity, DamageZoneTargetState>>(),
  };
  runtimeStateByWorld.set(world, next);
  return next;
}

function queueDamage(world: World, target: Entity, amount: number, source: Entity): void {
  if (!Number.isFinite(amount) || amount <= 0) {
    return;
  }

  const damage = getComponent(world, target, Damage);
  if (damage) {
    damage.amount += amount;
    if (damage.source === null) {
      damage.source = source;
    }
    return;
  }

  addComponent(world, target, Damage, {
    amount,
    source,
  });
}

/**
 * Consumes trigger-volume enter/stay data and writes `Damage` events for any
 * entities with `Health` inside active `DamageZone`s.
 *
 * Register this after `triggerVolumeSystem(...)` so the trigger membership for
 * the current frame is already available.
 */
export const damageZoneSystem: SystemFn = (world: World, dt: number): void => {
  const runtime = getRuntimeState(world);
  const activeZones = new Set<Entity>();

  for (const zoneEntity of query(world, [DamageZone, TriggerVolumeRef])) {
    activeZones.add(zoneEntity);

    const zone = getComponent(world, zoneEntity, DamageZone)!;
    const trigger = getComponent(world, zoneEntity, TriggerVolumeRef)!;

    if (!zone.enabled) {
      runtime.zones.delete(zoneEntity);
      continue;
    }

    let trackedTargets = runtime.zones.get(zoneEntity);
    if (!trackedTargets) {
      trackedTargets = new Map<Entity, DamageZoneTargetState>();
      runtime.zones.set(zoneEntity, trackedTargets);
    }

    for (const target of [...trackedTargets.keys()]) {
      if (!trigger.entities.has(target)) {
        trackedTargets.delete(target);
      }
    }

    for (const target of trigger.exited) {
      trackedTargets.delete(target);
    }

    const source = zone.source ?? zoneEntity;
    const interval = Math.max(0, zone.damageInterval);

    for (const target of trigger.entities) {
      if (!hasComponent(world, target, Health)) {
        trackedTargets.delete(target);
        continue;
      }

      const isNewlyInside = trigger.entered.has(target) || !trackedTargets.has(target);
      let targetState = trackedTargets.get(target);

      if (!targetState) {
        targetState = { intervalElapsed: 0 };
        trackedTargets.set(target, targetState);
      }

      if (isNewlyInside && zone.burstDamage > 0) {
        queueDamage(world, target, zone.burstDamage, source);
      }

      if (zone.damagePerSecond <= 0) {
        targetState.intervalElapsed = 0;
        continue;
      }

      if (interval === 0) {
        queueDamage(world, target, zone.damagePerSecond * dt, source);
        continue;
      }

      targetState.intervalElapsed += dt;

      while (targetState.intervalElapsed >= interval) {
        targetState.intervalElapsed -= interval;
        queueDamage(world, target, zone.damagePerSecond * interval, source);
      }
    }

    if (trackedTargets.size === 0) {
      runtime.zones.delete(zoneEntity);
    }
  }

  for (const zoneEntity of [...runtime.zones.keys()]) {
    if (!activeZones.has(zoneEntity)) {
      runtime.zones.delete(zoneEntity);
    }
  }
};
