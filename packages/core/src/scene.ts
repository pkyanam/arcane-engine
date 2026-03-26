import { resetWorld } from './world.js';
import type { World } from './world.js';

/**
 * Scene lifecycle hooks used by the scene manager.
 */
export interface Scene {
  /** Populate the world with entities, systems, and scene-specific state. */
  setup(world: World): void;
  /** Clean up DOM or renderer state before the world is reset. */
  teardown?(world: World): void;
}

/**
 * Loads named scenes into a shared world.
 */
export interface SceneManager {
  /** Tear down the current scene, reset the world, and load the next scene. */
  loadScene(name: string): void;
  /** Return the active scene name, if one has been loaded. */
  getCurrentSceneName(): string | undefined;
}

/**
 * Create a scene manager that resets the world between scene transitions.
 */
export function createSceneManager(
  world: World,
  scenes: Record<string, Scene>,
): SceneManager {
  let currentSceneName: string | undefined;
  let currentScene: Scene | undefined;

  return {
    loadScene(name) {
      const nextScene = scenes[name];

      if (!nextScene) {
        throw new Error(`loadScene: scene "${name}" is not registered`);
      }

      currentScene?.teardown?.(world);

      currentScene = undefined;
      currentSceneName = undefined;
      resetWorld(world);

      nextScene.setup(world);

      currentScene = nextScene;
      currentSceneName = name;
    },
    getCurrentSceneName() {
      return currentSceneName;
    },
  };
}
