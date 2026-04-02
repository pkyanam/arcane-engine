import { defineComponent } from '@arcane-engine/core';

/** A named spawn location in the world. */
export const SpawnPoint = defineComponent<{
  id: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
}>('SpawnPoint', () => ({ id: 'default', x: 0, y: 0, z: 0, yaw: 0 }));
