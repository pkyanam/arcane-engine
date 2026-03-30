import { addComponent } from '@arcane-engine/core';
import type { World } from '@arcane-engine/core';
import { BoxCollider, RigidBody } from '@arcane-engine/physics';
import { Position, Rotation, spawnMesh } from '@arcane-engine/renderer';
import type { RendererContext } from '@arcane-engine/renderer';
import * as THREE from 'three';
import { Health } from './components/health.js';
import { ShootableTarget } from './components/shootableTarget.js';

export const PLAYER_SPAWN = { x: 0, y: 2, z: 0 };
export const PLAYER_MOVE_SPEED = 5;
export const PLAYER_JUMP_SPEED = 6;

/** Floor top (main slab: center y=0, half height 0.25). */
export const FLOOR_TOP_Y = 0.25;

export interface FpsArenaBuckets {
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  sceneObjects: THREE.Object3D[];
}

export function spawnFpsArenaLights(ctx: RendererContext, sceneObjects: THREE.Object3D[]): void {
  const hemi = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 0.95);
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(4, 14, 10);
  const fill = new THREE.PointLight(0x38bdf8, 6, 50);
  fill.position.set(-8, 5, -6);
  sceneObjects.push(hemi, sun, fill);
  for (const obj of sceneObjects) {
    ctx.scene.add(obj);
  }
}

function spawnFixedBlock(
  world: World,
  ctx: RendererContext,
  buckets: FpsArenaBuckets,
  center: { x: number; y: number; z: number },
  half: { hx: number; hy: number; hz: number },
  color: number,
): void {
  const geo = new THREE.BoxGeometry(half.hx * 2, half.hy * 2, half.hz * 2);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.82,
    metalness: 0.06,
  });
  buckets.geometries.push(geo);
  buckets.materials.push(mat);

  const entity = spawnMesh(world, ctx, geo, mat, center);
  addComponent(world, entity, Rotation);
  addComponent(world, entity, RigidBody, { type: 'fixed' });
  addComponent(world, entity, BoxCollider, { ...half, friction: 0.75 });
}

function spawnHazardFloorPad(
  world: World,
  ctx: RendererContext,
  buckets: FpsArenaBuckets,
  centerXZ: { x: number; z: number },
  halfXZ: { hx: number; hz: number },
  thickness: number,
): void {
  const halfY = thickness / 2;
  const center = { x: centerXZ.x, y: FLOOR_TOP_Y + halfY, z: centerXZ.z };
  const geo = new THREE.BoxGeometry(halfXZ.hx * 2, thickness, halfXZ.hz * 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0x7f1d1d,
    emissiveIntensity: 0.85,
    roughness: 0.55,
    metalness: 0.08,
  });
  buckets.geometries.push(geo);
  buckets.materials.push(mat);

  const entity = spawnMesh(world, ctx, geo, mat, center);
  addComponent(world, entity, Rotation);
}

function spawnShootingTarget(
  world: World,
  ctx: RendererContext,
  buckets: FpsArenaBuckets,
  center: { x: number; y: number; z: number },
  half: { hx: number; hy: number; hz: number },
  color: number,
): void {
  const geo = new THREE.BoxGeometry(half.hx * 2, half.hy * 2, half.hz * 2);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.12,
  });
  buckets.geometries.push(geo);
  buckets.materials.push(mat);

  const entity = spawnMesh(world, ctx, geo, mat, center);
  addComponent(world, entity, Rotation);
  addComponent(world, entity, RigidBody, { type: 'fixed' });
  addComponent(world, entity, BoxCollider, { ...half, friction: 0.75 });
  addComponent(world, entity, Health, { current: 3, max: 3 });
  addComponent(world, entity, ShootableTarget);
}

/** Same room, obstacles, hazard pad, and shootable targets as `fps-test`. */
export function spawnFpsArenaWorld(world: World, ctx: RendererContext, buckets: FpsArenaBuckets): void {
  spawnFixedBlock(world, ctx, buckets, { x: 0, y: 0, z: 0 }, { hx: 10, hy: 0.25, hz: 10 }, 0x334155);
  spawnFixedBlock(world, ctx, buckets, { x: 0, y: 6, z: 0 }, { hx: 10, hy: 0.25, hz: 10 }, 0x1e293b);
  spawnFixedBlock(world, ctx, buckets, { x: 0, y: 3, z: -10 }, { hx: 10, hy: 3, hz: 0.25 }, 0x475569);
  spawnFixedBlock(world, ctx, buckets, { x: 0, y: 3, z: 10 }, { hx: 10, hy: 3, hz: 0.25 }, 0x475569);
  spawnFixedBlock(world, ctx, buckets, { x: 10, y: 3, z: 0 }, { hx: 0.25, hy: 3, hz: 10 }, 0x64748b);
  spawnFixedBlock(world, ctx, buckets, { x: -10, y: 3, z: 0 }, { hx: 0.25, hy: 3, hz: 10 }, 0x64748b);

  spawnFixedBlock(world, ctx, buckets, { x: 3, y: 0.35, z: 2 }, { hx: 0.8, hy: 0.35, hz: 0.8 }, 0xf97316);
  spawnFixedBlock(world, ctx, buckets, { x: -4, y: 0.55, z: -3 }, { hx: 1, hy: 0.55, hz: 0.5 }, 0x22d3ee);
  spawnFixedBlock(world, ctx, buckets, { x: -2, y: 0.9, z: 5 }, { hx: 0.6, hy: 0.9, hz: 1.2 }, 0xa78bfa);
  spawnFixedBlock(world, ctx, buckets, { x: 6, y: 0.4, z: -4 }, { hx: 1.2, hy: 0.4, hz: 0.4 }, 0x4ade80);

  spawnHazardFloorPad(world, ctx, buckets, { x: 7.75, z: 7.75 }, { hx: 1.35, hz: 1.35 }, 0.06);

  spawnShootingTarget(world, ctx, buckets, { x: -3, y: 1.4, z: -9.5 }, { hx: 0.35, hy: 0.55, hz: 0.15 }, 0xf43f5e);
  spawnShootingTarget(world, ctx, buckets, { x: 0, y: 1.4, z: -9.5 }, { hx: 0.35, hy: 0.55, hz: 0.15 }, 0xeab308);
  spawnShootingTarget(world, ctx, buckets, { x: 3, y: 1.4, z: -9.5 }, { hx: 0.35, hy: 0.55, hz: 0.15 }, 0x22c55e);
  spawnShootingTarget(world, ctx, buckets, { x: 9.5, y: 1.4, z: -2 }, { hx: 0.15, hy: 0.55, hz: 0.35 }, 0x3b82f6);
  spawnShootingTarget(world, ctx, buckets, { x: 9.5, y: 1.4, z: 2 }, { hx: 0.15, hy: 0.55, hz: 0.35 }, 0xa855f7);
  spawnShootingTarget(world, ctx, buckets, { x: -5, y: 1.5, z: 5 }, { hx: 0.4, hy: 0.6, hz: 0.4 }, 0xf97316);
  spawnShootingTarget(world, ctx, buckets, { x: 4, y: 1.2, z: 6 }, { hx: 0.35, hy: 0.45, hz: 0.35 }, 0x14b8a6);
}

export const DAMAGE_ZONE_FPS = {
  zone: {
    minX: 6.35,
    maxX: 9.15,
    minY: 0,
    maxY: 4,
    minZ: 6.35,
    maxZ: 9.15,
  },
  intervalSec: 0.35,
  amount: 2,
} as const;
