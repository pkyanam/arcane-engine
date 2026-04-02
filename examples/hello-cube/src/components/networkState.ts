import { defineComponent } from '@arcane-engine/core';

export const NetworkState = defineComponent('NetworkState', () => ({
  localPlayerId: '',
  connected: false,
  latencyMs: 0,
  phase: 'connecting' as 'connecting' | 'connected' | 'reconnecting' | 'disconnected',
  remotePlayerCount: 0,
  statusText: 'Opening relay connection...',
  noticeText: '',
  noticeExpiresAtMs: 0,
  reconnectAttempt: 0,
  reconnectAtMs: 0,
}));
