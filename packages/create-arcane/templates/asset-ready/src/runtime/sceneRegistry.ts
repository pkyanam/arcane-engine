import type { Scene } from '@arcane-engine/core';
import type { ScenePreloadContext } from './scenePreload.js';

export interface SceneModule {
  setup: Scene['setup'];
  teardown?: Scene['teardown'];
  preload?: (context?: ScenePreloadContext) => void | Promise<void>;
}

export type SceneModuleLoader = () => Promise<SceneModule>;

export interface RuntimeScene extends Scene {
  preload?: SceneModule['preload'];
}

export function createSceneRegistry(
  modules: Record<string, SceneModule | SceneModuleLoader>,
): Record<string, RuntimeScene> {
  const scenes: Record<string, RuntimeScene> = {};

  for (const [path, sceneModuleOrLoader] of Object.entries(modules)) {
    const name = deriveSceneName(path);

    if (isSceneModuleLoader(sceneModuleOrLoader)) {
      scenes[name] = createLazyRuntimeScene(path, name, sceneModuleOrLoader);
      continue;
    }

    assertSceneModuleHasSetup(path, sceneModuleOrLoader);
    scenes[name] = {
      preload: sceneModuleOrLoader.preload,
      setup: sceneModuleOrLoader.setup,
      teardown: sceneModuleOrLoader.teardown,
    };
  }

  return scenes;
}

export function discoverScenes(): Record<string, RuntimeScene> {
  return createSceneRegistry(
    import.meta.glob<SceneModule>('../../scenes/*.ts'),
  );
}

function deriveSceneName(path: string): string {
  const match = path.match(/\/([^/]+)\.ts$/);

  if (!match) {
    throw new Error(`createSceneRegistry: could not derive a scene name from ${path}`);
  }

  return match[1]!;
}

function isSceneModuleLoader(
  sceneModuleOrLoader: SceneModule | SceneModuleLoader,
): sceneModuleOrLoader is SceneModuleLoader {
  return typeof sceneModuleOrLoader === 'function';
}

function assertSceneModuleHasSetup(
  path: string,
  sceneModule: Partial<SceneModule>,
): asserts sceneModule is SceneModule {
  if (typeof sceneModule.setup !== 'function') {
    throw new Error(`createSceneRegistry: ${path} is missing a setup export`);
  }
}

function createLazyRuntimeScene(
  path: string,
  name: string,
  loadSceneModule: SceneModuleLoader,
): RuntimeScene {
  let sceneModule: SceneModule | undefined;
  let loadingSceneModule: Promise<SceneModule> | undefined;

  const ensureSceneModule = async (): Promise<SceneModule> => {
    if (sceneModule) {
      return sceneModule;
    }

    if (!loadingSceneModule) {
      loadingSceneModule = loadSceneModule().then((loadedSceneModule) => {
        assertSceneModuleHasSetup(path, loadedSceneModule);
        sceneModule = loadedSceneModule;
        return loadedSceneModule;
      });
    }

    return loadingSceneModule;
  };

  return {
    async preload(context) {
      const loadedSceneModule = await ensureSceneModule();
      await loadedSceneModule.preload?.(context);
    },
    setup(world) {
      if (!sceneModule) {
        throw new Error(
          `createSceneRegistry: scene "${name}" must be loaded before setup runs. ` +
            'Use loadSceneWithPreload() when entering runtime-discovered scenes.',
        );
      }

      sceneModule.setup(world);
    },
    teardown(world) {
      sceneModule?.teardown?.(world);
    },
  };
}
