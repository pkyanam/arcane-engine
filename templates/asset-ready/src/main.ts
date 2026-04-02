import { createGameLoop, createSceneManager, createWorld, runSystems } from '@arcane-engine/core';
import { createRenderer } from '@arcane-engine/renderer';
import gameConfig from '../game.config.js';
import { applyGameConfig, loadSceneWithPreload } from './runtime/gameConfig.js';
import { setGameContext } from './runtime/gameContext.js';
import { discoverScenes } from './runtime/sceneRegistry.js';
import { createScenePreloadOverlay } from './runtime/scenePreload.js';
import { configureSceneTransitions, flushSceneChange } from './runtime/sceneTransitions.js';

void (async () => {
  const world = createWorld();
  const ctx = createRenderer(gameConfig.renderer ?? {});

  applyGameConfig(ctx, gameConfig);
  setGameContext({ ctx, config: gameConfig });

  const scenes = discoverScenes();
  const sceneManager = createSceneManager(world, scenes);
  const preloadOverlay = createScenePreloadOverlay();

  const loadScene = async (name: string): Promise<void> => {
    const preloadContext = preloadOverlay.begin(name);

    try {
      await loadSceneWithPreload(sceneManager, scenes, name, preloadContext);
    } finally {
      preloadOverlay.finish();
    }
  };

  configureSceneTransitions((name) => {
    return loadScene(name);
  });

  await loadScene(gameConfig.initialScene);

  createGameLoop({
    onTick: (dt) => {
      runSystems(world, dt);
      flushSceneChange();
    },
    onRender: (_alpha) => {
      // Rendering is handled inside each scene's registered systems.
    },
  }).start();
})();
