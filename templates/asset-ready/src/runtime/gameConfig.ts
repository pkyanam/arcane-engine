import type { SceneManager } from '@arcane-engine/core';
import type { RendererContext, RendererOptions } from '@arcane-engine/renderer';
import type { RuntimeScene } from './sceneRegistry.js';
import type { ScenePreloadContext } from './scenePreload.js';

export interface GameConfig {
  initialScene: string;
  canvas?: {
    id?: string;
    className?: string;
  };
  renderer?: Omit<RendererOptions, 'canvas'>;
}

export function applyGameConfig(
  ctx: RendererContext,
  config: GameConfig,
): void {
  if (config.canvas?.id) {
    ctx.renderer.domElement.id = config.canvas.id;
  }

  if (config.canvas?.className) {
    ctx.renderer.domElement.className = config.canvas.className;
  }
}

export async function loadSceneWithPreload(
  sceneManager: SceneManager,
  scenes: Record<string, RuntimeScene>,
  sceneName: string,
  preloadContext?: ScenePreloadContext,
): Promise<void> {
  const scene = scenes[sceneName];
  if (!scene) {
    throw new Error(`loadSceneWithPreload: scene "${sceneName}" is not registered`);
  }

  await scene.preload?.(preloadContext);
  sceneManager.loadScene(sceneName);
}

export async function loadInitialScene(
  sceneManager: SceneManager,
  scenes: Record<string, RuntimeScene>,
  config: GameConfig,
  preloadContext?: ScenePreloadContext,
): Promise<void> {
  await loadSceneWithPreload(sceneManager, scenes, config.initialScene, preloadContext);
}
