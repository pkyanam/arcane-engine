import { describe, expect, it } from 'vitest';
import { createSceneRegistry, discoverScenes } from '../src/runtime/sceneRegistry.js';

describe('createSceneRegistry', () => {
  it('derives scene names from file paths', () => {
    const preload = async (): Promise<void> => {};
    const scenes = createSceneRegistry({
      '../../scenes/title.ts': {
        preload,
        setup: () => {},
      },
      '../../scenes/gameplay.ts': {
        setup: () => {},
      },
    });

    expect(Object.keys(scenes).sort()).toEqual(['gameplay', 'title']);
    expect(scenes.title.preload).toBe(preload);
  });

  it('throws when a scene module does not export setup', () => {
    expect(() =>
      createSceneRegistry({
        '../../scenes/broken.ts': {
          setup: undefined as never,
        },
      }),
    ).toThrow('createSceneRegistry: ../../scenes/broken.ts is missing a setup export');
  });

  it('loads lazy scene modules during preload and reuses them for setup', async () => {
    const events: string[] = [];
    const scenes = createSceneRegistry({
      '../../scenes/gameplay.ts': async () => ({
        preload: async () => {
          events.push('preload');
        },
        setup: () => {
          events.push('setup');
        },
      }),
    });

    await scenes.gameplay.preload?.();
    scenes.gameplay.setup({} as never);

    expect(events).toEqual(['preload', 'setup']);
  });
});

describe('discoverScenes', () => {
  it('auto-discovers scenes from the scenes directory', () => {
    const scenes = discoverScenes();

    expect(Object.keys(scenes).sort()).toEqual(['gameplay', 'title']);
    expect(scenes.title.setup).toEqual(expect.any(Function));
    expect(scenes.gameplay.setup).toEqual(expect.any(Function));
  });
});
