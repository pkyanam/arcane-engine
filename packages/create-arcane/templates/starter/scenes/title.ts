import { query, getComponent, registerSystem, addComponent } from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';
import { createInputManager, InputState } from '@arcane-engine/input';
import {
  addDirectionalShadowLight,
  addEnvironmentLighting,
  renderSystem,
  spawnMesh,
  MeshRef,
  Spin,
} from '@arcane-engine/renderer';
import * as THREE from 'three';
import { spinSystem } from '../src/spinSystem.js';
import { getGameContext } from '../src/runtime/gameContext.js';
import { requestSceneChange } from '../src/runtime/sceneTransitions.js';

let overlay: HTMLDivElement | undefined;
let inputHandle: ReturnType<typeof createInputManager> | undefined;
let mesh: THREE.Object3D | null = null;
let geometry: THREE.BufferGeometry | undefined;
let material: THREE.Material | undefined;
let sceneObjects: THREE.Object3D[] = [];

const titleInputSystem: SystemFn = (world: World): void => {
  for (const entity of query(world, [InputState])) {
    const input = getComponent(world, entity, InputState)!;

    if (input.keys.has('Enter')) {
      requestSceneChange('gameplay');
    }
  }
};

export function setup(world: World): void {
  const { ctx } = getGameContext();

  inputHandle = createInputManager(world);

  geometry = new THREE.BoxGeometry(1.4, 1.4, 1.4);
  material = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });

  const entity = spawnMesh(world, ctx, geometry, material, { x: 0, y: 0, z: 0 });
  addComponent(world, entity, Spin, { axis: 'y', speed: 1.2 });
  mesh = getComponent(world, entity, MeshRef)?.mesh ?? null;
  if (mesh instanceof THREE.Mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }

  const environmentLights = addEnvironmentLighting(ctx, {
    ambientIntensity: 0.22,
    hemisphereIntensity: 1,
    skyColor: 0xe0f2fe,
    groundColor: 0x020617,
  });
  const shadowRig = addDirectionalShadowLight(ctx, {
    intensity: 2.5,
    position: { x: 3, y: 4, z: 5 },
    shadowCameraExtent: 8,
  });
  sceneObjects = [...environmentLights, shadowRig.light, shadowRig.target];

  ctx.camera.position.set(0, 0.5, 5);
  ctx.camera.lookAt(0, 0, 0);

  overlay = document.createElement('div');
  overlay.innerHTML = '<h1>Arcane Engine</h1><p>Press Enter to start the scene demo.</p>';
  overlay.style.position = 'fixed';
  overlay.style.inset = '0';
  overlay.style.display = 'grid';
  overlay.style.placeItems = 'center';
  overlay.style.textAlign = 'center';
  overlay.style.pointerEvents = 'none';
  overlay.style.fontFamily = '"Avenir Next", "Segoe UI", sans-serif';
  overlay.style.color = '#e2e8f0';
  overlay.style.letterSpacing = '0.08em';
  overlay.style.textTransform = 'uppercase';
  overlay.style.background = 'radial-gradient(circle at top, rgba(15, 23, 42, 0.25), rgba(15, 23, 42, 0.65))';
  document.body.appendChild(overlay);

  registerSystem(world, spinSystem);
  registerSystem(world, titleInputSystem);
  registerSystem(world, renderSystem(ctx));
}

export function teardown(_world: World): void {
  const { ctx } = getGameContext();

  inputHandle?.dispose();
  inputHandle = undefined;

  overlay?.remove();
  overlay = undefined;

  if (mesh) {
    ctx.scene.remove(mesh);
    mesh = null;
  }

  geometry?.dispose();
  geometry = undefined;

  material?.dispose();
  material = undefined;

  for (const object of sceneObjects) {
    ctx.scene.remove(object);
  }
  sceneObjects = [];
}
