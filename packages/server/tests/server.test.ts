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

  it('sends welcome, join, move, and pong across the small relay protocol', async () => {
    const inst = startRelayServer({ port: 0, host: '127.0.0.1' });
    srv = inst;
    await new Promise<void>((r) => inst.httpServer.once('listening', r));
    const { port } = inst;

    const a = new WebSocket(`ws://127.0.0.1:${port}`);
    const welcomeAPromise = waitForMessage(a);
    await waitForOpen(a);

    const welcomeA = JSON.parse(await welcomeAPromise) as {
      type: string;
      playerId: string;
      existingPlayers: { playerId: string }[];
    };
    expect(welcomeA.type).toBe('welcome');
    expect(welcomeA.existingPlayers).toEqual([]);

    const b = new WebSocket(`ws://127.0.0.1:${port}`);
    const joinForA = waitForMessage(a);
    const welcomeBPromise = waitForMessage(b);
    await waitForOpen(b);

    const join = JSON.parse(await joinForA) as {
      type: string;
      playerId: string;
      position: { x: number; y: number; z: number };
      yaw: number;
    };
    const welcomeB = JSON.parse(await welcomeBPromise) as {
      type: string;
      playerId: string;
      existingPlayers: { playerId: string }[];
    };

    expect(join.type).toBe('join');
    expect(join.playerId).not.toBe(welcomeA.playerId);
    expect(join.position).toEqual({ x: 0, y: 2, z: 0 });
    expect(join.yaw).toBe(0);

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

    const pongPromise = waitForMessage(b);
    b.send(JSON.stringify({ type: 'ping', sentAt: 1234 }));
    const pong = JSON.parse(await pongPromise) as {
      type: string;
      sentAt: number;
    };
    expect(pong).toEqual({ type: 'pong', sentAt: 1234 });

    a.close();
    b.close();
    await new Promise((r) => setTimeout(r, 50));
  });

  it('closes the fifth connection with policy violation', async () => {
    const inst = startRelayServer({ port: 0, host: '127.0.0.1' });
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
