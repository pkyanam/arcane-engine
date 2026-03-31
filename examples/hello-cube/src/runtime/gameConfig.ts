import type { SceneManager } from '@arcane-engine/core';
import type { RendererContext, RendererOptions } from '@arcane-engine/renderer';

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

export function loadInitialScene(
  sceneManager: SceneManager,
  config: GameConfig,
): void {
  sceneManager.loadScene(config.initialScene);
}
