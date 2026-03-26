import type { SceneManager } from '@arcane-engine/core';
import type { RendererContext } from '@arcane-engine/renderer';

export interface GameConfig {
  initialScene: string;
  canvas?: {
    id?: string;
    className?: string;
  };
  renderer?: {
    clearColor?: number;
  };
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

  if (config.renderer?.clearColor !== undefined) {
    ctx.renderer.setClearColor(config.renderer.clearColor);
  }
}

export function loadInitialScene(
  sceneManager: SceneManager,
  config: GameConfig,
): void {
  sceneManager.loadScene(config.initialScene);
}
