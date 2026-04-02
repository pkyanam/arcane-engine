import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  configureSceneTransitions,
  flushSceneChange,
  requestSceneChange,
  resetSceneTransitions,
} from '../src/runtime/sceneTransitions.js';

afterEach(() => {
  resetSceneTransitions();
});

describe('sceneTransitions', () => {
  it('defers scene changes until flushSceneChange runs', () => {
    const loadScene = vi.fn();
    configureSceneTransitions(loadScene);

    requestSceneChange('gameplay');

    expect(loadScene).not.toHaveBeenCalled();

    flushSceneChange();

    expect(loadScene).toHaveBeenCalledWith('gameplay');
  });

  it('uses the latest queued scene change in a frame', () => {
    const loadScene = vi.fn();
    configureSceneTransitions(loadScene);

    requestSceneChange('title');
    requestSceneChange('gameplay');
    flushSceneChange();

    expect(loadScene).toHaveBeenCalledTimes(1);
    expect(loadScene).toHaveBeenCalledWith('gameplay');
  });

  it('throws if a queued scene is flushed before transitions are configured', () => {
    requestSceneChange('title');

    expect(() => flushSceneChange()).toThrow(
      'flushSceneChange: scene transitions have not been configured',
    );
  });

  it('waits for an async scene load before starting the next one', async () => {
    let resolveFirstLoad: (() => void) | undefined;
    const loadScene = vi.fn((name: string) => {
      if (name === 'title') {
        return new Promise<void>((resolve) => {
          resolveFirstLoad = resolve;
        });
      }
      return Promise.resolve();
    });
    configureSceneTransitions(loadScene);

    requestSceneChange('title');
    flushSceneChange();
    requestSceneChange('gameplay');
    flushSceneChange();

    expect(loadScene).toHaveBeenCalledTimes(1);
    expect(loadScene).toHaveBeenCalledWith('title');

    resolveFirstLoad?.();
    await Promise.resolve();
    await Promise.resolve();

    flushSceneChange();

    expect(loadScene).toHaveBeenCalledTimes(2);
    expect(loadScene).toHaveBeenLastCalledWith('gameplay');
  });
});
