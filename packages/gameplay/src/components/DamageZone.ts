import { defineComponent } from '@arcane-engine/core';
import type { Entity } from '@arcane-engine/core';

export interface DamageZoneData {
  /** Continuous damage rate in hp per second while an entity stays inside. */
  damagePerSecond: number;
  /** One-time damage applied when an entity first enters the zone. */
  burstDamage: number;
  /** Seconds between continuous damage ticks. `0` means every frame. */
  damageInterval: number;
  /** Whether the zone is currently active. */
  enabled: boolean;
  /**
   * Optional source entity written onto `Damage.source`.
   * When omitted, the zone entity itself becomes the damage source.
   */
  source: Entity | null;
}

/**
 * Trigger-backed hazard rules applied by {@link damageZoneSystem}.
 *
 * Add this on the same entity as a physics `TriggerVolume`. The gameplay
 * system reads the trigger's `entered` and `entities` sets and writes
 * one-tick `Damage` events onto any entities with `Health`.
 */
export const DamageZone = defineComponent<DamageZoneData>('DamageZone', () => ({
  damagePerSecond: 0,
  burstDamage: 0,
  damageInterval: 0,
  enabled: true,
  source: null,
}));
