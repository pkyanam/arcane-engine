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
import { Health } from '../src/components/health.js';
import { GameState } from '../src/components/gameState.js';
import { ShootableTarget } from '../src/components/shootableTarget.js';
import { damageZoneSystem } from '../src/damageZoneSystem.js';
import { gameStateSystem, type FpsHudHandles } from '../src/gameStateSystem.js';
import { getGameContext } from '../src/runtime/gameContext.js';
import { requestSceneChange } from '../src/runtime/sceneTransitions.js';
import { healthSystem } from '../src/healthSystem.js';
import { hitFlashRestoreSystem } from '../src/hitFlashRestoreSystem.js';
import { weaponSystem } from '../src/weaponSystem.js';

let physicsCtx: PhysicsContext | undefined;
let inputHandle: ReturnType<typeof createInputManager> | undefined;
let sceneObjects: THREE.Object3D[] = [];
let geometries: THREE.BufferGeometry[] = [];
let materials: THREE.Material[] = [];
const PLAYER_SPAWN = { x: 0, y: 2, z: 0 };
const PLAYER_MOVE_SPEED = 5;
const PLAYER_JUMP_SPEED = 6;

let hudRoot: HTMLDivElement | undefined;
let muzzleLayer: HTMLDivElement | undefined;
let muzzleTimeout: ReturnType<typeof setTimeout> | undefined;
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

/** Floor top in this scene (main slab: center y=0, half height 0.25). */
const FLOOR_TOP_Y = 0.25;

/**
 * Emissive pad flush on the floor — no physics (damage uses AABB in `damageZoneSystem` only).
 */
function spawnHazardFloorPad(
  world: World,
  centerXZ: { x: number; z: number },
  halfXZ: { hx: number; hz: number },
  thickness: number,
): void {
  const { ctx } = getGameContext();
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
  geometries.push(geo);
  materials.push(mat);

  const entity = spawnMesh(world, ctx, geo, mat, center);
  addComponent(world, entity, Rotation);
}

function spawnShootingTarget(
  world: World,
  center: { x: number; y: number; z: number },
  half: { hx: number; hy: number; hz: number },
  color: number,
): void {
  const { ctx } = getGameContext();
  const geo = new THREE.BoxGeometry(half.hx * 2, half.hy * 2, half.hz * 2);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.55,
    metalness: 0.12,
  });
  geometries.push(geo);
  materials.push(mat);

  const entity = spawnMesh(world, ctx, geo, mat, center);
  addComponent(world, entity, Rotation);
  addComponent(world, entity, RigidBody, { type: 'fixed' });
  addComponent(world, entity, BoxCollider, { ...half, friction: 0.75 });
  addComponent(world, entity, Health, { current: 3, max: 3 });
  addComponent(world, entity, ShootableTarget);
}

function triggerMuzzleFlash(): void {
  if (!muzzleLayer) return;
  if (muzzleTimeout !== undefined) {
    clearTimeout(muzzleTimeout);
    muzzleTimeout = undefined;
  }
  muzzleLayer.style.opacity = '0.28';
  muzzleTimeout = setTimeout(() => {
    muzzleLayer!.style.opacity = '0';
    muzzleTimeout = undefined;
  }, 80);
}

function createMuzzleLayer(): HTMLDivElement {
  const el = document.createElement('div');
  el.style.position = 'fixed';
  el.style.inset = '0';
  el.style.pointerEvents = 'none';
  el.style.background = '#ffffff';
  el.style.opacity = '0';
  el.style.transition = 'opacity 45ms ease-out';
  el.style.zIndex = '6';
  return el;
}

function createArcaneHud(): { root: HTMLDivElement; handles: FpsHudHandles } {
  const root = document.createElement('div');
  root.id = 'arcane-hud';
  root.style.cssText =
    'position:fixed;inset:0;pointer-events:none;z-index:5;font-family:"Avenir Next","Segoe UI",system-ui,sans-serif;';

  const cross = document.createElement('div');
  cross.id = 'arcane-crosshair';
  cross.style.cssText =
    'position:absolute;left:50%;top:50%;width:16px;height:16px;transform:translate(-50%,-50%);';
  const chV = document.createElement('div');
  chV.style.cssText =
    'position:absolute;left:50%;top:0;bottom:0;width:2px;margin-left:-1px;background:rgba(255,255,255,0.9);box-shadow:0 0 1px rgba(0,0,0,0.5);';
  const chH = document.createElement('div');
  chH.style.cssText =
    'position:absolute;top:50%;left:0;right:0;height:2px;margin-top:-1px;background:rgba(255,255,255,0.9);box-shadow:0 0 1px rgba(0,0,0,0.5);';
  cross.append(chV, chH);

  const killsLabel = document.createElement('div');
  killsLabel.id = 'arcane-kills';
  killsLabel.style.cssText =
    'position:absolute;top:16px;right:20px;color:#e2e8f0;font-size:15px;font-weight:600;';
  killsLabel.textContent = '0';

  const healthWrap = document.createElement('div');
  healthWrap.style.cssText = 'position:absolute;left:20px;bottom:52px;width:200px;';
  const healthBarOuter = document.createElement('div');
  healthBarOuter.style.cssText =
    'height:12px;background:rgba(15,23,42,0.8);border-radius:8px;overflow:hidden;border:1px solid rgba(148,163,184,0.4);';
  const healthFill = document.createElement('div');
  healthFill.style.cssText =
    'height:100%;width:100%;background:linear-gradient(90deg,#16a34a,#4ade80);transform-origin:left center;transform:scaleX(1);transition:transform 80ms ease-out;';
  healthBarOuter.appendChild(healthFill);
  const healthLabel = document.createElement('div');
  healthLabel.style.cssText = 'margin-top:8px;color:#cbd5e1;font-size:12px;letter-spacing:0.04em;';
  healthLabel.textContent = '—';
  healthWrap.append(healthBarOuter, healthLabel);

  const overlay = document.createElement('div');
  overlay.id = 'arcane-game-overlay';
  overlay.style.cssText =
    'display:none;position:absolute;inset:0;align-items:center;justify-content:center;background:rgba(15,23,42,0.72);color:#f8fafc;font-size:clamp(18px,4vw,26px);font-weight:600;text-align:center;padding:32px;line-height:1.35;';

  const hint = document.createElement('div');
  hint.style.cssText =
    'position:absolute;left:50%;bottom:18px;transform:translateX(-50%);max-width:min(560px,92vw);text-align:center;color:rgba(226,232,240,0.78);font-size:11px;line-height:1.45;';
  hint.textContent =
    'Click canvas to capture mouse — WASD move, Space jump, shoot targets (3 hits each). Glowing red floor pad in the +X,+Z corner hurts. R respawn when dead. Esc → title.';

  root.append(cross, killsLabel, healthWrap, overlay, hint);

  return {
    root,
    handles: { healthFill, healthLabel, killsLabel, overlay },
  };
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

  // Damage test zone: visible pad on the floor (AABB only in damageZoneSystem — no extra collider)
  spawnHazardFloorPad(world, { x: 7.75, z: 7.75 }, { hx: 1.35, hz: 1.35 }, 0.06);

  // Shootable targets (3 hp each)
  spawnShootingTarget(world, { x: -3, y: 1.4, z: -9.5 }, { hx: 0.35, hy: 0.55, hz: 0.15 }, 0xf43f5e);
  spawnShootingTarget(world, { x: 0, y: 1.4, z: -9.5 }, { hx: 0.35, hy: 0.55, hz: 0.15 }, 0xeab308);
  spawnShootingTarget(world, { x: 3, y: 1.4, z: -9.5 }, { hx: 0.35, hy: 0.55, hz: 0.15 }, 0x22c55e);
  spawnShootingTarget(world, { x: 9.5, y: 1.4, z: -2 }, { hx: 0.15, hy: 0.55, hz: 0.35 }, 0x3b82f6);
  spawnShootingTarget(world, { x: 9.5, y: 1.4, z: 2 }, { hx: 0.15, hy: 0.55, hz: 0.35 }, 0xa855f7);
  spawnShootingTarget(world, { x: -5, y: 1.5, z: 5 }, { hx: 0.4, hy: 0.6, hz: 0.4 }, 0xf97316);
  spawnShootingTarget(world, { x: 4, y: 1.2, z: 6 }, { hx: 0.35, hy: 0.45, hz: 0.35 }, 0x14b8a6);

  const player = createEntity(world);
  addComponent(world, player, Position, { ...PLAYER_SPAWN });
  addComponent(world, player, RigidBody, { type: 'kinematic' });
  addComponent(world, player, BoxCollider, { hx: 0.4, hy: 0.9, hz: 0.4 });
  addComponent(world, player, FPSCamera, { yaw: 0, pitch: 0, height: 1.7 });
  addComponent(world, player, CharacterController, {
    speed: PLAYER_MOVE_SPEED,
    jumpSpeed: PLAYER_JUMP_SPEED,
    grounded: false,
    _velocityY: 0,
  });
  addComponent(world, player, Controllable);
  addComponent(world, player, Health, { current: 10, max: 10 });

  const gameStateEntity = createEntity(world);
  addComponent(world, gameStateEntity, GameState, {
    kills: 0,
    playerHp: 10,
    phase: 'playing',
  });

  ctx.camera.position.set(0, 3.7, 0);
  ctx.camera.rotation.set(0, 0, 0, 'YXZ');

  escListener = (e: KeyboardEvent) => {
    if (e.code === 'Escape') {
      requestSceneChange('title');
    }
  };
  window.addEventListener('keydown', escListener);

  const hud = createArcaneHud();
  hudRoot = hud.root;
  document.body.appendChild(hudRoot);

  muzzleLayer = createMuzzleLayer();
  document.body.appendChild(muzzleLayer);

  registerSystem(world, hitFlashRestoreSystem());
  registerSystem(world, physicsSystem(physicsCtx));
  registerSystem(world, characterControllerSystem(physicsCtx));
  registerSystem(world, fpsCameraSystem(ctx));
  registerSystem(
    world,
    weaponSystem(physicsCtx, {
      onFire: triggerMuzzleFlash,
    }),
  );
  registerSystem(
    world,
    damageZoneSystem({
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
    }),
  );
  registerSystem(world, healthSystem(physicsCtx, ctx));
  registerSystem(
    world,
    gameStateSystem(physicsCtx, hud.handles, {
      spawn: PLAYER_SPAWN,
      moveSpeed: PLAYER_MOVE_SPEED,
      jumpSpeed: PLAYER_JUMP_SPEED,
    }),
  );
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

  hudRoot?.remove();
  hudRoot = undefined;

  if (muzzleTimeout !== undefined) {
    clearTimeout(muzzleTimeout);
    muzzleTimeout = undefined;
  }
  muzzleLayer?.remove();
  muzzleLayer = undefined;

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
