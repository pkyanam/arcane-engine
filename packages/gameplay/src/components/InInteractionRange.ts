import { defineComponent } from '@arcane-engine/core';
import type { Entity } from '@arcane-engine/core';

export interface InInteractionRangeData {
  interactableEntity: Entity;
  distance: number;
}

/**
 * Focus data written onto the player entity for the current valid interaction target.
 *
 * A HUD layer can read this component to show the active prompt without
 * rebuilding the focus-selection logic.
 */
export const InInteractionRange = defineComponent<InInteractionRangeData>(
  'InInteractionRange',
  () => ({
    interactableEntity: -1,
    distance: 0,
  }),
);
