import { addComponent, createEntity, createWorld } from '@arcane-engine/core';
import { describe, expect, it, afterEach, vi } from 'vitest';
import { NetworkState } from '../src/components/networkState.js';
import { createArcaneHud } from '../src/fpsHud.js';
import { multiplayerHudSystem } from '../src/multiplayerHudSystem.js';

afterEach(() => {
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('multiplayerHudSystem', () => {
  it('shows connected relay details, peer count, and notices', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T12:00:00Z'));

    const world = createWorld();
    const entity = createEntity(world);
    addComponent(world, entity, NetworkState, {
      phase: 'connected',
      connected: true,
      latencyMs: 42,
      remotePlayerCount: 2,
      noticeText: 'A remote player joined the relay.',
      noticeExpiresAtMs: Date.now() + 1000,
    });

    const hud = createArcaneHud('Hint', { showMultiplayerStatus: true });
    const system = multiplayerHudSystem(hud.handles);

    system(world, 0);

    expect(hud.handles.networkBadge?.textContent).toBe('CONNECTED');
    expect(hud.handles.networkLabel?.textContent).toBe('2 remote players in the relay');
    expect(hud.handles.networkDetail?.textContent).toContain('Ping: 42 ms');
    expect(hud.handles.networkNotice?.textContent).toBe('A remote player joined the relay.');
  });

  it('shows reconnect countdown using the staged network state fields', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T12:00:00Z'));

    const world = createWorld();
    const entity = createEntity(world);
    addComponent(world, entity, NetworkState, {
      phase: 'reconnecting',
      connected: false,
      statusText: 'Relay connection lost. Reconnecting soon...',
      reconnectAttempt: 2,
      reconnectAtMs: Date.now() + 1500,
    });

    const hud = createArcaneHud('Hint', { showMultiplayerStatus: true });
    const system = multiplayerHudSystem(hud.handles);

    system(world, 0);

    expect(hud.handles.networkBadge?.textContent).toBe('RECONNECTING');
    expect(hud.handles.networkLabel?.textContent).toBe('Relay connection lost. Reconnecting soon...');
    expect(hud.handles.networkDetail?.textContent).toContain('Reconnect attempt 2');
    expect(hud.handles.networkDetail?.textContent).toContain('1.5s');
  });
});
