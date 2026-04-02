import { getComponent, query } from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';
import { Controllable, InputState } from '@arcane-engine/input';
import { CharacterController, RapierBodyRef } from '@arcane-engine/physics';
import type { PhysicsContext } from '@arcane-engine/physics';
import { Position } from '@arcane-engine/renderer';
import { Health } from './components/health.js';
import { GameState } from './components/gameState.js';
import { ShootableTarget } from './components/shootableTarget.js';
import type { FpsHudHandles } from './fpsHud.js';

export type { FpsHudHandles };

export interface GameStateSystemOptions {
  spawn: { x: number; y: number; z: number };
  moveSpeed: number;
  jumpSpeed: number;
}

/**
 * Keeps {@link GameState} in sync with the player, drives HUD text, win/death overlays,
 * and handles **R** respawn while `phase === 'dead'`.
 */
export const gameStateSystem = (
  physCtx: PhysicsContext,
  hud: FpsHudHandles,
  opts: GameStateSystemOptions,
): SystemFn => {
  let prevR = false;

  return (world: World): void => {
    const gsEntities = query(world, [GameState]);
    if (!gsEntities.length) return;
    const gsEnt = gsEntities[0];
    const gs = getComponent(world, gsEnt, GameState)!;

    const players = query(world, [Controllable, Health, Position]);

    const targetsLeft = query(world, [ShootableTarget]).length;
    if (gs.phase === 'playing' && targetsLeft === 0) {
      gs.phase = 'win';
    }

    const inputEntities = query(world, [InputState]);
    const input =
      inputEntities[0] !== undefined
        ? getComponent(world, inputEntities[0], InputState)
        : undefined;
    const rDown = input?.keys.has('KeyR') ?? false;
    const rEdge = rDown && !prevR;
    prevR = rDown;

    if (rEdge && gs.phase === 'dead' && players.length) {
      const player = players[0];
      const pos = getComponent(world, player, Position)!;
      const hp = getComponent(world, player, Health)!;
      pos.x = opts.spawn.x;
      pos.y = opts.spawn.y;
      pos.z = opts.spawn.z;
      hp.current = hp.max;

      const bodyRef = getComponent(world, player, RapierBodyRef);
      if (bodyRef) {
        const body = physCtx.world.getRigidBody(bodyRef.handle);
        body?.setNextKinematicTranslation({ x: pos.x, y: pos.y, z: pos.z });
      }

      const cc = getComponent(world, player, CharacterController);
      if (cc) {
        cc._velocityY = 0;
        cc.grounded = false;
      }

      gs.phase = 'playing';
    }

    if (players.length) {
      const hp = getComponent(world, players[0], Health)!;
      gs.playerHp = hp.current;
    }

    for (const entity of query(world, [Controllable, CharacterController])) {
      const cc = getComponent(world, entity, CharacterController)!;
      const canMove = gs.phase === 'playing';
      cc.speed = canMove ? opts.moveSpeed : 0;
      cc.jumpSpeed = canMove ? opts.jumpSpeed : 0;
    }

    const maxHp = players.length ? getComponent(world, players[0], Health)!.max : 1;
    const ratio = Math.max(0, Math.min(1, gs.playerHp / maxHp));
    hud.healthFill.style.transform = `scaleX(${ratio})`;
    hud.healthLabel.textContent = `${Math.max(0, Math.ceil(gs.playerHp))} / ${maxHp}`;
    hud.killsLabel.textContent = `Kills ${gs.kills}`;

    if (gs.phase === 'dead') {
      hud.overlay.style.display = 'flex';
      hud.overlay.textContent = 'You died — press R to respawn';
    } else if (gs.phase === 'win') {
      hud.overlay.style.display = 'flex';
      hud.overlay.textContent = 'You win';
    } else {
      hud.overlay.style.display = 'none';
    }
  };
};
