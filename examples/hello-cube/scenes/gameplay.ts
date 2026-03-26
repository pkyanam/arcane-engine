import { addComponent, getComponent, query, registerSystem } from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';
import {
  cameraFollowSystem,
  Controllable,
  createInputManager,
  InputState,
  movementSystem,
} from '@arcane-engine/input';
import {
  MeshRef,
  Position,
  Scale,
  Spin,
  renderSystem,
  spawnMesh,
} from '@arcane-engine/renderer';
import * as THREE from 'three';
import { FloatingMotion, floatingMotionSystem } from '../src/floatingMotion.js';
import { getGameContext } from '../src/runtime/gameContext.js';
import { requestSceneChange } from '../src/runtime/sceneTransitions.js';
import { spinSystem } from '../src/spinSystem.js';

let inputHandle: ReturnType<typeof createInputManager> | undefined;
let sceneObjects: THREE.Object3D[] = [];
let hud: HTMLDivElement | undefined;
let geometries: THREE.BufferGeometry[] = [];
let materials: THREE.Material[] = [];

const FLOATING_CUBE_COUNT = 20;
const FLOATING_AXIS_OPTIONS: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'];
const FLOATING_COLORS = [
  0x38bdf8,
  0x818cf8,
  0x22d3ee,
  0x2dd4bf,
  0xf59e0b,
];

const gameplaySceneSystem: SystemFn = (world: World): void => {
  for (const entity of query(world, [InputState])) {
    const input = getComponent(world, entity, InputState)!;

    if (input.keys.has('Escape')) {
      requestSceneChange('title');
    }
  }
};

const gameplayHudSystem: SystemFn = (world: World): void => {
  if (!hud) {
    return;
  }

  const controlled = query(world, [Controllable, Position]);
  if (!controlled.length) {
    return;
  }

  const position = getComponent(world, controlled[0], Position)!;
  hud.innerHTML =
    '<strong>Gameplay Demo</strong>' +
    `<span>Move with WASD or arrows. ` +
    `Player x ${position.x.toFixed(1)}, z ${position.z.toFixed(1)}. ` +
    'Press Escape to return to the title scene.</span>';
};

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomAxis(): 'x' | 'y' | 'z' {
  return FLOATING_AXIS_OPTIONS[Math.floor(Math.random() * FLOATING_AXIS_OPTIONS.length)]!;
}

function createHud(): HTMLDivElement {
  const element = document.createElement('div');
  element.style.position = 'fixed';
  element.style.left = '24px';
  element.style.bottom = '24px';
  element.style.display = 'grid';
  element.style.gap = '6px';
  element.style.padding = '14px 18px';
  element.style.maxWidth = 'min(520px, calc(100vw - 48px))';
  element.style.fontFamily = '"Avenir Next", "Segoe UI", sans-serif';
  element.style.background =
    'linear-gradient(140deg, rgba(15, 23, 42, 0.84), rgba(15, 118, 110, 0.32))';
  element.style.color = '#e2e8f0';
  element.style.border = '1px solid rgba(125, 211, 252, 0.28)';
  element.style.borderRadius = '20px';
  element.style.boxShadow = '0 18px 42px rgba(15, 23, 42, 0.34)';
  element.style.backdropFilter = 'blur(12px)';
  return element;
}

export function setup(world: World): void {
  const { ctx } = getGameContext();

  inputHandle = createInputManager(world);

  const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
  const playerMaterial = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0x7c2d12,
    emissiveIntensity: 0.2,
    roughness: 0.42,
  });
  geometries.push(playerGeometry);
  materials.push(playerMaterial);

  const cubeEntity = spawnMesh(world, ctx, playerGeometry, playerMaterial, { x: 0, y: 0.55, z: 0 });
  addComponent(world, cubeEntity, Controllable);

  const floatingGeometry = new THREE.BoxGeometry(0.85, 0.85, 0.85);
  geometries.push(floatingGeometry);

  for (let index = 0; index < FLOATING_CUBE_COUNT; index += 1) {
    const startX = randomRange(-12, 12);
    const startY = randomRange(1.4, 4.8);
    const startZ = randomRange(-12, 12);
    const material = new THREE.MeshStandardMaterial({
      color: FLOATING_COLORS[index % FLOATING_COLORS.length],
      emissive: 0x082f49,
      emissiveIntensity: 0.18,
      metalness: 0.08,
      roughness: 0.32,
    });
    materials.push(material);

    const entity = spawnMesh(world, ctx, floatingGeometry, material, {
      x: startX,
      y: startY,
      z: startZ,
    });
    const scale = randomRange(0.65, 1.35);
    addComponent(world, entity, Scale, { x: scale, y: scale, z: scale });
    addComponent(world, entity, Spin, {
      axis: randomAxis(),
      speed: randomRange(0.35, 1.2),
    });
    addComponent(world, entity, FloatingMotion, {
      velocity: {
        x: randomRange(-1.8, 1.8),
        y: randomRange(-0.75, 0.75),
        z: randomRange(-1.8, 1.8),
      },
      bounds: {
        minX: startX - randomRange(1.8, 4.6),
        maxX: startX + randomRange(1.8, 4.6),
        minY: Math.max(1.1, startY - randomRange(0.6, 1.5)),
        maxY: startY + randomRange(0.6, 1.5),
        minZ: startZ - randomRange(1.8, 4.6),
        maxZ: startZ + randomRange(1.8, 4.6),
      },
    });
  }

  const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 1.8);
  const keyLight = new THREE.DirectionalLight(0xfef3c7, 2.8);
  keyLight.position.set(8, 14, 10);
  const rimLight = new THREE.PointLight(0x22d3ee, 18, 80);
  rimLight.position.set(-12, 7, -10);
  const grid = new THREE.GridHelper(48, 48, 0x334155, 0x1e293b);
  grid.position.y = 0.01;

  const groundGeometry = new THREE.PlaneGeometry(60, 60);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.96,
    metalness: 0.02,
  });
  geometries.push(groundGeometry);
  materials.push(groundMaterial);

  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;

  sceneObjects = [hemiLight, keyLight, rimLight, ground, grid];
  for (const object of sceneObjects) {
    ctx.scene.add(object);
  }

  hud = createHud();
  document.body.appendChild(hud);
  gameplayHudSystem(world, 0);

  registerSystem(world, movementSystem(6));
  registerSystem(world, gameplaySceneSystem);
  registerSystem(world, floatingMotionSystem);
  registerSystem(world, spinSystem);
  registerSystem(world, gameplayHudSystem);
  registerSystem(world, cameraFollowSystem(ctx, { radius: 9, initialPitch: 0.42 }));
  registerSystem(world, renderSystem(ctx));
}

export function teardown(world: World): void {
  const { ctx } = getGameContext();

  inputHandle?.dispose();
  inputHandle = undefined;

  hud?.remove();
  hud = undefined;

  for (const entity of query(world, [MeshRef])) {
    const mesh = getComponent(world, entity, MeshRef)?.mesh;
    if (mesh) {
      ctx.scene.remove(mesh);
    }
  }

  for (const geometry of geometries) {
    geometry.dispose();
  }
  geometries = [];

  for (const material of materials) {
    material.dispose();
  }
  materials = [];

  for (const object of sceneObjects) {
    ctx.scene.remove(object);
  }
  sceneObjects = [];
}
