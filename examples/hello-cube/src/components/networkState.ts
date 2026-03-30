import { defineComponent } from '@arcane-engine/core';

export const NetworkState = defineComponent('NetworkState', () => ({
  localPlayerId: '',
  connected: false,
  latencyMs: 0,
}));
