import { defineComponent } from '@arcane-engine/core';

export interface InteractableData {
  promptText: string;
  interactionRange: number;
  enabled: boolean;
  requiresFacing: boolean;
  /**
   * Seconds between activations.
   *
   * `0` means one-shot: after the first activation, the interactable can never
   * activate again unless game code resets {@link lastActivatedAt}.
   */
  cooldown: number;
  /**
   * Internal interaction clock timestamp in seconds.
   *
   * Defaults to `-Infinity` so untouched interactables are immediately valid.
   */
  lastActivatedAt: number;
}

/** Marks an entity as something the player can activate with the interaction system. */
export const Interactable = defineComponent<InteractableData>('Interactable', () => ({
  promptText: 'Press E to interact',
  interactionRange: 2,
  enabled: true,
  requiresFacing: false,
  cooldown: 0,
  lastActivatedAt: Number.NEGATIVE_INFINITY,
}));
