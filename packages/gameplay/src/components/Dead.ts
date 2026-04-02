import { defineComponent } from '@arcane-engine/core';
import type { Entity } from '@arcane-engine/core';

/** Marker added by {@link healthSystem} when an entity reaches 0 hp. */
export const Dead = defineComponent<{
  killedBy: Entity | null;
}>('Dead', () => ({ killedBy: null }));
