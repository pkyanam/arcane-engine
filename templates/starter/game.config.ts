import type { GameConfig } from './src/runtime/gameConfig.js';

const gameConfig: GameConfig = {
  initialScene: 'title',
  canvas: {
    id: 'arcane-game',
    className: 'arcane-game-canvas',
  },
  renderer: {
    clearColor: 0x020617,
    background: 0x020617,
    maxPixelRatio: 2,
    shadowMap: true,
  },
};

export default gameConfig;
