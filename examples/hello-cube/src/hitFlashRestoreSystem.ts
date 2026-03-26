import { getComponent, query, removeComponent } from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';
import { MeshRef } from '@arcane-engine/renderer';
import * as THREE from 'three';
import { HitFlash } from './components/hitFlash.js';

/**
 * Restores mesh colors from the previous frame's hit flash. Run first each tick,
 * before {@link weaponSystem}.
 */
export const hitFlashRestoreSystem = (): SystemFn => (world: World): void => {
  for (const entity of query(world, [HitFlash, MeshRef])) {
    const flash = getComponent(world, entity, HitFlash)!;
    const meshRef = getComponent(world, entity, MeshRef)!;
    const mesh = meshRef.mesh;
    if (mesh && mesh.material instanceof THREE.MeshStandardMaterial) {
      mesh.material.color.setHex(flash.restoreColorHex);
    }
    removeComponent(world, entity, HitFlash);
  }
};
