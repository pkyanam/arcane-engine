import { defineComponent } from '@arcane-engine/core';

export type GamePhase = 'playing' | 'dead' | 'win';

/**
 * Example-local singleton: aggregate HUD / flow state for the FPS demo.
 * Synced to the DOM by {@link gameStateSystem}.
 */
export const GameState = defineComponent<{
  kills: number;
  playerHp: number;
  phase: GamePhase;
}>('GameState', () => ({ kills: 0, playerHp: 0, phase: 'playing' }));
