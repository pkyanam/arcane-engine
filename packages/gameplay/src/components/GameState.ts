import { defineComponent } from '@arcane-engine/core';

/** Valid game phases. Use `'custom'` with {@link GameStateData.customPhase} for game-specific states. */
export type GamePhase = 'playing' | 'paused' | 'dead' | 'win' | 'custom';

export interface GameStateData {
  phase: GamePhase;
  customPhase: string;
  kills: number;
  score: number;
  elapsedTime: number;
}

/** Singleton component tracking top-level game flow. */
export const GameState = defineComponent<GameStateData>(
  'GameState',
  () => ({
    phase: 'playing',
    customPhase: '',
    kills: 0,
    score: 0,
    elapsedTime: 0,
  }),
);
