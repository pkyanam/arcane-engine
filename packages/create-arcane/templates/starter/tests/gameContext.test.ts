import type { RendererContext } from '@arcane-engine/renderer';
import { afterEach, describe, expect, it } from 'vitest';
import { clearGameContext, getGameContext, setGameContext } from '../src/runtime/gameContext.js';

afterEach(() => {
  clearGameContext();
});

describe('gameContext', () => {
  it('returns the configured game context', () => {
    const context = {
      ctx: { renderer: {} } as RendererContext,
      config: { initialScene: 'title' },
    };

    setGameContext(context);

    expect(getGameContext()).toBe(context);
  });

  it('throws when the runtime has not been configured', () => {
    expect(() => getGameContext()).toThrow(
      'getGameContext: game context has not been configured',
    );
  });
});
