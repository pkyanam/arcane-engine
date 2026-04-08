import { defineComponent } from '@arcane-engine/core';

/**
 * Internal component mirrors used to interoperate with other Arcane packages
 * without creating a hard runtime dependency on them.
 */
export const PositionRef = defineComponent<{
  x: number;
  y: number;
  z: number;
}>('Position', () => ({ x: 0, y: 0, z: 0 }));
