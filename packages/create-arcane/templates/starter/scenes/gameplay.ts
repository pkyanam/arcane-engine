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
  addDirectionalShadowLight,
  addEnvironmentLighting,
  MeshRef,
  Position,
  renderSystem,
  spawnMesh,
} from '@arcane-engine/renderer';
import * as THREE from 'three';
import { getGameContext } from '../src/runtime/gameContext.js';
import { requestSceneChange } from '../src/runtime/sceneTransitions.js';

let inputHandle: ReturnType<typeof createInputManager> | undefined;
let mesh: THREE.Object3D | null = null;
let geometry: THREE.BufferGeometry | undefined;
let material: THREE.Material | undefined;
let ground: THREE.Mesh | null = null;
let groundGeometry: THREE.BufferGeometry | undefined;
let groundMaterial: THREE.Material | undefined;
let sceneObjects: THREE.Object3D[] = [];
let hud: HTMLDivElement | undefined;

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
  hud.textContent =
    `WASD or arrows to move. ` +
    `Position: x ${position.x.toFixed(1)}, z ${position.z.toFixed(1)}. ` +
    'Press Escape to return to the title scene.';
};

export function setup(world: World): void {
  const { ctx } = getGameContext();

  inputHandle = createInputManager(world);

  geometry = new THREE.BoxGeometry(1, 1, 1);
  material = new THREE.MeshStandardMaterial({ color: 0xf97316 });

  const cubeEntity = spawnMesh(world, ctx, geometry, material, { x: 0, y: 0.5, z: 0 });
  addComponent(world, cubeEntity, Controllable);
  mesh = getComponent(world, cubeEntity, MeshRef)?.mesh ?? null;
  if (mesh instanceof THREE.Mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }

  const environmentLights = addEnvironmentLighting(ctx, {
    ambientIntensity: 0.28,
    hemisphereIntensity: 1.05,
    skyColor: 0xe0f2fe,
    groundColor: 0x0f172a,
  });
  const shadowRig = addDirectionalShadowLight(ctx, {
    intensity: 2.2,
    position: { x: 5, y: 8, z: 6 },
    shadowCameraExtent: 14,
    far: 40,
  });
  const grid = new THREE.GridHelper(40, 40, 0x475569, 0x1e293b);
  grid.position.y = 0.01;

  groundGeometry = new THREE.PlaneGeometry(40, 40);
  groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.96,
    metalness: 0.02,
  });
  ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;

  sceneObjects = [...environmentLights, shadowRig.light, shadowRig.target, ground, grid];
  ctx.scene.add(ground);
  ctx.scene.add(grid);

  hud = document.createElement('div');
  hud.textContent = 'WASD or arrows to move. Press Escape to return to the title scene.';
  hud.style.position = 'fixed';
  hud.style.left = '24px';
  hud.style.bottom = '24px';
  hud.style.padding = '12px 16px';
  hud.style.fontFamily = '"Avenir Next", "Segoe UI", sans-serif';
  hud.style.background = 'rgba(15, 23, 42, 0.72)';
  hud.style.color = '#e2e8f0';
  hud.style.border = '1px solid rgba(148, 163, 184, 0.35)';
  hud.style.borderRadius = '999px';
  hud.style.backdropFilter = 'blur(10px)';
  document.body.appendChild(hud);

  registerSystem(world, movementSystem(5));
  registerSystem(world, gameplaySceneSystem);
  registerSystem(world, gameplayHudSystem);
  registerSystem(world, cameraFollowSystem(ctx, { radius: 8 }));
  registerSystem(world, renderSystem(ctx));
}

export function teardown(_world: World): void {
  const { ctx } = getGameContext();

  inputHandle?.dispose();
  inputHandle = undefined;

  hud?.remove();
  hud = undefined;

  if (mesh) {
    ctx.scene.remove(mesh);
    mesh = null;
  }

  geometry?.dispose();
  geometry = undefined;

  material?.dispose();
  material = undefined;

  groundGeometry?.dispose();
  groundGeometry = undefined;

  groundMaterial?.dispose();
  groundMaterial = undefined;

  ground = null;

  for (const object of sceneObjects) {
    ctx.scene.remove(object);
  }
  sceneObjects = [];
}
