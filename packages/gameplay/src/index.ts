// Components
export { Activated } from './components/Activated.js';
export type { ActivatedData } from './components/Activated.js';
export { Health } from './components/Health.js';
export { Damage } from './components/Damage.js';
export { GameState } from './components/GameState.js';
export type { GamePhase, GameStateData } from './components/GameState.js';
export { Hostile } from './components/Hostile.js';
export { InInteractionRange } from './components/InInteractionRange.js';
export type { InInteractionRangeData } from './components/InInteractionRange.js';
export { Interactable } from './components/Interactable.js';
export type { InteractableData } from './components/Interactable.js';
export { Player } from './components/Player.js';
export { Dead } from './components/Dead.js';
export { SpawnPoint } from './components/SpawnPoint.js';

// Systems
export { healthSystem } from './healthSystem.js';
export { gameStateSystem } from './gameStateSystem.js';
export { interactionSystem } from './interactionSystem.js';

// Utilities
export {
  dealDamage,
  getGameState,
  getPlayer,
  makeInteractable,
  respawn,
  setInteractableEnabled,
  wasActivated,
} from './utils.js';
export type { MakeInteractableOptions } from './utils.js';
