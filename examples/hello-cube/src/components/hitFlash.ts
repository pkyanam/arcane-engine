import { defineComponent } from '@arcane-engine/core';

/** Holds the previous `MeshStandardMaterial` color hex to restore after one frame. */
export const HitFlash = defineComponent<{ restoreColorHex: number }>('HitFlash', () => ({
  restoreColorHex: 0xffffff,
}));
