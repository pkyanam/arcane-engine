import {
  addComponent,
  createEntity,
  createWorld,
  getComponent,
  hasComponent,
} from '@arcane-engine/core';
import { describe, expect, it, beforeAll } from 'vitest';
import * as THREE from 'three';
import { Controllable, FPSCamera, InputState } from '@arcane-engine/input';
import { MeshRef, Position, Rotation } from '@arcane-engine/renderer';
import { BoxCollider, createPhysicsContext, initPhysics, physicsSystem, RigidBody } from '@arcane-engine/physics';
import { Damage } from '../src/components/damage.js';
import { Health } from '../src/components/health.js';
import { weaponSystem } from '../src/weaponSystem.js';

beforeAll(async () => {
  await initPhysics();
});

describe('weaponSystem', () => {
  it('applies Damage to a Health target aligned with the crosshair', () => {
    const world = createWorld();
    const physCtx = createPhysicsContext();
    const step = physicsSystem(physCtx);

    const inputEnt = createEntity(world);
    addComponent(world, inputEnt, InputState, { mouseButtons: new Set([0]) });

    const player = createEntity(world);
    addComponent(world, player, Position, { x: 0, y: 0, z: 8 });
    addComponent(world, player, FPSCamera, { yaw: 0, pitch: 0, height: 1.7 });
    addComponent(world, player, Controllable);

    const geo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const mat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(geo, mat);

    const target = createEntity(world);
    addComponent(world, target, Position, { x: 0, y: 1.7, z: 2 });
    addComponent(world, target, Rotation);
    addComponent(world, target, RigidBody, { type: 'fixed' });
    addComponent(world, target, BoxCollider, { hx: 0.35, hy: 0.35, hz: 0.35 });
    addComponent(world, target, MeshRef, { mesh });
    addComponent(world, target, Health, { current: 3, max: 3 });

    step(world, 1 / 60);

    const fire = weaponSystem(physCtx);
    fire(world, 1 / 60);

    expect(hasComponent(world, target, Damage)).toBe(true);
    expect(getComponent(world, target, Damage)?.amount).toBe(1);
  });

  it('does not apply Damage when the ray hits fixed geometry without Health', () => {
    const world = createWorld();
    const physCtx = createPhysicsContext();
    const step = physicsSystem(physCtx);

    const inputEnt = createEntity(world);
    addComponent(world, inputEnt, InputState, { mouseButtons: new Set([0]) });

    const player = createEntity(world);
    addComponent(world, player, Position, { x: 0, y: 0, z: 8 });
    addComponent(world, player, FPSCamera, { yaw: 0, pitch: 0, height: 1.7 });
    addComponent(world, player, Controllable);

    const wall = createEntity(world);
    addComponent(world, wall, Position, { x: 0, y: 1.7, z: 2 });
    addComponent(world, wall, Rotation);
    addComponent(world, wall, RigidBody, { type: 'fixed' });
    addComponent(world, wall, BoxCollider, { hx: 0.35, hy: 0.35, hz: 0.35 });

    step(world, 1 / 60);

    const fire = weaponSystem(physCtx);
    fire(world, 1 / 60);

    expect(hasComponent(world, wall, Damage)).toBe(false);
  });

  it('fires only once per mouse press (edge)', () => {
    const world = createWorld();
    const physCtx = createPhysicsContext();
    const step = physicsSystem(physCtx);

    const inputEnt = createEntity(world);
    addComponent(world, inputEnt, InputState, { mouseButtons: new Set([0]) });

    const player = createEntity(world);
    addComponent(world, player, Position, { x: 0, y: 0, z: 8 });
    addComponent(world, player, FPSCamera, { yaw: 0, pitch: 0, height: 1.7 });
    addComponent(world, player, Controllable);

    const target = createEntity(world);
    addComponent(world, target, Position, { x: 0, y: 1.7, z: 2 });
    addComponent(world, target, Rotation);
    addComponent(world, target, RigidBody, { type: 'fixed' });
    addComponent(world, target, BoxCollider, { hx: 0.35, hy: 0.35, hz: 0.35 });
    addComponent(world, target, Health, { current: 3, max: 3 });

    step(world, 1 / 60);

    const fire = weaponSystem(physCtx);
    fire(world, 1 / 60);
    fire(world, 1 / 60);

    expect(getComponent(world, target, Health)?.current).toBe(3);
    expect(hasComponent(world, target, Damage)).toBe(true);
    expect(getComponent(world, target, Damage)?.amount).toBe(1);
  });
});
