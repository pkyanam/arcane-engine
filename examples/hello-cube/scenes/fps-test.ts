import { registerSystem } from '@arcane-engine/core';
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
import { weaponSystem } from '../src/weaponSystem.js';

let shared: SharedFpsSceneRuntime | undefined;
const FPS_TEST_COPY = getHelloCubeSceneCopy('fps-test');

export async function preload(): Promise<void> {
  await ensurePhysicsReady();
}

export function setup(world: World): void {
  shared = setupSharedFpsScene(world, {
    hintText: FPS_TEST_COPY.controlHint,
    sceneEyebrow: FPS_TEST_COPY.eyebrow,
    sceneTitle: FPS_TEST_COPY.displayName,
    sceneSummary: FPS_TEST_COPY.summary,
    sceneBadges: FPS_TEST_COPY.badges,
  });

  spawnFpsPlayerRig(world);
  spawnFpsGameState(world);

  registerSystem(world, hitFlashRestoreSystem());
  registerSystem(world, physicsSystem(shared.physicsCtx));
  registerSystem(world, characterControllerSystem(shared.physicsCtx));
  registerSystem(world, fpsCameraSystem(shared.ctx));
  registerSystem(
    world,
    weaponSystem(shared.physicsCtx, {
      onFire: () => shared?.triggerMuzzleFlash(),
    }),
  );
  registerSystem(world, damageZoneSystem(DAMAGE_ZONE_FPS));
  registerSystem(world, healthSystem(shared.physicsCtx, shared.ctx));
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
  shared?.dispose(world);
  shared = undefined;
}
