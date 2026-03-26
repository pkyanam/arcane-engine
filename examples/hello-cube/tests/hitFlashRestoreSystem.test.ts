import { addComponent, createEntity, createWorld, getComponent, hasComponent } from '@arcane-engine/core';
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { MeshRef } from '@arcane-engine/renderer';
import { HitFlash } from '../src/components/hitFlash.js';
import { hitFlashRestoreSystem } from '../src/hitFlashRestoreSystem.js';

describe('hitFlashRestoreSystem', () => {
  it('restores mesh color and removes HitFlash', () => {
    const world = createWorld();
    const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
    mat.color.setHex(0xffffff);

    const e = createEntity(world);
    addComponent(world, e, MeshRef, { mesh });
    addComponent(world, e, HitFlash, { restoreColorHex: 0xff0000 });

    hitFlashRestoreSystem()(world, 1 / 60);

    expect(mat.color.getHex()).toBe(0xff0000);
    expect(hasComponent(world, e, HitFlash)).toBe(false);
    expect(getComponent(world, e, MeshRef)?.mesh).toBe(mesh);
  });
});
