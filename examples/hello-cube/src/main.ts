import { createGameLoop, createSceneManager, createWorld, runSystems } from '@arcane-engine/core';
import { createRenderer } from '@arcane-engine/renderer';
import gameConfig from '../game.config.js';
import {
  createHelloCubePanel,
  ensureHelloCubeUiStyles,
  getHelloCubeSceneCopy,
} from './helloCubePresentation.js';
import { applyGameConfig, loadInitialScene, loadSceneWithPreload } from './runtime/gameConfig.js';
import { setGameContext } from './runtime/gameContext.js';
import { discoverScenes } from './runtime/sceneRegistry.js';
import type { ScenePreloadProgress } from './runtime/scenePreload.js';
import { configureSceneTransitions, flushSceneChange } from './runtime/sceneTransitions.js';
import { installMobileControls, syncMobileControlsBeforeTick } from './mobileControls.js';

let loadingOverlay: HTMLDivElement | undefined;
let loadingTitle: HTMLHeadingElement | undefined;
let loadingSummary: HTMLParagraphElement | undefined;
let loadingStatus: HTMLParagraphElement | undefined;

function ensureLoadingOverlay(): HTMLDivElement {
  if (loadingOverlay) {
    return loadingOverlay;
  }

  ensureHelloCubeUiStyles();

  loadingOverlay = document.createElement('div');
  loadingOverlay.className = 'arcane-ui-overlay';
  loadingOverlay.style.zIndex = '9999';
  loadingOverlay.style.pointerEvents = 'none';

  const card = createHelloCubePanel({
    eyebrow: 'Scene Preload',
    title: 'Loading Scene',
    body: 'Preparing scene assets before setup starts.',
    footer:
      'Arcane Engine keeps scene setup synchronous, so heavy assets load before you drop into the scene.',
    badges: ['Stage 19', 'Asset Cache'],
  });
  card.root.style.minWidth = 'min(460px, calc(100vw - 48px))';
  card.root.style.maxWidth = 'min(520px, calc(100vw - 48px))';

  loadingTitle = card.title;
  loadingSummary = card.body;
  loadingStatus = document.createElement('p');
  loadingStatus.className = 'arcane-ui-panel__meta';
  loadingStatus.textContent = 'Preparing scene assets...';
  card.root.appendChild(loadingStatus);

  loadingOverlay.appendChild(card.root);
  return loadingOverlay;
}

function showLoadingOverlay(sceneName: string, progress?: ScenePreloadProgress): void {
  const overlay = ensureLoadingOverlay();
  const sceneCopy = getHelloCubeSceneCopy(sceneName);
  if (loadingTitle) {
    loadingTitle.textContent = `Loading ${sceneCopy.displayName}`;
  }
  if (loadingSummary) {
    loadingSummary.textContent = sceneCopy.summary;
  }

  updateLoadingOverlay(sceneName, progress);

  if (!overlay.isConnected) {
    document.body.appendChild(overlay);
  }
}

function updateLoadingOverlay(sceneName: string, progress?: ScenePreloadProgress): void {
  if (!loadingStatus) {
    showLoadingOverlay(sceneName, progress);
    return;
  }

  const sceneCopy = getHelloCubeSceneCopy(sceneName);
  if (!progress || progress.total === 0) {
    loadingStatus.textContent = `${sceneCopy.displayName}: preparing scene assets...`;
    return;
  }

  const progressPrefix = `${progress.loaded}/${progress.total} assets ready.`;
  loadingStatus.textContent = progress.label
    ? `${progressPrefix} ${progress.label}`
    : progressPrefix;
}

function hideLoadingOverlay(): void {
  loadingOverlay?.remove();
}

void (async () => {
  const world = createWorld();
  const ctx = createRenderer(gameConfig.renderer ?? {});

  applyGameConfig(ctx, gameConfig);

  const scenes = discoverScenes();
  const sceneManager = createSceneManager(world, scenes);

  setGameContext({
    ctx,
    config: gameConfig,
    getCurrentSceneName: () => sceneManager.getCurrentSceneName(),
  });

  async function loadScene(name: string): Promise<void> {
    const scene = scenes[name];
    const hasPreload = typeof scene?.preload === 'function';

    if (hasPreload) {
      showLoadingOverlay(name, { loaded: 0, total: 0 });
    }

    try {
      await loadSceneWithPreload(sceneManager, scenes, name, {
        reportProgress(progress) {
          updateLoadingOverlay(name, progress);
        },
      });
    } finally {
      if (hasPreload) {
        hideLoadingOverlay();
      }
    }
  }

  configureSceneTransitions((name) => {
    return loadScene(name);
  });

  const initialScene = scenes[gameConfig.initialScene];
  const initialSceneHasPreload = typeof initialScene?.preload === 'function';
  if (initialSceneHasPreload) {
    showLoadingOverlay(gameConfig.initialScene, { loaded: 0, total: 0 });
  }

  try {
    await loadInitialScene(sceneManager, scenes, gameConfig, {
      reportProgress(progress) {
        updateLoadingOverlay(gameConfig.initialScene, progress);
      },
    });
  } finally {
    if (initialSceneHasPreload) {
      hideLoadingOverlay();
    }
  }

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
