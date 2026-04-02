import { getComponent, query } from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';
import { NetworkState } from './components/networkState.js';
import type { FpsHudHandles } from './fpsHud.js';

function formatRemoteLabel(count: number): string {
  if (count === 0) return 'No remote players connected yet';
  if (count === 1) return '1 remote player in the relay';
  return `${count} remote players in the relay`;
}

function formatDetail(
  phase: 'connecting' | 'connected' | 'reconnecting' | 'disconnected',
  latencyMs: number,
  reconnectAttempt: number,
  reconnectAtMs: number,
): string {
  switch (phase) {
    case 'connected':
      return latencyMs > 0 ? `Relay healthy. Ping: ${latencyMs} ms.` : 'Relay healthy. Measuring ping...';
    case 'reconnecting': {
      const remainingMs = Math.max(0, reconnectAtMs - Date.now());
      const seconds = (remainingMs / 1000).toFixed(1);
      return `Reconnect attempt ${Math.max(1, reconnectAttempt)} in ${seconds}s.`;
    }
    case 'disconnected':
      return 'Relay closed. Returning to local-only view until reconnect succeeds.';
    case 'connecting':
    default:
      return 'Opening the multiplayer relay and waiting for a player id.';
  }
}

function styleBadge(
  badge: HTMLElement,
  phase: 'connecting' | 'connected' | 'reconnecting' | 'disconnected',
): void {
  if (phase === 'connected') {
    badge.textContent = 'CONNECTED';
    badge.style.background = 'rgba(34,197,94,0.18)';
    badge.style.color = '#bbf7d0';
    return;
  }

  if (phase === 'reconnecting') {
    badge.textContent = 'RECONNECTING';
    badge.style.background = 'rgba(250,204,21,0.18)';
    badge.style.color = '#fde68a';
    return;
  }

  if (phase === 'disconnected') {
    badge.textContent = 'DISCONNECTED';
    badge.style.background = 'rgba(248,113,113,0.18)';
    badge.style.color = '#fecaca';
    return;
  }

  badge.textContent = 'CONNECTING';
  badge.style.background = 'rgba(125,211,252,0.18)';
  badge.style.color = '#bae6fd';
}

/**
 * Mirrors {@link NetworkState} into the optional multiplayer HUD panel.
 */
export function multiplayerHudSystem(hud: FpsHudHandles): SystemFn {
  return (world: World): void => {
    if (!hud.networkBadge || !hud.networkLabel || !hud.networkDetail || !hud.networkNotice) {
      return;
    }

    const entities = query(world, [NetworkState]);
    if (!entities.length) {
      hud.networkLabel.textContent = 'Multiplayer state unavailable';
      hud.networkDetail.textContent = 'Network state entity is missing from the scene.';
      hud.networkNotice.textContent = '';
      styleBadge(hud.networkBadge, 'disconnected');
      return;
    }

    const state = getComponent(world, entities[0], NetworkState);
    if (!state) return;

    styleBadge(hud.networkBadge, state.phase);
    hud.networkLabel.textContent =
      state.phase === 'connected' ? formatRemoteLabel(state.remotePlayerCount) : state.statusText;
    hud.networkDetail.textContent = formatDetail(
      state.phase,
      Math.max(0, Math.round(state.latencyMs)),
      state.reconnectAttempt,
      state.reconnectAtMs,
    );

    const showNotice = state.noticeText.length > 0 && state.noticeExpiresAtMs > Date.now();
    hud.networkNotice.textContent = showNotice ? state.noticeText : '';
  };
}
