import {
  addComponent,
  createEntity,
  registerSystem,
} from '@arcane-engine/core';
import type { World } from '@arcane-engine/core';
import {
  characterControllerSystem,
  physicsSystem,
} from '@arcane-engine/physics';
import { fpsCameraSystem } from '@arcane-engine/input';
import { renderSystem } from '@arcane-engine/renderer';
import {
  DAMAGE_ZONE_FPS,
  PLAYER_JUMP_SPEED,
  PLAYER_MOVE_SPEED,
  PLAYER_SPAWN,
} from '../src/fpsArenaSetup.js';
import { NetworkState } from '../src/components/networkState.js';
import { damageZoneSystem } from '../src/damageZoneSystem.js';
import { ensurePhysicsReady } from '../src/ensurePhysicsReady.js';
import { gameStateSystem } from '../src/gameStateSystem.js';
import { getHelloCubeSceneCopy } from '../src/helloCubePresentation.js';
import { spawnFpsGameState, spawnFpsPlayerRig } from '../src/fpsPlayerSetup.js';
import {
  setupSharedFpsScene,
  type SharedFpsSceneRuntime,
} from '../src/fpsSceneRuntime.js';
import { healthSystem } from '../src/healthSystem.js';
import { hitFlashRestoreSystem } from '../src/hitFlashRestoreSystem.js';
import { multiplayerHudSystem } from '../src/multiplayerHudSystem.js';
import { resolveMultiplayerWsUrl } from '../src/multiplayerWsUrl.js';
import { networkSyncSystem } from '../src/networkSyncSystem.js';
import { weaponSystem } from '../src/weaponSystem.js';

let shared: SharedFpsSceneRuntime | undefined;
let netDispose: (() => void) | undefined;
const MULTIPLAYER_COPY = getHelloCubeSceneCopy('multiplayer');

export async function preload(): Promise<void> {
  await ensurePhysicsReady();
}

export function setup(world: World): void {
  shared = setupSharedFpsScene(world, {
    hintText: MULTIPLAYER_COPY.controlHint,
    sceneEyebrow: MULTIPLAYER_COPY.eyebrow,
    sceneTitle: MULTIPLAYER_COPY.displayName,
    sceneSummary: MULTIPLAYER_COPY.summary,
    sceneBadges: MULTIPLAYER_COPY.badges,
    showMultiplayerStatus: true,
  });

  spawnFpsPlayerRig(world);
  spawnFpsGameState(world);
  const netEntity = createEntity(world);
  addComponent(world, netEntity, NetworkState);

  const wsUrl = resolveMultiplayerWsUrl();

  const net = networkSyncSystem(shared.physicsCtx, shared.ctx, {
    createSocket: () => new WebSocket(wsUrl),
    buckets: shared.buckets,
  });
  netDispose = net.dispose;

  registerSystem(world, hitFlashRestoreSystem());
  registerSystem(world, physicsSystem(shared.physicsCtx));
  registerSystem(world, characterControllerSystem(shared.physicsCtx));
  registerSystem(world, fpsCameraSystem(shared.ctx));
  registerSystem(
    world,
    weaponSystem(shared.physicsCtx, {
      onFire: () => shared?.triggerMuzzleFlash(),
      onShootRelay: (payload) => net.relayShoot(payload),
    }),
  );
  registerSystem(world, damageZoneSystem(DAMAGE_ZONE_FPS));
  registerSystem(world, healthSystem(shared.physicsCtx, shared.ctx));
  registerSystem(world, net.system);
  registerSystem(world, multiplayerHudSystem(shared.hud.handles));
  registerSystem(
    world,
    gameStateSystem(shared.physicsCtx, shared.hud.handles, {
      spawn: PLAYER_SPAWN,
      moveSpeed: PLAYER_MOVE_SPEED,
      jumpSpeed: PLAYER_JUMP_SPEED,
    }),
  );
  registerSystem(world, renderSystem(shared.ctx));
}

export function teardown(world: World): void {
  netDispose?.();
  netDispose = undefined;

  shared?.dispose(world);
  shared = undefined;
}
