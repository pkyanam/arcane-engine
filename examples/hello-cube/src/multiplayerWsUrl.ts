/**
 * WebSocket URL for the relay. Uses `VITE_WS_URL` when set; otherwise `wss://` on https pages
 * and `ws://localhost:8765` for local dev.
 */
export function resolveMultiplayerWsUrl(): string {
  const raw = import.meta.env.VITE_WS_URL;
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (t.length > 0) return t;
  }
  if (typeof globalThis.location?.protocol === 'string' && globalThis.location.protocol === 'https:') {
    return 'wss://localhost:8765';
  }
  return 'ws://localhost:8765';
}
