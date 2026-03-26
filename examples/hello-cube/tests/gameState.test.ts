import { describe, expect, it } from 'vitest';
import { GameState } from '../src/components/gameState.js';

describe('GameState', () => {
  it('default factory matches Stage 11 shape', () => {
    const d = GameState.default();
    expect(d.kills).toBe(0);
    expect(d.playerHp).toBe(0);
    expect(d.phase).toBe('playing');
  });
});
