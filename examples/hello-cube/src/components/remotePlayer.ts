import { defineComponent } from '@arcane-engine/core';

export const RemotePlayer = defineComponent('RemotePlayer', () => ({
  playerId: '',
  targetPosition: { x: 0, y: 0, z: 0 },
  targetYaw: 0,
  displayedYaw: 0,
  spawnFlashMs: 0,
  despawnMs: 0,
}));
