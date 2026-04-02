import { addComponent, createEntity } from '@arcane-engine/core';
import type { Entity, World } from '@arcane-engine/core';
import { Controllable, FPSCamera } from '@arcane-engine/input';
import {
  BoxCollider,
  CharacterController,
  RigidBody,
} from '@arcane-engine/physics';
import { Position } from '@arcane-engine/renderer';
import { GameState, type GamePhase } from './components/gameState.js';
import { Health } from './components/health.js';
import {
  PLAYER_JUMP_SPEED,
  PLAYER_MOVE_SPEED,
  PLAYER_SPAWN,
} from './fpsArenaSetup.js';

export interface SpawnFpsPlayerRigOptions {
  spawn?: { x: number; y: number; z: number };
  moveSpeed?: number;
  jumpSpeed?: number;
  health?: { current: number; max: number };
}

export interface SpawnFpsGameStateOptions {
  kills?: number;
  playerHp?: number;
  phase?: GamePhase;
}

/**
 * Spawn the local FPS player rig used by both `fps-test` and `multiplayer`.
 */
export function spawnFpsPlayerRig(
  world: World,
  options?: SpawnFpsPlayerRigOptions,
): Entity {
  const spawn = options?.spawn ?? PLAYER_SPAWN;
  const moveSpeed = options?.moveSpeed ?? PLAYER_MOVE_SPEED;
  const jumpSpeed = options?.jumpSpeed ?? PLAYER_JUMP_SPEED;
  const health = options?.health ?? { current: 10, max: 10 };

  const player = createEntity(world);
  addComponent(world, player, Position, { ...spawn });
  addComponent(world, player, RigidBody, { type: 'kinematic' });
  addComponent(world, player, BoxCollider, { hx: 0.4, hy: 0.9, hz: 0.4 });
  addComponent(world, player, FPSCamera, { yaw: 0, pitch: 0, height: 1.7 });
  addComponent(world, player, CharacterController, {
    speed: moveSpeed,
    jumpSpeed,
    grounded: false,
    _velocityY: 0,
  });
  addComponent(world, player, Controllable);
  addComponent(world, player, Health, health);

  return player;
}

/**
 * Spawn the example-local singleton used by the FPS HUD and respawn flow.
 */
export function spawnFpsGameState(
  world: World,
  options?: SpawnFpsGameStateOptions,
): Entity {
  const gameStateEntity = createEntity(world);
  addComponent(world, gameStateEntity, GameState, {
    kills: options?.kills ?? 0,
    playerHp: options?.playerHp ?? 10,
    phase: options?.phase ?? 'playing',
  });
  return gameStateEntity;
}
