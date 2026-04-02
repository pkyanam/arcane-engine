import { defineComponent } from '@arcane-engine/core';
import type { Entity } from '@arcane-engine/core';

/** One-shot damage event consumed by {@link healthSystem}. */
export const Damage = defineComponent<{
  amount: number;
  source: Entity | null;
}>('Damage', () => ({ amount: 1, source: null }));
