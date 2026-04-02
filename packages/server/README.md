# @arcane-engine/server

Tiny WebSocket relay for Arcane Engine multiplayer demos.

This package does not run game logic or simulation.

It only relays messages like:

- player joined
- player moved
- player shot
- player left
- ping

That keeps the server easy to understand and easy to host.

## Run

```sh
pnpm --filter @arcane-engine/server build
pnpm --filter @arcane-engine/server start
```

Default address: `ws://localhost:8765`

## API

```ts
import { startRelayServer } from '@arcane-engine/server';

const relay = startRelayServer({
  port: 8765,
  host: '127.0.0.1',
  onPlayerCount(count) {
    console.log('players:', count);
  },
});

await relay.close();
```

The returned object includes:

- `httpServer`
- `wss`
- `port`
- `close()`

## Protocol

Server to client:

- `{ "type": "welcome", "playerId": string, "existingPlayers": [...] }`
- `{ "type": "join", "playerId": string, "position": {x,y,z}, "yaw": number }`
- `{ "type": "move", "playerId": string, "position": {x,y,z}, "yaw": number }`
- `{ "type": "shoot", "playerId": string, "origin": {x,y,z}, "direction": {x,y,z} }`
- `{ "type": "leave", "playerId": string }`
- `{ "type": "pong", "sentAt": number }`

Client to server:

- `{ "type": "move", "position": {x,y,z}, "yaw": number }`
- `{ "type": "shoot", "origin": {x,y,z}, "direction": {x,y,z} }`
- `{ "type": "ping", "sentAt": number }`

## Notes

- the relay allows up to 4 connected clients
- clients stay authoritative for their own movement
- this package is meant for prototypes and teaching examples, not production-grade servers
