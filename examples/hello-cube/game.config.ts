import type { GameConfig } from './src/runtime/gameConfig.js';

const gameConfig: GameConfig = {
  initialScene: 'title',
  canvas: {
    id: 'arcane-game',
    className: 'arcane-game-canvas',
  },
  renderer: {
    clearColor: 0x0f172a,
    background: 0x0f172a,
    maxPixelRatio: 2,
  },
};

export default gameConfig;
