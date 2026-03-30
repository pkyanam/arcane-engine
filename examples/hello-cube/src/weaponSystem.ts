import { addComponent, getComponent, hasComponent, query } from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';
import { Controllable, FPSCamera, InputState } from '@arcane-engine/input';
import { MeshRef, Position } from '@arcane-engine/renderer';
import { raycast } from '@arcane-engine/physics';
import type { PhysicsContext } from '@arcane-engine/physics';
import * as THREE from 'three';
import { findEntityByColliderHandle } from './colliderLookup.js';
import { Damage } from './components/damage.js';
import { Health } from './components/health.js';
import { HitFlash } from './components/hitFlash.js';

const scratchEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const scratchDir = new THREE.Vector3();

export interface WeaponSystemOptions {
  /** Ray length in world units. */
  maxRange?: number;
  /** Damage applied per shot. */
  damagePerShot?: number;
  /** Called on each shot attempt (before raycast), e.g. muzzle flash. */
  onFire?: () => void;
  /** Broadcast hitscan line to other clients (multiplayer). */
  onShootRelay?: (payload: {
    origin: { x: number; y: number; z: number };
    direction: { x: number; y: number; z: number };
  }) => void;
}

/**
 * Hitscan weapon: left mouse edge → raycast from eye along view; applies {@link Damage}
 * and a one-frame white flash on {@link THREE.MeshStandardMaterial} targets with {@link Health}.
 */
export const weaponSystem = (
  physCtx: PhysicsContext,
  options?: WeaponSystemOptions,
): SystemFn => {
  const maxRange = options?.maxRange ?? 100;
  const damagePerShot = options?.damagePerShot ?? 1;
  const onFire = options?.onFire;
  const onShootRelay = options?.onShootRelay;

  let prevMouseDown = false;

  return (world: World): void => {
    const inputEntities = query(world, [InputState]);
    if (!inputEntities.length) return;
    const input = getComponent(world, inputEntities[0], InputState)!;

    const leftDown = input.mouseButtons.has(0);
    const fireEdge = leftDown && !prevMouseDown;
    prevMouseDown = leftDown;

    if (!fireEdge) return;

    const players = query(world, [FPSCamera, Position, Controllable]);
    if (!players.length) return;

    const player = players[0];
    const cam = getComponent(world, player, FPSCamera)!;
    const pos = getComponent(world, player, Position)!;

    const origin = {
      x: pos.x,
      y: pos.y + cam.height,
      z: pos.z,
    };

    scratchEuler.set(-cam.pitch, cam.yaw, 0, 'YXZ');
    scratchDir.set(0, 0, -1).applyEuler(scratchEuler);

    const direction = { x: scratchDir.x, y: scratchDir.y, z: scratchDir.z };
    onShootRelay?.({ origin, direction });
    onFire?.();

    const hit = raycast(physCtx, origin, scratchDir, maxRange);
    if (!hit) return;

    const target = findEntityByColliderHandle(world, physCtx, hit.colliderHandle);
    if (target === undefined) return;
    if (!hasComponent(world, target, Health)) return;

    addComponent(world, target, Damage, { amount: damagePerShot });

    const meshRef = getComponent(world, target, MeshRef);
    const mesh = meshRef?.mesh;
    if (mesh && mesh.material instanceof THREE.MeshStandardMaterial) {
      const restoreHex = mesh.material.color.getHex();
      mesh.material.color.setHex(0xffffff);
      addComponent(world, target, HitFlash, { restoreColorHex: restoreHex });
    }
  };
};
