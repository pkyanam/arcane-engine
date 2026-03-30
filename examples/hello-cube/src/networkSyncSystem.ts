import { addComponent, destroyEntity, getComponent, hasComponent, query } from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';
import { Controllable, FPSCamera } from '@arcane-engine/input';
import { MeshRef, Position, Rotation, spawnMesh } from '@arcane-engine/renderer';
import type { RendererContext } from '@arcane-engine/renderer';
import { raycast } from '@arcane-engine/physics';
import type { PhysicsContext } from '@arcane-engine/physics';
import * as THREE from 'three';
import { findEntityByColliderHandle } from './colliderLookup.js';
import { Damage } from './components/damage.js';
import { Health } from './components/health.js';
import { NetworkState } from './components/networkState.js';
import { RemotePlayer } from './components/remotePlayer.js';
import type { FpsArenaBuckets } from './fpsArenaSetup.js';

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

export interface NetworkSyncHandle {
  system: SystemFn;
  /** Remove the socket `message` listener (call from scene teardown). */
  dispose: () => void;
}

/**
 * WebSocket sync: throttled move upload, ghost entities for peers, remote hitscan relay.
 */
export function networkSyncSystem(
  physCtx: PhysicsContext,
  rendererCtx: RendererContext,
  socket: WebSocket,
  buckets: FpsArenaBuckets,
): NetworkSyncHandle {
  const incoming: unknown[] = [];
  const ghosts = new Map<string, number>();
  let tick = 0;

  const onMessage = (ev: MessageEvent): void => {
    try {
      incoming.push(JSON.parse(String(ev.data)) as unknown);
    } catch {
      /* ignore */
    }
  };
  socket.addEventListener('message', onMessage);

  const removeGhost = (world: World, playerId: string): void => {
    const entity = ghosts.get(playerId);
    if (entity === undefined) return;
    const meshRef = getComponent(world, entity, MeshRef);
    if (meshRef?.mesh) rendererCtx.scene.remove(meshRef.mesh);
    destroyEntity(world, entity);
    ghosts.delete(playerId);
  };

  const spawnOrUpdateGhost = (
    world: World,
    playerId: string,
    position: { x: number; y: number; z: number },
    yaw: number,
  ): void => {
    let entity = ghosts.get(playerId);
    if (entity === undefined) {
      const geo = new THREE.BoxGeometry(0.55, 1.5, 0.55);
      const mat = new THREE.MeshStandardMaterial({
        color: hashPlayerColor(playerId),
        roughness: 0.45,
        metalness: 0.12,
      });
      buckets.geometries.push(geo);
      buckets.materials.push(mat);
      entity = spawnMesh(world, rendererCtx, geo, mat, position);
      addComponent(world, entity, Rotation, { x: 0, y: yaw, z: 0 });
      addComponent(world, entity, RemotePlayer, { playerId });
      ghosts.set(playerId, entity);
      return;
    }
    const pos = getComponent(world, entity, Position);
    const rot = getComponent(world, entity, Rotation);
    if (pos) {
      pos.x = position.x;
      pos.y = position.y;
      pos.z = position.z;
    }
    if (rot) {
      rot.x = 0;
      rot.y = yaw;
      rot.z = 0;
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

  const scratchDir = new THREE.Vector3();

  const system: SystemFn = (world: World): void => {
    const nsEntities = query(world, [NetworkState]);
    const nsEnt = nsEntities[0];
    const ns = nsEnt !== undefined ? getComponent(world, nsEnt, NetworkState) : undefined;

    while (incoming.length > 0) {
      const raw = incoming.shift();
      if (raw === undefined || typeof raw !== 'object' || raw === null) continue;
      const msg = raw as Record<string, unknown>;

      switch (msg.type) {
        case 'welcome': {
          if (ns && typeof msg.playerId === 'string') {
            ns.localPlayerId = msg.playerId;
            ns.connected = socket.readyState === WebSocket.OPEN;
          }
          const existing = msg.existingPlayers;
          if (Array.isArray(existing)) {
            for (const row of existing) {
              if (row === null || typeof row !== 'object') continue;
              const r = row as Record<string, unknown>;
              if (typeof r.playerId !== 'string') continue;
              const pos = isVec3(r.position) ? r.position : { x: 0, y: 2, z: 0 };
              const yaw = typeof r.yaw === 'number' && Number.isFinite(r.yaw) ? r.yaw : 0;
              spawnOrUpdateGhost(world, r.playerId, pos, yaw);
            }
          }
          break;
        }
        case 'move': {
          if (typeof msg.playerId !== 'string') break;
          if (ns && msg.playerId === ns.localPlayerId) break;
          if (!isVec3(msg.position)) break;
          const yaw = typeof msg.yaw === 'number' && Number.isFinite(msg.yaw) ? msg.yaw : 0;
          spawnOrUpdateGhost(world, msg.playerId, msg.position, yaw);
          break;
        }
        case 'shoot': {
          if (typeof msg.playerId !== 'string') break;
          if (ns && msg.playerId === ns.localPlayerId) break;
          if (!isVec3(msg.origin) || !isVec3(msg.direction)) break;
          scratchDir.set(msg.direction.x, msg.direction.y, msg.direction.z);
          applyRemoteShoot(world, msg.origin, scratchDir);
          break;
        }
        case 'leave': {
          if (typeof msg.playerId === 'string') removeGhost(world, msg.playerId);
          break;
        }
        default:
          break;
      }
    }

    if (ns) {
      ns.connected = socket.readyState === WebSocket.OPEN;
    }

    if (socket.readyState !== WebSocket.OPEN) return;

    tick += 1;
    if (tick % 2 !== 0) return;

    const players = query(world, [Controllable, Position, FPSCamera]);
    if (!players.length) return;
    const p = players[0];
    const pos = getComponent(world, p, Position)!;
    const cam = getComponent(world, p, FPSCamera)!;
    socket.send(
      JSON.stringify({
        type: 'move',
        position: { x: pos.x, y: pos.y, z: pos.z },
        yaw: cam.yaw,
      }),
    );
  };

  return {
    system,
    dispose: () => socket.removeEventListener('message', onMessage),
  };
}
