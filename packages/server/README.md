# @arcane-engine/server

Minimal **WebSocket relay** for shipped multiplayer: `welcome` on connect, explicit `join`, fan-out `move` and `shoot`, `leave` on disconnect, plus `ping` / `pong` for a tiny HUD latency readout. No game logic and no server-side simulation.

## Run

```bash
pnpm --filter @arcane-engine/server build
pnpm --filter @arcane-engine/server start
```

Default URL: `ws://localhost:8765` (max 4 clients).

## API

```ts
import { startRelayServer } from '@arcane-engine/server';

const { httpServer, close, port } = startRelayServer({
  port: 8765,
  host: '127.0.0.1',
  onPlayerCount: (n) => console.log('players:', n),
});

await close();
```

The returned object also includes `wss`, the underlying `WebSocketServer`, when you need lower-level access in app code or tests.

## Protocol (JSON text frames)

**Server → client**

- `{ "type": "welcome", "playerId": string, "existingPlayers": [{ "playerId", "position", "yaw" }] }`
- `{ "type": "join", "playerId", "position": {x,y,z}, "yaw": number }`
- `{ "type": "move", "playerId", "position": {x,y,z}, "yaw": number }`
- `{ "type": "shoot", "playerId", "origin", "direction" }` (vec3 each)
- `{ "type": "leave", "playerId" }`
- `{ "type": "pong", "sentAt": number }`

**Client → server**

- `{ "type": "move", "position": {x,y,z}, "yaw": number }`
- `{ "type": "shoot", "origin": {x,y,z}, "direction": {x,y,z} }`
- `{ "type": "ping", "sentAt": number }`
