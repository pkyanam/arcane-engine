import { addComponent, destroyEntity, getComponent, hasComponent, query } from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';
import { Controllable, FPSCamera } from '@arcane-engine/input';
import { raycast } from '@arcane-engine/physics';
import type { PhysicsContext } from '@arcane-engine/physics';
import { MeshRef, Position, Rotation, Scale, spawnMesh } from '@arcane-engine/renderer';
import type { RendererContext } from '@arcane-engine/renderer';
import * as THREE from 'three';
import { findEntityByColliderHandle } from './colliderLookup.js';
import { Damage, Health } from '@arcane-engine/gameplay';
import { NetworkState } from './components/networkState.js';
import { RemotePlayer } from './components/remotePlayer.js';
import type { FpsArenaBuckets } from './fpsArenaSetup.js';

const SOCKET_OPEN = 1;
const SOCKET_CLOSED = 3;

const REMOTE_POSITION_DAMPING = 12;
const REMOTE_YAW_DAMPING = 14;
const REMOTE_SPAWN_FLASH_MS = 220;
const REMOTE_DESPAWN_MS = 220;

type ConnectionPhase = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface NetworkStateSnapshot {
  localPlayerId: string;
  connected: boolean;
  latencyMs: number;
  phase: ConnectionPhase;
  remotePlayerCount: number;
  statusText: string;
  noticeText: string;
  noticeExpiresAtMs: number;
  reconnectAttempt: number;
  reconnectAtMs: number;
}

export interface NetworkSyncOptions {
  /** Opens a fresh browser WebSocket for the relay. */
  createSocket: () => WebSocket;
  /** Disposable arena-owned geometry/material buckets for ghost meshes. */
  buckets: FpsArenaBuckets;
  /** Ping cadence used for the HUD latency readout. */
  pingIntervalMs?: number;
  /** Reconnect backoff sequence after unexpected close. */
  reconnectDelaysMs?: readonly number[];
}

export interface NetworkSyncHandle {
  system: SystemFn;
  /** Send a relayed shoot event when a live connection is available. */
  relayShoot: (payload: {
    origin: { x: number; y: number; z: number };
    direction: { x: number; y: number; z: number };
  }) => void;
  /** Remove timers/listeners and stop reconnect attempts (call from scene teardown). */
  dispose: () => void;
}

function hashPlayerColor(playerId: string): number {
  let h = 0;
  for (let i = 0; i < playerId.length; i++) {
    h = (h * 31 + playerId.charCodeAt(i)) >>> 0;
  }
  const hue = h % 360;
  return new THREE.Color().setHSL(hue / 360, 0.55, 0.52).getHex();
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

function shortestAngleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function dampingAlpha(dt: number, rate: number): number {
  return 1 - Math.exp(-dt * rate);
}

/**
 * WebSocket sync with a small Stage 20 polish layer: remote ghost smoothing,
 * explicit join/leave handling, ping visibility, and bounded auto-reconnect.
 */
export function networkSyncSystem(
  physCtx: PhysicsContext,
  rendererCtx: RendererContext,
  options: NetworkSyncOptions,
): NetworkSyncHandle {
  const incoming: unknown[] = [];
  const ghosts = new Map<string, number>();
  const reconnectDelaysMs = options.reconnectDelaysMs ?? [900, 1800, 3000];
  const pingIntervalMs = options.pingIntervalMs ?? 2000;

  const state: NetworkStateSnapshot = {
    localPlayerId: '',
    connected: false,
    latencyMs: 0,
    phase: 'connecting',
    remotePlayerCount: 0,
    statusText: 'Opening relay connection...',
    noticeText: '',
    noticeExpiresAtMs: 0,
    reconnectAttempt: 0,
    reconnectAtMs: 0,
  };

  let disposed = false;
  let tick = 0;
  let socket: WebSocket | undefined;
  let clearGhostsRequested = false;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let lastPingSentAtMs = 0;
  let awaitingPong = false;

  const setNotice = (text: string, durationMs = 2200): void => {
    state.noticeText = text;
    state.noticeExpiresAtMs = Date.now() + durationMs;
  };

  const setRemotePlayerCount = (): void => {
    state.remotePlayerCount = ghosts.size;
  };

  const syncStateComponent = (world: World): void => {
    const entities = query(world, [NetworkState]);
    const entity = entities[0];
    if (entity === undefined) return;
    const networkState = getComponent(world, entity, NetworkState);
    if (!networkState) return;

    networkState.localPlayerId = state.localPlayerId;
    networkState.connected = state.connected;
    networkState.latencyMs = state.latencyMs;
    networkState.phase = state.phase;
    networkState.remotePlayerCount = state.remotePlayerCount;
    networkState.statusText = state.statusText;
    networkState.noticeText = state.noticeText;
    networkState.noticeExpiresAtMs = state.noticeExpiresAtMs;
    networkState.reconnectAttempt = state.reconnectAttempt;
    networkState.reconnectAtMs = state.reconnectAtMs;
  };

  const removeGhostImmediately = (world: World, playerId: string): void => {
    const entity = ghosts.get(playerId);
    if (entity === undefined) return;
    const meshRef = getComponent(world, entity, MeshRef);
    if (meshRef?.mesh) {
      rendererCtx.scene.remove(meshRef.mesh);
    }
    destroyEntity(world, entity);
    ghosts.delete(playerId);
    setRemotePlayerCount();
  };

  const removeAllGhosts = (world: World): void => {
    for (const playerId of [...ghosts.keys()]) {
      removeGhostImmediately(world, playerId);
    }
  };

  const markGhostLeaving = (world: World, playerId: string): void => {
    const entity = ghosts.get(playerId);
    if (entity === undefined) return;
    const remote = getComponent(world, entity, RemotePlayer);
    if (!remote) {
      removeGhostImmediately(world, playerId);
      return;
    }
    remote.despawnMs = REMOTE_DESPAWN_MS;
  };

  const setGhostMaterialOpacity = (world: World, entity: number, opacity: number): void => {
    const meshRef = getComponent(world, entity, MeshRef);
    const mesh = meshRef?.mesh;
    if (!(mesh instanceof THREE.Mesh)) return;
    const material = mesh.material;
    if (!(material instanceof THREE.MeshStandardMaterial)) return;
    material.transparent = opacity < 0.999;
    material.opacity = opacity;
  };

  const spawnOrUpdateGhost = (
    world: World,
    playerId: string,
    position: { x: number; y: number; z: number },
    yaw: number,
    mode: 'existing' | 'join' | 'move',
  ): void => {
    let entity = ghosts.get(playerId);
    if (entity === undefined) {
      const geo = new THREE.BoxGeometry(0.55, 1.5, 0.55);
      const mat = new THREE.MeshStandardMaterial({
        color: hashPlayerColor(playerId),
        roughness: 0.45,
        metalness: 0.12,
        transparent: true,
        opacity: 0.92,
      });
      options.buckets.geometries.push(geo);
      options.buckets.materials.push(mat);

      entity = spawnMesh(world, rendererCtx, geo, mat, position);
      addComponent(world, entity, Rotation, { x: 0, y: yaw, z: 0 });
      addComponent(world, entity, Scale, { x: 0.82, y: 0.82, z: 0.82 });
      addComponent(world, entity, RemotePlayer, {
        playerId,
        targetPosition: { ...position },
        targetYaw: yaw,
        displayedYaw: yaw,
        spawnFlashMs: mode === 'existing' ? 0 : REMOTE_SPAWN_FLASH_MS,
        despawnMs: 0,
      });
      ghosts.set(playerId, entity);
      setRemotePlayerCount();

      if (mode === 'join' || mode === 'move') {
        setNotice('A remote player joined the relay.', 2200);
      }
      return;
    }

    const remote = getComponent(world, entity, RemotePlayer);
    if (!remote) return;
    remote.targetPosition = { ...position };
    remote.targetYaw = yaw;
    remote.despawnMs = 0;
  };

  const updateGhostMotion = (world: World, dt: number): void => {
    const posAlpha = dampingAlpha(dt, REMOTE_POSITION_DAMPING);
    const yawAlpha = dampingAlpha(dt, REMOTE_YAW_DAMPING);

    for (const [playerId, entity] of [...ghosts]) {
      const position = getComponent(world, entity, Position);
      const rotation = getComponent(world, entity, Rotation);
      const scale = getComponent(world, entity, Scale);
      const remote = getComponent(world, entity, RemotePlayer);
      if (!position || !rotation || !scale || !remote) {
        removeGhostImmediately(world, playerId);
        continue;
      }

      position.x = THREE.MathUtils.lerp(position.x, remote.targetPosition.x, posAlpha);
      position.y = THREE.MathUtils.lerp(position.y, remote.targetPosition.y, posAlpha);
      position.z = THREE.MathUtils.lerp(position.z, remote.targetPosition.z, posAlpha);

      remote.displayedYaw += shortestAngleDelta(remote.displayedYaw, remote.targetYaw) * yawAlpha;
      rotation.x = 0;
      rotation.y = remote.displayedYaw;
      rotation.z = 0;

      if (remote.despawnMs > 0) {
        remote.despawnMs = Math.max(0, remote.despawnMs - dt * 1000);
        const ratio = remote.despawnMs / REMOTE_DESPAWN_MS;
        const scalar = 0.72 + ratio * 0.28;
        scale.x = scalar;
        scale.y = scalar;
        scale.z = scalar;
        setGhostMaterialOpacity(world, entity, 0.18 + ratio * 0.74);
        if (remote.despawnMs === 0) {
          removeGhostImmediately(world, playerId);
        }
        continue;
      }

      if (remote.spawnFlashMs > 0) {
        remote.spawnFlashMs = Math.max(0, remote.spawnFlashMs - dt * 1000);
      }

      const flashRatio = remote.spawnFlashMs / REMOTE_SPAWN_FLASH_MS;
      const scalar = 1 - flashRatio * 0.18;
      scale.x = scalar;
      scale.y = scalar;
      scale.z = scalar;
      setGhostMaterialOpacity(world, entity, 0.92 - flashRatio * 0.2);
    }
  };

  const applyRemoteShoot = (world: World, origin: { x: number; y: number; z: number }, direction: THREE.Vector3): void => {
    const hit = raycast(physCtx, origin, direction, 100);
    if (!hit) return;
    const target = findEntityByColliderHandle(world, physCtx, hit.colliderHandle);
    if (target === undefined) return;
    const locals = query(world, [Controllable, Health]);
    if (!locals.length) return;
    const localPlayer = locals[0];
    if (target !== localPlayer) return;
    if (!hasComponent(world, localPlayer, Health)) return;
    addComponent(world, localPlayer, Damage, { amount: 1 });
  };

  const scheduleReconnect = (): void => {
    if (disposed || reconnectTimer !== undefined) return;

    state.connected = false;
    state.localPlayerId = '';
    state.latencyMs = 0;
    state.phase = 'reconnecting';

    const nextAttempt = state.reconnectAttempt + 1;
    state.reconnectAttempt = nextAttempt;
    const delayMs = reconnectDelaysMs[Math.min(nextAttempt - 1, reconnectDelaysMs.length - 1)];
    state.reconnectAtMs = Date.now() + delayMs;
    state.statusText = 'Relay connection lost. Reconnecting soon...';
    setNotice('Relay connection lost. Trying again...', 2400);

    awaitingPong = false;
    lastPingSentAtMs = 0;

    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      openSocket(true);
    }, delayMs);
  };

  const onSocketMessage = (event: MessageEvent): void => {
    try {
      incoming.push(JSON.parse(String(event.data)) as unknown);
    } catch {
      /* ignore malformed relay payloads */
    }
  };

  const onSocketOpen = (): void => {
    state.connected = false;
    state.phase = state.reconnectAttempt > 0 ? 'reconnecting' : 'connecting';
    state.reconnectAtMs = 0;
    state.statusText = 'Relay opened. Waiting for welcome...';
  };

  const onSocketClose = (event: CloseEvent): void => {
    socket?.removeEventListener('message', onSocketMessage);
    socket?.removeEventListener('open', onSocketOpen);
    socket?.removeEventListener('close', onSocketClose);
    socket = undefined;
    clearGhostsRequested = true;
    state.remotePlayerCount = 0;

    if (disposed) {
      state.phase = 'disconnected';
      state.connected = false;
      state.statusText = 'Relay closed.';
      return;
    }

    if (event.code === 1013) {
      state.connected = false;
      state.phase = 'disconnected';
      state.statusText = 'Relay lobby is full (max 4 players).';
      state.reconnectAtMs = 0;
      setNotice('Relay lobby is full right now.', 2600);
      return;
    }

    scheduleReconnect();
  };

  const openSocket = (isReconnect: boolean): void => {
    if (disposed) return;
    if (reconnectTimer !== undefined) {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
    }

    socket?.removeEventListener('message', onSocketMessage);
    socket?.removeEventListener('open', onSocketOpen);
    socket?.removeEventListener('close', onSocketClose);

    socket = options.createSocket();
    state.phase = isReconnect ? 'reconnecting' : 'connecting';
    state.connected = false;
    state.reconnectAtMs = 0;
    state.statusText = isReconnect ? 'Opening relay connection again...' : 'Opening relay connection...';
    awaitingPong = false;
    lastPingSentAtMs = 0;

    socket.addEventListener('message', onSocketMessage);
    socket.addEventListener('open', onSocketOpen);
    socket.addEventListener('close', onSocketClose);
  };

  openSocket(false);

  const scratchDir = new THREE.Vector3();

  const system: SystemFn = (world: World, dt: number): void => {
    if (clearGhostsRequested) {
      removeAllGhosts(world);
      clearGhostsRequested = false;
    }

    while (incoming.length > 0) {
      const raw = incoming.shift();
      if (raw === undefined || typeof raw !== 'object' || raw === null) continue;
      const message = raw as Record<string, unknown>;

      switch (message.type) {
        case 'welcome': {
          if (typeof message.playerId !== 'string') break;
          state.localPlayerId = message.playerId;
          state.connected = true;
          state.phase = 'connected';
          state.reconnectAttempt = 0;
          state.reconnectAtMs = 0;
          state.statusText = 'Connected to relay.';
          awaitingPong = false;
          lastPingSentAtMs = 0;
          setNotice('Connected to the multiplayer relay.', 1600);

          const existingPlayers = Array.isArray(message.existingPlayers) ? message.existingPlayers : [];
          for (const row of existingPlayers) {
            if (row === null || typeof row !== 'object') continue;
            const player = row as Record<string, unknown>;
            if (typeof player.playerId !== 'string' || player.playerId === state.localPlayerId) continue;
            const position = isVec3(player.position) ? player.position : { x: 0, y: 2, z: 0 };
            const yaw = typeof player.yaw === 'number' && Number.isFinite(player.yaw) ? player.yaw : 0;
            spawnOrUpdateGhost(world, player.playerId, position, yaw, 'existing');
          }
          break;
        }

        case 'join': {
          if (typeof message.playerId !== 'string') break;
          if (message.playerId === state.localPlayerId) break;
          if (!isVec3(message.position)) break;
          const yaw = typeof message.yaw === 'number' && Number.isFinite(message.yaw) ? message.yaw : 0;
          spawnOrUpdateGhost(world, message.playerId, message.position, yaw, 'join');
          break;
        }

        case 'move': {
          if (typeof message.playerId !== 'string') break;
          if (message.playerId === state.localPlayerId) break;
          if (!isVec3(message.position)) break;
          const yaw = typeof message.yaw === 'number' && Number.isFinite(message.yaw) ? message.yaw : 0;
          spawnOrUpdateGhost(
            world,
            message.playerId,
            message.position,
            yaw,
            ghosts.has(message.playerId) ? 'move' : 'join',
          );
          break;
        }

        case 'shoot': {
          if (typeof message.playerId !== 'string') break;
          if (message.playerId === state.localPlayerId) break;
          if (!isVec3(message.origin) || !isVec3(message.direction)) break;
          scratchDir.set(message.direction.x, message.direction.y, message.direction.z);
          applyRemoteShoot(world, message.origin, scratchDir);
          break;
        }

        case 'leave': {
          if (typeof message.playerId !== 'string') break;
          if (message.playerId === state.localPlayerId) break;
          markGhostLeaving(world, message.playerId);
          setNotice('A remote player left the relay.', 2200);
          break;
        }

        case 'pong': {
          if (typeof message.sentAt !== 'number' || !Number.isFinite(message.sentAt)) break;
          state.latencyMs = Math.max(0, Date.now() - message.sentAt);
          state.connected = true;
          state.phase = 'connected';
          state.statusText = 'Connected to relay.';
          awaitingPong = false;
          break;
        }

        default:
          break;
      }
    }

    updateGhostMotion(world, dt);

    if (socket?.readyState === SOCKET_OPEN && state.connected) {
      const now = Date.now();
      if (!awaitingPong && now - lastPingSentAtMs >= pingIntervalMs) {
        socket.send(JSON.stringify({ type: 'ping', sentAt: now }));
        lastPingSentAtMs = now;
        awaitingPong = true;
      }
    } else if (socket?.readyState === SOCKET_CLOSED) {
      state.connected = false;
    }

    if (socket?.readyState !== SOCKET_OPEN) {
      syncStateComponent(world);
      return;
    }

    tick += 1;
    if (tick % 2 === 0) {
      const players = query(world, [Controllable, Position, FPSCamera]);
      if (players.length > 0) {
        const player = players[0];
        const pos = getComponent(world, player, Position)!;
        const cam = getComponent(world, player, FPSCamera)!;
        socket.send(
          JSON.stringify({
            type: 'move',
            position: { x: pos.x, y: pos.y, z: pos.z },
            yaw: cam.yaw,
          }),
        );
      }
    }

    syncStateComponent(world);
  };

  return {
    system,
    relayShoot: (payload) => {
      if (socket?.readyState !== SOCKET_OPEN) return;
      socket.send(JSON.stringify({ type: 'shoot', ...payload }));
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;

      if (reconnectTimer !== undefined) {
        clearTimeout(reconnectTimer);
        reconnectTimer = undefined;
      }

      socket?.removeEventListener('message', onSocketMessage);
      socket?.removeEventListener('open', onSocketOpen);
      socket?.removeEventListener('close', onSocketClose);

      if (socket && socket.readyState !== SOCKET_CLOSED) {
        socket.close();
      }
      socket = undefined;
    },
  };
}
