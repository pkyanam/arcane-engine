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
});
