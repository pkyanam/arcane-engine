import { defineComponent } from '@arcane-engine/core';

export const Health = defineComponent<{
  current: number;
  max: number;
}>('Health', () => ({ current: 3, max: 3 }));
