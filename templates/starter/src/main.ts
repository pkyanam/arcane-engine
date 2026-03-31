import { createGameLoop, createSceneManager, createWorld, runSystems } from '@arcane-engine/core';
import { createRenderer } from '@arcane-engine/renderer';
import gameConfig from '../game.config.js';
import { applyGameConfig, loadInitialScene } from './runtime/gameConfig.js';
import { setGameContext } from './runtime/gameContext.js';
import { discoverScenes } from './runtime/sceneRegistry.js';
import { configureSceneTransitions, flushSceneChange } from './runtime/sceneTransitions.js';

const world = createWorld();
const ctx = createRenderer(gameConfig.renderer ?? {});

applyGameConfig(ctx, gameConfig);
setGameContext({ ctx, config: gameConfig });

const scenes = discoverScenes();
const sceneManager = createSceneManager(world, scenes);

configureSceneTransitions((name) => {
  sceneManager.loadScene(name);
});

loadInitialScene(sceneManager, gameConfig);

createGameLoop({
  onTick: (dt) => {
    runSystems(world, dt);
    flushSceneChange();
  },
  onRender: (_alpha) => {
    // Rendering is handled inside each scene's registered systems.
  },
}).start();
