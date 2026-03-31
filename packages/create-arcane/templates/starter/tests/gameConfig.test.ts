import type { SceneManager } from '@arcane-engine/core';
import type { RendererContext } from '@arcane-engine/renderer';
import { describe, expect, it, vi } from 'vitest';
import gameConfig from '../game.config.js';
import { applyGameConfig, loadInitialScene } from '../src/runtime/gameConfig.js';

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
  it('loads the scene named by the game config', () => {
    const sceneManager = {
      loadScene: vi.fn(),
      getCurrentSceneName: vi.fn(),
    } as unknown as SceneManager;

    loadInitialScene(sceneManager, gameConfig);

    expect(sceneManager.loadScene).toHaveBeenCalledWith('title');
  });
});
