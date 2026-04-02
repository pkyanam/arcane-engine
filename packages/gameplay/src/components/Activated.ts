import { defineComponent } from '@arcane-engine/core';
import type { Entity } from '@arcane-engine/core';

export interface ActivatedData {
  activatedBy: Entity;
}

/** One-tick event component written by {@link interactionSystem}. */
export const Activated = defineComponent<ActivatedData>('Activated', () => ({
  activatedBy: -1,
}));
