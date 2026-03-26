import { addComponent, createEntity, createWorld, getComponent, hasComponent } from '@arcane-engine/core';
import { describe, expect, it, beforeAll } from 'vitest';
import * as THREE from 'three';
import type { WebGLRenderer } from 'three';
import { MeshRef, Position } from '@arcane-engine/renderer';
import type { RendererContext } from '@arcane-engine/renderer';
import {
  BoxCollider,
  RapierBodyRef,
  createPhysicsContext,
  initPhysics,
  physicsSystem,
  RigidBody,
} from '@arcane-engine/physics';
import { Damage } from '../src/components/damage.js';
import { Health } from '../src/components/health.js';
import { healthSystem } from '../src/healthSystem.js';

beforeAll(async () => {
  await initPhysics();
});

function minimalRendererContext(): RendererContext {
  return {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(60, 1, 0.1, 100),
    renderer: { domElement: document.createElement('canvas') } as WebGLRenderer,
  };
}

describe('healthSystem', () => {
  it('subtracts damage, removes Damage, and keeps entity alive when hp > 0', () => {
    const world = createWorld();
    const physCtx = createPhysicsContext();
    const rendererCtx = minimalRendererContext();
    const sys = healthSystem(physCtx, rendererCtx);

    const e = createEntity(world);
    addComponent(world, e, Health, { current: 10, max: 10 });
    addComponent(world, e, Damage, { amount: 4 });

    sys(world, 1 / 60);

    expect(hasComponent(world, e, Damage)).toBe(false);
    expect(getComponent(world, e, Health)?.current).toBe(6);
    expect(world.entities.has(e)).toBe(true);
  });

  it('destroys the entity at 0 hp', () => {
    const world = createWorld();
    const physCtx = createPhysicsContext();
    const rendererCtx = minimalRendererContext();
    const sys = healthSystem(physCtx, rendererCtx);

    const e = createEntity(world);
    addComponent(world, e, Health, { current: 1, max: 3 });
    addComponent(world, e, Damage, { amount: 1 });

    sys(world, 1 / 60);

    expect(world.entities.has(e)).toBe(false);
  });

  it('removes mesh from scene and Rapier body when destroying', () => {
    const world = createWorld();
    const physCtx = createPhysicsContext();
    const rendererCtx = minimalRendererContext();
    const sys = healthSystem(physCtx, rendererCtx);

    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshBasicMaterial();
    const mesh = new THREE.Mesh(geo, mat);
    rendererCtx.scene.add(mesh);

    const e = createEntity(world);
    addComponent(world, e, Position, { x: 0, y: 0, z: 0 });
    addComponent(world, e, RigidBody, { type: 'fixed' });
    addComponent(world, e, BoxCollider, { hx: 0.5, hy: 0.5, hz: 0.5 });
    addComponent(world, e, MeshRef, { mesh });
    addComponent(world, e, Health, { current: 1, max: 1 });
    addComponent(world, e, Damage, { amount: 1 });

    physicsSystem(physCtx)(world, 1 / 60);
    expect(hasComponent(world, e, RapierBodyRef)).toBe(true);

    sys(world, 1 / 60);

    expect(rendererCtx.scene.children.includes(mesh)).toBe(false);
    expect(world.entities.has(e)).toBe(false);
  });
});
