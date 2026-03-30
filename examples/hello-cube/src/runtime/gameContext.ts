import type { RendererContext } from '@arcane-engine/renderer';
import type { GameConfig } from './gameConfig.js';

export interface GameContext {
  ctx: RendererContext;
  config: GameConfig;
  /** Active scene name from the scene manager (for mobile UI overlays). */
  getCurrentSceneName: () => string | undefined;
}

let gameContext: GameContext | undefined;

export function setGameContext(context: GameContext): void {
  gameContext = context;
}

export function getGameContext(): GameContext {
  if (!gameContext) {
    throw new Error('getGameContext: game context has not been configured');
  }

  return gameContext;
}

export function clearGameContext(): void {
  gameContext = undefined;
}
