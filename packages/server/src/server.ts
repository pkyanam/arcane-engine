import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';

const MAX_CLIENTS = 4;

export interface RelayServerOptions {
  /** TCP port to listen on (default 8765). */
  port?: number;
  /** Called with current connected count after join/leave. */
  onPlayerCount?: (count: number) => void;
}

interface ClientRecord {
  id: string;
  lastPosition: { x: number; y: number; z: number };
  lastYaw: number;
}

function safeJsonParse(raw: unknown): unknown {
  if (typeof raw !== 'string' && !(raw instanceof Buffer)) return undefined;
  const s = typeof raw === 'string' ? raw : raw.toString('utf8');
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return undefined;
  }
}

function isVec3(v: unknown): v is { x: number; y: number; z: number } {
  if (v === null || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.x === 'number' &&
    typeof o.y === 'number' &&
    typeof o.z === 'number' &&
    Number.isFinite(o.x) &&
    Number.isFinite(o.y) &&
    Number.isFinite(o.z)
  );
}

/**
 * Minimal WebSocket relay for Stage 12: move + shoot fan-out, welcome, leave.
 * No game simulation — clients stay authoritative for their own bodies.
 */
export function startRelayServer(options?: RelayServerOptions): {
  httpServer: ReturnType<typeof createServer>;
  wss: WebSocketServer;
  /** Listening port (after `listening`; use 0 in tests for ephemeral port). */
  get port(): number;
  close: () => Promise<void>;
} {
  const requestedPort = options?.port ?? 8765;
  const onPlayerCount = options?.onPlayerCount;

  const httpServer = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('arcane-engine relay — use WebSocket\n');
  });

  const wss = new WebSocketServer({ server: httpServer });
  const clients = new Map<WebSocket, ClientRecord>();

  const broadcastExcept = (from: WebSocket, payload: object): void => {
    const data = JSON.stringify(payload);
    for (const ws of wss.clients) {
      if (ws !== from && ws.readyState === WebSocket.OPEN) ws.send(data);
    }
  };

  wss.on('connection', (ws) => {
    if (clients.size >= MAX_CLIENTS) {
      ws.close(1013, 'Lobby full');
      return;
    }

    const id = randomUUID();
    const existingPlayers = [...clients.values()].map((c) => ({
      playerId: c.id,
      position: { ...c.lastPosition },
      yaw: c.lastYaw,
    }));

    clients.set(ws, {
      id,
      lastPosition: { x: 0, y: 2, z: 0 },
      lastYaw: 0,
    });

    ws.send(JSON.stringify({ type: 'welcome', playerId: id, existingPlayers }));
    onPlayerCount?.(clients.size);

    ws.on('message', (raw) => {
      const msg = safeJsonParse(raw);
      if (msg === undefined || typeof msg !== 'object' || msg === null) return;
      const m = msg as Record<string, unknown>;
      const rec = clients.get(ws);
      if (!rec) return;

      if (m.type === 'move' && isVec3(m.position) && typeof m.yaw === 'number' && Number.isFinite(m.yaw)) {
        rec.lastPosition = { x: m.position.x, y: m.position.y, z: m.position.z };
        rec.lastYaw = m.yaw;
        broadcastExcept(ws, {
          type: 'move',
          playerId: rec.id,
          position: rec.lastPosition,
          yaw: rec.lastYaw,
        });
      } else if (m.type === 'shoot' && isVec3(m.origin) && isVec3(m.direction)) {
        broadcastExcept(ws, {
          type: 'shoot',
          playerId: rec.id,
          origin: m.origin,
          direction: m.direction,
        });
      }
    });

    ws.on('close', () => {
      const left = clients.get(ws);
      clients.delete(ws);
      if (left) {
        broadcastExcept(ws, { type: 'leave', playerId: left.id });
      }
      onPlayerCount?.(clients.size);
    });
  });

  const serverHandle = {
    httpServer,
    wss,
    get port(): number {
      const addr = httpServer.address();
      if (typeof addr === 'object' && addr) return addr.port;
      return requestedPort;
    },
    close: () =>
      new Promise<void>((resolve, reject) => {
        wss.close((err) => {
          if (err) {
            reject(err);
            return;
          }
          httpServer.close((e) => {
            if (e) reject(e);
            else resolve();
          });
        });
      }),
  };

  httpServer.listen(requestedPort, () => {
    const p = serverHandle.port;
    console.log(`[arcane-server] relay listening on ws://localhost:${p} (max ${MAX_CLIENTS} players)`);
  });

  return serverHandle;
}
