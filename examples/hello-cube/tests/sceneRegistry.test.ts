import { describe, expect, it } from 'vitest';
import { createSceneRegistry, discoverScenes } from '../src/runtime/sceneRegistry.js';

describe('createSceneRegistry', () => {
  it('derives scene names from file paths', () => {
    const scenes = createSceneRegistry({
      '../../scenes/title.ts': {
        setup: () => {},
      },
      '../../scenes/gameplay.ts': {
        setup: () => {},
      },
    });

    expect(Object.keys(scenes).sort()).toEqual(['gameplay', 'title']);
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
});

describe('discoverScenes', () => {
  it('auto-discovers scenes from the scenes directory', () => {
    const scenes = discoverScenes();

    expect(Object.keys(scenes).sort()).toEqual(['gameplay', 'physics', 'title']);
    expect(scenes.title.setup).toEqual(expect.any(Function));
    expect(scenes.gameplay.setup).toEqual(expect.any(Function));
    expect(scenes.physics.setup).toEqual(expect.any(Function));
  });
});
