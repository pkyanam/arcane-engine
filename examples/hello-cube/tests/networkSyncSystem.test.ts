import { addComponent, createEntity, createWorld, getComponent, query } from '@arcane-engine/core';
import { describe, expect, it, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import type { WebGLRenderer } from 'three';
import { Position } from '@arcane-engine/renderer';
import type { RendererContext } from '@arcane-engine/renderer';
import { NetworkState } from '../src/components/networkState.js';
import { RemotePlayer } from '../src/components/remotePlayer.js';
import { spawnFpsPlayerRig } from '../src/fpsPlayerSetup.js';
import { networkSyncSystem } from '../src/networkSyncSystem.js';

class MockSocket extends EventTarget {
  readyState = 0;
  sent: string[] = [];

  send(data: string): void {
    this.sent.push(data);
  }

  open(): void {
    this.readyState = 1;
    this.dispatchEvent(new Event('open'));
  }

  emitMessage(payload: unknown): void {
    const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
    this.dispatchEvent(new MessageEvent('message', { data }));
  }

  close(code = 1006, reason = 'closed'): void {
    this.readyState = 3;
    this.dispatchEvent(new CloseEvent('close', { code, reason, wasClean: code === 1000 }));
  }
}

function makeRendererContext(): RendererContext {
  return {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(60, 1, 0.1, 100),
    renderer: { domElement: document.createElement('canvas') } as WebGLRenderer,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('networkSyncSystem', () => {
  it('smooths remote movement and fades ghosts out on leave', () => {
    const world = createWorld();
    spawnFpsPlayerRig(world);
    const networkEntity = createEntity(world);
    addComponent(world, networkEntity, NetworkState);

    const rendererCtx = makeRendererContext();
    const sockets: MockSocket[] = [];
    const net = networkSyncSystem(
      {} as never,
      rendererCtx,
      {
        createSocket: () => {
          const socket = new MockSocket();
          sockets.push(socket);
          return socket as unknown as WebSocket;
        },
        buckets: { geometries: [], materials: [], sceneObjects: [] },
        pingIntervalMs: 10_000,
      },
    );

    sockets[0].open();
    sockets[0].emitMessage({
      type: 'welcome',
      playerId: 'local-player',
      existingPlayers: [
        {
          playerId: 'remote-a',
          position: { x: 0, y: 2, z: 0 },
          yaw: 0,
        },
      ],
    });

    net.system(world, 1 / 60);

    expect(query(world, [RemotePlayer])).toHaveLength(1);
    const state = getComponent(world, networkEntity, NetworkState)!;
    expect(state.phase).toBe('connected');
    expect(state.remotePlayerCount).toBe(1);

    sockets[0].emitMessage({
      type: 'move',
      playerId: 'remote-a',
      position: { x: 10, y: 2, z: 0 },
      yaw: 0,
    });

    net.system(world, 1 / 60);

    const remoteEntity = query(world, [RemotePlayer])[0];
    const smoothed = getComponent(world, remoteEntity, Position)!;
    expect(smoothed.x).toBeGreaterThan(0);
    expect(smoothed.x).toBeLessThan(10);

    sockets[0].emitMessage({ type: 'leave', playerId: 'remote-a' });
    net.system(world, 1 / 60);
    expect(query(world, [RemotePlayer])).toHaveLength(1);

    net.system(world, 0.25);
    expect(query(world, [RemotePlayer])).toHaveLength(0);

    net.dispose();
  });

  it('schedules a reconnect and clears stale ghosts after an unexpected close', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-01T12:00:00Z'));

    const world = createWorld();
    spawnFpsPlayerRig(world);
    const networkEntity = createEntity(world);
    addComponent(world, networkEntity, NetworkState);

    const rendererCtx = makeRendererContext();
    const sockets: MockSocket[] = [];
    const net = networkSyncSystem(
      {} as never,
      rendererCtx,
      {
        createSocket: () => {
          const socket = new MockSocket();
          sockets.push(socket);
          return socket as unknown as WebSocket;
        },
        buckets: { geometries: [], materials: [], sceneObjects: [] },
        pingIntervalMs: 10_000,
        reconnectDelaysMs: [500],
      },
    );

    sockets[0].open();
    sockets[0].emitMessage({
      type: 'welcome',
      playerId: 'local-player',
      existingPlayers: [
        {
          playerId: 'remote-a',
          position: { x: 1, y: 2, z: 0 },
          yaw: 0,
        },
      ],
    });
    net.system(world, 1 / 60);
    expect(query(world, [RemotePlayer])).toHaveLength(1);

    sockets[0].close(1006, 'network lost');
    net.system(world, 1 / 60);

    const reconnecting = getComponent(world, networkEntity, NetworkState)!;
    expect(reconnecting.phase).toBe('reconnecting');
    expect(reconnecting.remotePlayerCount).toBe(0);
    expect(query(world, [RemotePlayer])).toHaveLength(0);

    vi.advanceTimersByTime(500);
    expect(sockets).toHaveLength(2);

    sockets[1].open();
    sockets[1].emitMessage({
      type: 'welcome',
      playerId: 'local-player-2',
      existingPlayers: [],
    });
    net.system(world, 1 / 60);

    const reconnected = getComponent(world, networkEntity, NetworkState)!;
    expect(reconnected.phase).toBe('connected');
    expect(reconnected.localPlayerId).toBe('local-player-2');
    expect(reconnected.remotePlayerCount).toBe(0);

    net.dispose();
  });
});
