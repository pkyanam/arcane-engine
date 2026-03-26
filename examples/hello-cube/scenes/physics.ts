import { addComponent, getComponent, query, registerSystem } from '@arcane-engine/core';
import type { World } from '@arcane-engine/core';
import { BoxCollider, createPhysicsContext, physicsSystem, RigidBody } from '@arcane-engine/physics';
import type { PhysicsContext } from '@arcane-engine/physics';
import { MeshRef, renderSystem, Rotation, spawnMesh } from '@arcane-engine/renderer';
import * as THREE from 'three';
import { getGameContext } from '../src/runtime/gameContext.js';
import { requestSceneChange } from '../src/runtime/sceneTransitions.js';

// ---------------------------------------------------------------------------
// Module-level state — reset in teardown
// ---------------------------------------------------------------------------

let physicsCtx: PhysicsContext | undefined;
let sceneObjects: THREE.Object3D[] = [];
let geometries: THREE.BufferGeometry[] = [];
let materials: THREE.Material[] = [];
let overlay: HTMLDivElement | undefined;
let escListener: ((e: KeyboardEvent) => void) | undefined;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function spawnGround(world: World): void {
  const { ctx } = getGameContext();

  // Half-extents: 10 × 0.3 × 10 → visible slab 20 × 0.6 × 20
  const hx = 10;
  const hy = 0.3;
  const hz = 10;

  const geo = new THREE.BoxGeometry(hx * 2, hy * 2, hz * 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.85,
    metalness: 0.05,
  });
  geometries.push(geo);
  materials.push(mat);

  const entity = spawnMesh(world, ctx, geo, mat, { x: 0, y: 0, z: 0 });
  addComponent(world, entity, Rotation);
  addComponent(world, entity, RigidBody, { type: 'fixed' });
  addComponent(world, entity, BoxCollider, { hx, hy, hz, friction: 0.7 });

}

function spawnDynamicCube(
  world: World,
  x: number,
  y: number,
  z: number,
  color: number,
  halfSize: number,
): void {
  const { ctx } = getGameContext();

  const geo = new THREE.BoxGeometry(halfSize * 2, halfSize * 2, halfSize * 2);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.45,
    metalness: 0.1,
  });
  geometries.push(geo);
  materials.push(mat);

  const entity = spawnMesh(world, ctx, geo, mat, { x, y, z });
  addComponent(world, entity, Rotation);
  addComponent(world, entity, RigidBody, { type: 'dynamic' });
  addComponent(world, entity, BoxCollider, {
    hx: halfSize,
    hy: halfSize,
    hz: halfSize,
    restitution: 0.25,
    friction: 0.5,
  });
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
  el.textContent = 'Physics Demo — Press Escape to return';
  return el;
}

// ---------------------------------------------------------------------------
// Scene lifecycle
// ---------------------------------------------------------------------------

export function setup(world: World): void {
  const { ctx } = getGameContext();

  physicsCtx = createPhysicsContext();

  // Lighting
  const hemi = new THREE.HemisphereLight(0xdbeafe, 0x1e3a5f, 0.9);
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(6, 12, 8);
  const rim = new THREE.PointLight(0x38bdf8, 8, 40);
  rim.position.set(-6, 6, -4);
  sceneObjects = [hemi, sun, rim];
  for (const obj of sceneObjects) {
    ctx.scene.add(obj);
  }

  // Ground
  spawnGround(world);

  // Dynamic cubes dropped from various heights
  const palette = [
    0xf97316, // orange
    0x22d3ee, // cyan
    0xa78bfa, // purple
    0x4ade80, // green
    0xfbbf24, // amber
    0xf472b6, // pink
    0x60a5fa, // blue
    0xfb923c, // light orange
  ];

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const radius = rand(1.5, 3.5);
    const x = Math.cos(angle) * radius + rand(-0.5, 0.5);
    const y = rand(4, 10);
    const z = Math.sin(angle) * radius + rand(-0.5, 0.5);
    const halfSize = rand(0.25, 0.55);
    const color = palette[i % palette.length]!;
    spawnDynamicCube(world, x, y, z, color, halfSize);
  }

  // Camera — fixed elevated view
  ctx.camera.position.set(0, 14, 18);
  ctx.camera.lookAt(0, 2, 0);

  // Escape returns to title
  escListener = (e: KeyboardEvent) => {
    if (e.code === 'Escape') requestSceneChange('title');
  };
  window.addEventListener('keydown', escListener);

  // Overlay hint
  overlay = createOverlay();
  document.body.appendChild(overlay);

  // Systems
  registerSystem(world, physicsSystem(physicsCtx));
  registerSystem(world, renderSystem(ctx));
}

export function teardown(world: World): void {
  const { ctx } = getGameContext();

  if (escListener) {
    window.removeEventListener('keydown', escListener);
    escListener = undefined;
  }

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

