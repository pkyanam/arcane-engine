import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';
import { startRelayServer } from '../src/server.js';

function waitForOpen(ws: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', reject);
  });
}

function waitForMessage(ws: WebSocket): Promise<string> {
  return new Promise((resolve, reject) => {
    ws.once('message', (d) => resolve(String(d)));
    ws.once('error', reject);
  });
}

describe('startRelayServer', () => {
  let srv: ReturnType<typeof startRelayServer> | undefined;

  afterEach(async () => {
    if (!srv) return;
    for (const c of srv.wss.clients) {
      c.close();
    }
    await new Promise((r) => setTimeout(r, 30));
    await srv.close();
    srv = undefined;
  });

  it('sends welcome with playerId and relays move between two clients', async () => {
    const inst = startRelayServer({ port: 0 });
    srv = inst;
    await new Promise<void>((r) => inst.httpServer.once('listening', r));
    const { port } = inst;

    const a = new WebSocket(`ws://127.0.0.1:${port}`);
    const b = new WebSocket(`ws://127.0.0.1:${port}`);
    const welcomeAPromise = waitForMessage(a);
    const welcomeBPromise = waitForMessage(b);
    await waitForOpen(a);
    await waitForOpen(b);

    const welcomeA = JSON.parse(await welcomeAPromise) as {
      type: string;
      playerId: string;
      existingPlayers: { playerId: string }[];
    };
    const welcomeB = JSON.parse(await welcomeBPromise) as {
      type: string;
      playerId: string;
      existingPlayers: { playerId: string }[];
    };

    expect(welcomeA.type).toBe('welcome');
    expect(welcomeB.type).toBe('welcome');
    expect(welcomeA.playerId).not.toBe(welcomeB.playerId);
    expect(welcomeB.existingPlayers.some((p) => p.playerId === welcomeA.playerId)).toBe(true);

    const movePromise = waitForMessage(a);
    b.send(JSON.stringify({ type: 'move', position: { x: 1, y: 2, z: 3 }, yaw: 0.5 }));
    const relayed = JSON.parse(await movePromise) as {
      type: string;
      playerId: string;
      position: { x: number; y: number; z: number };
      yaw: number;
    };
    expect(relayed.type).toBe('move');
    expect(relayed.playerId).toBe(welcomeB.playerId);
    expect(relayed.position).toEqual({ x: 1, y: 2, z: 3 });
    expect(relayed.yaw).toBe(0.5);

    a.close();
    b.close();
    await new Promise((r) => setTimeout(r, 50));
  });

  it('closes the fifth connection with policy violation', async () => {
    const inst = startRelayServer({ port: 0 });
    srv = inst;
    await new Promise<void>((r) => inst.httpServer.once('listening', r));
    const { port } = inst;

    const sockets: WebSocket[] = [];
    for (let i = 0; i < 4; i++) {
      const ws = new WebSocket(`ws://127.0.0.1:${port}`);
      await waitForOpen(ws);
      sockets.push(ws);
    }

    const fifth = new WebSocket(`ws://127.0.0.1:${port}`);
    const code = await new Promise<number>((resolve) => {
      fifth.once('close', (c) => resolve(c));
    });
    expect(code).toBe(1013);

    for (const ws of sockets) ws.close();
    await new Promise((r) => setTimeout(r, 50));
  });
});
