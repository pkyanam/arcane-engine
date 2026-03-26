import {
  addComponent,
  createEntity,
  getComponent,
  query,
  registerSystem,
} from '@arcane-engine/core';
import type { World } from '@arcane-engine/core';
import {
  BoxCollider,
  CharacterController,
  characterControllerSystem,
  createPhysicsContext,
  physicsSystem,
  RigidBody,
} from '@arcane-engine/physics';
import type { PhysicsContext } from '@arcane-engine/physics';
import {
  Controllable,
  createInputManager,
  fpsCameraSystem,
  FPSCamera,
} from '@arcane-engine/input';
import { MeshRef, Position, renderSystem, Rotation, spawnMesh } from '@arcane-engine/renderer';
import * as THREE from 'three';
import { getGameContext } from '../src/runtime/gameContext.js';
import { requestSceneChange } from '../src/runtime/sceneTransitions.js';

let physicsCtx: PhysicsContext | undefined;
let inputHandle: ReturnType<typeof createInputManager> | undefined;
let sceneObjects: THREE.Object3D[] = [];
let geometries: THREE.BufferGeometry[] = [];
let materials: THREE.Material[] = [];
let overlay: HTMLDivElement | undefined;
let escListener: ((e: KeyboardEvent) => void) | undefined;

function spawnFixedBlock(
  world: World,
  center: { x: number; y: number; z: number },
  half: { hx: number; hy: number; hz: number },
  color: number,
): void {
  const { ctx } = getGameContext();
  const geo = new THREE.BoxGeometry(half.hx * 2, half.hy * 2, half.hz * 2);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.82,
    metalness: 0.06,
  });
  geometries.push(geo);
  materials.push(mat);

  const entity = spawnMesh(world, ctx, geo, mat, center);
  addComponent(world, entity, Rotation);
  addComponent(world, entity, RigidBody, { type: 'fixed' });
  addComponent(world, entity, BoxCollider, { ...half, friction: 0.75 });
}

function createOverlay(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.position = 'fixed';
  el.style.bottom = '24px';
  el.style.left = '50%';
  el.style.transform = 'translateX(-50%)';
  el.style.padding = '10px 20px';
  el.style.background = 'rgba(15, 23, 42, 0.72)';
  el.style.border = '1px solid rgba(125, 211, 252, 0.3)';
  el.style.borderRadius = '999px';
  el.style.color = '#e2e8f0';
  el.style.fontFamily = '"Avenir Next", "Segoe UI", sans-serif';
  el.style.fontSize = '13px';
  el.style.letterSpacing = '0.06em';
  el.style.pointerEvents = 'none';
  el.textContent = 'FPS Test — click canvas to look, WASD move, Space jump, Escape to title';
  return el;
}

export function setup(world: World): void {
  const { ctx } = getGameContext();

  physicsCtx = createPhysicsContext();
  inputHandle = createInputManager(world, ctx.renderer.domElement);

  const hemi = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.95);
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(4, 14, 10);
  const fill = new THREE.PointLight(0x38bdf8, 6, 50);
  fill.position.set(-8, 5, -6);
  sceneObjects = [hemi, sun, fill];
  for (const obj of sceneObjects) {
    ctx.scene.add(obj);
  }

  // Room (fixed boxes + visible meshes)
  spawnFixedBlock(world, { x: 0, y: 0, z: 0 }, { hx: 10, hy: 0.25, hz: 10 }, 0x334155);
  spawnFixedBlock(world, { x: 0, y: 6, z: 0 }, { hx: 10, hy: 0.25, hz: 10 }, 0x1e293b);
  spawnFixedBlock(world, { x: 0, y: 3, z: -10 }, { hx: 10, hy: 3, hz: 0.25 }, 0x475569);
  spawnFixedBlock(world, { x: 0, y: 3, z: 10 }, { hx: 10, hy: 3, hz: 0.25 }, 0x475569);
  spawnFixedBlock(world, { x: 10, y: 3, z: 0 }, { hx: 0.25, hy: 3, hz: 10 }, 0x64748b);
  spawnFixedBlock(world, { x: -10, y: 3, z: 0 }, { hx: 0.25, hy: 3, hz: 10 }, 0x64748b);

  // Obstacles to jump over
  spawnFixedBlock(world, { x: 3, y: 0.35, z: 2 }, { hx: 0.8, hy: 0.35, hz: 0.8 }, 0xf97316);
  spawnFixedBlock(world, { x: -4, y: 0.55, z: -3 }, { hx: 1, hy: 0.55, hz: 0.5 }, 0x22d3ee);
  spawnFixedBlock(world, { x: -2, y: 0.9, z: 5 }, { hx: 0.6, hy: 0.9, hz: 1.2 }, 0xa78bfa);
  spawnFixedBlock(world, { x: 6, y: 0.4, z: -4 }, { hx: 1.2, hy: 0.4, hz: 0.4 }, 0x4ade80);

  const player = createEntity(world);
  addComponent(world, player, Position, { x: 0, y: 2, z: 0 });
  addComponent(world, player, RigidBody, { type: 'kinematic' });
  addComponent(world, player, BoxCollider, { hx: 0.4, hy: 0.9, hz: 0.4 });
  addComponent(world, player, FPSCamera, { yaw: 0, pitch: 0, height: 1.7 });
  addComponent(world, player, CharacterController, {
    speed: 5,
    jumpSpeed: 6,
    grounded: false,
    _velocityY: 0,
  });
  addComponent(world, player, Controllable);

  ctx.camera.position.set(0, 3.7, 0);
  ctx.camera.rotation.set(0, 0, 0, 'YXZ');

  escListener = (e: KeyboardEvent) => {
    if (e.code === 'Escape') {
      requestSceneChange('title');
    }
  };
  window.addEventListener('keydown', escListener);

  overlay = createOverlay();
  document.body.appendChild(overlay);

  registerSystem(world, physicsSystem(physicsCtx));
  registerSystem(world, characterControllerSystem(physicsCtx));
  registerSystem(world, fpsCameraSystem(ctx));
  registerSystem(world, renderSystem(ctx));
}

export function teardown(world: World): void {
  const { ctx } = getGameContext();

  document.exitPointerLock();

  if (escListener) {
    window.removeEventListener('keydown', escListener);
    escListener = undefined;
  }

  inputHandle?.dispose();
  inputHandle = undefined;

  overlay?.remove();
  overlay = undefined;

  for (const entity of query(world, [MeshRef])) {
    const meshRef = getComponent(world, entity, MeshRef);
    if (meshRef?.mesh) ctx.scene.remove(meshRef.mesh);
  }

  for (const geo of geometries) geo.dispose();
  geometries = [];

  for (const mat of materials) mat.dispose();
  materials = [];

  for (const obj of sceneObjects) ctx.scene.remove(obj);
  sceneObjects = [];

  physicsCtx = undefined;
}
