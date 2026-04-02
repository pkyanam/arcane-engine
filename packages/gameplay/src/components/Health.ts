import { defineComponent } from '@arcane-engine/core';

/** Tracks an entity's hit points. */
export const Health = defineComponent<{
  current: number;
  max: number;
}>('Health', () => ({ current: 10, max: 10 }));
