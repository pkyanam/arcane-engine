import { describe, expect, it } from 'vitest';
import { GameState } from '@arcane-engine/gameplay';

describe('GameState', () => {
  it('default factory matches gameplay package shape', () => {
    const d = GameState.default();
    expect(d.phase).toBe('playing');
    expect(d.customPhase).toBe('');
    expect(d.kills).toBe(0);
    expect(d.score).toBe(0);
    expect(d.elapsedTime).toBe(0);
  });
});
