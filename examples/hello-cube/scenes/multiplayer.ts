import {
  addComponent,
  createEntity,
  getComponent,
  query,
  registerSystem,
} from '@arcane-engine/core';
import type { World } from '@arcane-engine/core';
import {
  BoxCollider,
  CharacterController,
  characterControllerSystem,
  createPhysicsContext,
  physicsSystem,
  RigidBody,
} from '@arcane-engine/physics';
import type { PhysicsContext } from '@arcane-engine/physics';
import {
  Controllable,
  createInputManager,
  fpsCameraSystem,
  FPSCamera,
} from '@arcane-engine/input';
import { MeshRef, Position, renderSystem } from '@arcane-engine/renderer';
import {
  DAMAGE_ZONE_FPS,
  PLAYER_JUMP_SPEED,
  PLAYER_MOVE_SPEED,
  PLAYER_SPAWN,
  spawnFpsArenaLights,
  spawnFpsArenaWorld,
  type FpsArenaBuckets,
} from '../src/fpsArenaSetup.js';
import { Health } from '../src/components/health.js';
import { GameState } from '../src/components/gameState.js';
import { NetworkState } from '../src/components/networkState.js';
import { damageZoneSystem } from '../src/damageZoneSystem.js';
import { createArcaneHud, createMuzzleLayer } from '../src/fpsHud.js';
import { gameStateSystem } from '../src/gameStateSystem.js';
import { getGameContext } from '../src/runtime/gameContext.js';
import { requestSceneChange } from '../src/runtime/sceneTransitions.js';
import { healthSystem } from '../src/healthSystem.js';
import { hitFlashRestoreSystem } from '../src/hitFlashRestoreSystem.js';
import { resolveMultiplayerWsUrl } from '../src/multiplayerWsUrl.js';
import { networkSyncSystem } from '../src/networkSyncSystem.js';
import { weaponSystem } from '../src/weaponSystem.js';

let physicsCtx: PhysicsContext | undefined;
let inputHandle: ReturnType<typeof createInputManager> | undefined;
const buckets: FpsArenaBuckets = { geometries: [], materials: [], sceneObjects: [] };
let hudRoot: HTMLDivElement | undefined;
let muzzleLayer: HTMLDivElement | undefined;
let muzzleTimeout: ReturnType<typeof setTimeout> | undefined;
let escListener: ((e: KeyboardEvent) => void) | undefined;
let socket: WebSocket | undefined;
let netDispose: (() => void) | undefined;

function triggerMuzzleFlash(): void {
  if (!muzzleLayer) return;
  if (muzzleTimeout !== undefined) {
    clearTimeout(muzzleTimeout);
    muzzleTimeout = undefined;
  }
  muzzleLayer.style.opacity = '0.28';
  muzzleTimeout = setTimeout(() => {
    muzzleLayer!.style.opacity = '0';
    muzzleTimeout = undefined;
  }, 80);
}

export function setup(world: World): void {
  const { ctx } = getGameContext();

  physicsCtx = createPhysicsContext();
  inputHandle = createInputManager(world, ctx.renderer.domElement);

  spawnFpsArenaLights(ctx, buckets.sceneObjects);
  spawnFpsArenaWorld(world, ctx, buckets);

  const player = createEntity(world);
  addComponent(world, player, Position, { ...PLAYER_SPAWN });
  addComponent(world, player, RigidBody, { type: 'kinematic' });
  addComponent(world, player, BoxCollider, { hx: 0.4, hy: 0.9, hz: 0.4 });
  addComponent(world, player, FPSCamera, { yaw: 0, pitch: 0, height: 1.7 });
  addComponent(world, player, CharacterController, {
    speed: PLAYER_MOVE_SPEED,
    jumpSpeed: PLAYER_JUMP_SPEED,
    grounded: false,
    _velocityY: 0,
  });
  addComponent(world, player, Controllable);
  addComponent(world, player, Health, { current: 10, max: 10 });

  const gameStateEntity = createEntity(world);
  addComponent(world, gameStateEntity, GameState, {
    kills: 0,
    playerHp: 10,
    phase: 'playing',
  });

  const netEntity = createEntity(world);
  addComponent(world, netEntity, NetworkState);

  ctx.camera.position.set(0, 3.7, 0);
  ctx.camera.rotation.set(0, 0, 0, 'YXZ');

  escListener = (e: KeyboardEvent) => {
    if (e.code === 'Escape') {
      requestSceneChange('title');
    }
  };
  window.addEventListener('keydown', escListener);

  const hud = createArcaneHud(
    'Multiplayer — other players are colored boxes. Shoot them with hitscan (relayed). Red floor pad still hurts. Run relay: pnpm --filter @arcane-engine/server start. Esc → title.',
  );
  hudRoot = hud.root;
  document.body.appendChild(hudRoot);

  muzzleLayer = createMuzzleLayer();
  document.body.appendChild(muzzleLayer);

  const wsUrl = resolveMultiplayerWsUrl();
  socket = new WebSocket(wsUrl);

  const net = networkSyncSystem(physicsCtx, ctx, socket, buckets);
  netDispose = net.dispose;

  registerSystem(world, hitFlashRestoreSystem());
  registerSystem(world, physicsSystem(physicsCtx));
  registerSystem(world, characterControllerSystem(physicsCtx));
  registerSystem(world, fpsCameraSystem(ctx));
  registerSystem(
    world,
    weaponSystem(physicsCtx, {
      onFire: triggerMuzzleFlash,
      onShootRelay: (payload) => {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'shoot', ...payload }));
        }
      },
    }),
  );
  registerSystem(world, damageZoneSystem(DAMAGE_ZONE_FPS));
  registerSystem(world, healthSystem(physicsCtx, ctx));
  registerSystem(world, net.system);
  registerSystem(
    world,
    gameStateSystem(physicsCtx, hud.handles, {
      spawn: PLAYER_SPAWN,
      moveSpeed: PLAYER_MOVE_SPEED,
      jumpSpeed: PLAYER_JUMP_SPEED,
    }),
  );
  registerSystem(world, renderSystem(ctx));
}

export function teardown(world: World): void {
  const { ctx } = getGameContext();

  document.exitPointerLock();

  if (escListener) {
    window.removeEventListener('keydown', escListener);
    escListener = undefined;
  }

  netDispose?.();
  netDispose = undefined;

  socket?.close();
  socket = undefined;

  inputHandle?.dispose();
  inputHandle = undefined;

  hudRoot?.remove();
  hudRoot = undefined;

  if (muzzleTimeout !== undefined) {
    clearTimeout(muzzleTimeout);
    muzzleTimeout = undefined;
  }
  muzzleLayer?.remove();
  muzzleLayer = undefined;

  for (const entity of query(world, [MeshRef])) {
    const meshRef = getComponent(world, entity, MeshRef);
    if (meshRef?.mesh) ctx.scene.remove(meshRef.mesh);
  }

  for (const geo of buckets.geometries) geo.dispose();
  buckets.geometries.length = 0;

  for (const mat of buckets.materials) mat.dispose();
  buckets.materials.length = 0;

  for (const obj of buckets.sceneObjects) ctx.scene.remove(obj);
  buckets.sceneObjects.length = 0;

  physicsCtx = undefined;
}
