import type { Scene } from '@arcane-engine/core';

export interface SceneModule {
  setup: Scene['setup'];
  teardown?: Scene['teardown'];
}

export function createSceneRegistry(
  modules: Record<string, SceneModule>,
): Record<string, Scene> {
  const scenes: Record<string, Scene> = {};

  for (const [path, sceneModule] of Object.entries(modules)) {
    if (typeof sceneModule.setup !== 'function') {
      throw new Error(`createSceneRegistry: ${path} is missing a setup export`);
    }

    const match = path.match(/\/([^/]+)\.ts$/);

    if (!match) {
      throw new Error(`createSceneRegistry: could not derive a scene name from ${path}`);
    }

    const [, name] = match;
    scenes[name] = {
      setup: sceneModule.setup,
      teardown: sceneModule.teardown,
    };
  }

  return scenes;
}

export function discoverScenes(): Record<string, Scene> {
  return createSceneRegistry(
    import.meta.glob<SceneModule>('../../scenes/*.ts', { eager: true }),
  );
}
