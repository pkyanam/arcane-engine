export type { ComponentType } from './component.js';
export { defineComponent } from './component.js';

export type { Entity, SystemFn, World } from './world.js';
export {
  createWorld,
  createEntity,
  destroyEntity,
  resetWorld,
  addComponent,
  removeComponent,
  getComponent,
  hasComponent,
} from './world.js';

export { query } from './query.js';

export {
  registerSystem,
  unregisterSystem,
  runSystems,
} from './system.js';

export type { GameLoopOptions, GameLoopHandle } from './gameLoop.js';
export { createGameLoop } from './gameLoop.js';

export type { Scene, SceneManager } from './scene.js';
export { createSceneManager } from './scene.js';
