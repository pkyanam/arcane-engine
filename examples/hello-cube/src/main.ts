import { createGameLoop, createSceneManager, createWorld, runSystems } from '@arcane-engine/core';
import { initPhysics } from '@arcane-engine/physics';
import { createRenderer } from '@arcane-engine/renderer';
import gameConfig from '../game.config.js';
import { applyGameConfig, loadInitialScene } from './runtime/gameConfig.js';
import { setGameContext } from './runtime/gameContext.js';
import { discoverScenes } from './runtime/sceneRegistry.js';
import { configureSceneTransitions, flushSceneChange } from './runtime/sceneTransitions.js';
import { installMobileControls, syncMobileControlsBeforeTick } from './mobileControls.js';

void (async () => {
  await initPhysics();

  const world = createWorld();
  const ctx = createRenderer();

  applyGameConfig(ctx, gameConfig);

  const scenes = discoverScenes();
  const sceneManager = createSceneManager(world, scenes);

  setGameContext({
    ctx,
    config: gameConfig,
    getCurrentSceneName: () => sceneManager.getCurrentSceneName(),
  });

  configureSceneTransitions((name) => {
    sceneManager.loadScene(name);
  });

  loadInitialScene(sceneManager, gameConfig);

  installMobileControls(world);

  createGameLoop({
    onTick: (dt) => {
      syncMobileControlsBeforeTick(world);
      runSystems(world, dt);
      flushSceneChange();
    },
    onRender: (_alpha) => {
      // Rendering is handled inside each scene's registered systems.
    },
  }).start();
})();
