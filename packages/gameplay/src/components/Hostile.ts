import { defineComponent } from '@arcane-engine/core';

/** Marks an entity as hostile. Destroying it increments {@link GameState}.kills by {@link scoreValue}. */
export const Hostile = defineComponent<{
  scoreValue: number;
}>('Hostile', () => ({ scoreValue: 1 }));
