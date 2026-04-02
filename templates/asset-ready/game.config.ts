import type { GameConfig } from './src/runtime/gameConfig.js';

const gameConfig: GameConfig = {
  initialScene: 'title',
  canvas: {
    id: 'arcane-game',
    className: 'arcane-game-canvas',
  },
  renderer: {
    clearColor: 0x04131c,
    background: 0x04131c,
    maxPixelRatio: 2,
    shadowMap: true,
  },
};

export default gameConfig;
