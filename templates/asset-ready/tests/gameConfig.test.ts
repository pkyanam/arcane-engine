import type { SceneManager } from '@arcane-engine/core';
import type { RendererContext } from '@arcane-engine/renderer';
import { describe, expect, it, vi } from 'vitest';
import gameConfig from '../game.config.js';
import { applyGameConfig, loadInitialScene, loadSceneWithPreload } from '../src/runtime/gameConfig.js';

describe('game.config', () => {
  it('uses title as the initial scene', () => {
    expect(gameConfig.initialScene).toBe('title');
  });
});

describe('applyGameConfig', () => {
  it('applies configured canvas metadata', () => {
    const ctx = {
      renderer: {
        domElement: document.createElement('canvas'),
      },
    } as unknown as RendererContext;

    applyGameConfig(ctx, gameConfig);

    expect(ctx.renderer.domElement.id).toBe('arcane-game');
    expect(ctx.renderer.domElement.className).toBe('arcane-game-canvas');
  });
});

describe('loadInitialScene', () => {
  it('loads the scene named by the game config', async () => {
    const sceneManager = {
      loadScene: vi.fn(),
      getCurrentSceneName: vi.fn(),
    } as unknown as SceneManager;
    const scenes = {
      title: {
        setup: () => {},
      },
    };

    await loadInitialScene(sceneManager, scenes, gameConfig);

    expect(sceneManager.loadScene).toHaveBeenCalledWith('title');
  });
});

describe('loadSceneWithPreload', () => {
  it('runs preload before loading the requested scene', async () => {
    const events: string[] = [];
    const sceneManager = {
      loadScene: vi.fn(() => {
        events.push('load');
      }),
      getCurrentSceneName: vi.fn(),
    } as unknown as SceneManager;
    const reportProgress = vi.fn();

    await loadSceneWithPreload(
      sceneManager,
      {
        gameplay: {
          preload: async (context) => {
            context?.reportProgress?.({ loaded: 1, total: 1, label: 'Ready' });
            events.push('preload');
          },
          setup: () => {},
        },
      },
      'gameplay',
      { reportProgress },
    );

    expect(events).toEqual(['preload', 'load']);
    expect(reportProgress).toHaveBeenCalledWith({ loaded: 1, total: 1, label: 'Ready' });
  });
});
