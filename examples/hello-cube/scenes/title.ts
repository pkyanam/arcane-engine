import { addComponent, getComponent, query, registerSystem } from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';
import { createInputManager, InputState } from '@arcane-engine/input';
import {
  addDirectionalShadowLight,
  addEnvironmentLighting,
  MeshRef,
  renderSystem,
  Spin,
  spawnMesh,
} from '@arcane-engine/renderer';
import * as THREE from 'three';
import {
  createHelloCubePanel,
  ensureHelloCubeUiStyles,
  listHelloCubeRouteEntries,
} from '../src/helloCubePresentation.js';
import { spinSystem } from '../src/spinSystem.js';
import { getGameContext } from '../src/runtime/gameContext.js';
import { requestSceneChange } from '../src/runtime/sceneTransitions.js';

let overlay: HTMLDivElement | undefined;
let inputHandle: ReturnType<typeof createInputManager> | undefined;
let sceneObjects: THREE.Object3D[] = [];
let geometries: THREE.BufferGeometry[] = [];
let materials: THREE.Material[] = [];
const TITLE_ROUTE_ENTRIES = listHelloCubeRouteEntries();

const titleInputSystem: SystemFn = (world: World): void => {
  for (const entity of query(world, [InputState])) {
    const input = getComponent(world, entity, InputState)!;

    for (const entry of TITLE_ROUTE_ENTRIES) {
      if (entry.hotkeyCodes.some((code) => input.keys.has(code))) {
        requestSceneChange(entry.sceneName);
        return;
      }
    }
  }
};

function createSceneRouteButton(entry: (typeof TITLE_ROUTE_ENTRIES)[number]): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'arcane-ui-scene-button';
  const queueSceneChange = (): void => {
    requestSceneChange(entry.sceneName);
  };

  const topline = document.createElement('div');
  topline.className = 'arcane-ui-scene-button__topline';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'arcane-ui-scene-button__eyebrow';
  eyebrow.textContent = entry.eyebrow;

  const key = document.createElement('span');
  key.className = 'arcane-ui-scene-button__key';
  key.textContent = entry.hotkeyLabel;

  topline.append(eyebrow, key);

  const title = document.createElement('h3');
  title.className = 'arcane-ui-scene-button__title';
  title.textContent = entry.displayName;

  const summary = document.createElement('p');
  summary.className = 'arcane-ui-scene-button__summary';
  summary.textContent = entry.summary;

  const badges = document.createElement('div');
  badges.className = 'arcane-ui-badges';

  if (entry.recommended) {
    const recommendedBadge = document.createElement('span');
    recommendedBadge.className = 'arcane-ui-badge';
    recommendedBadge.dataset.emphasis = 'true';
    recommendedBadge.textContent = 'Recommended First';
    badges.appendChild(recommendedBadge);
  }

  for (const label of entry.badges.slice(0, 2)) {
    const badge = document.createElement('span');
    badge.className = 'arcane-ui-badge';
    badge.textContent = label;
    badges.appendChild(badge);
  }

  button.append(topline, title, summary, badges);
  button.addEventListener('click', queueSceneChange);
  button.addEventListener('pointerup', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    queueSceneChange();
  });
  return button;
}

function createOverlay(): HTMLDivElement {
  ensureHelloCubeUiStyles();

  const element = document.createElement('div');
  element.className = 'arcane-ui-overlay';
  element.style.pointerEvents = 'auto';
  element.style.zIndex = '12';

  const stack = document.createElement('div');
  stack.className = 'arcane-ui-overlay__stack';

  const hero = createHelloCubePanel({
    eyebrow: 'Hello Cube Vertical Slice',
    title: 'Arcane Engine Command Deck',
    titleLevel: 1,
    body:
      'Start with the Sanctum Walkthrough, then move into the FPS range and the relay arena. Every route uses the same ECS, renderer, scene flow, and asset foundations without hiding the code.',
    footer:
      'Keyboard: Enter, P, F, M. Click a route card to jump in. Touch devices get the same route picker with larger buttons.',
    badges: ['Built In Public', 'Scene Preload', 'FPS + Multiplayer'],
  });
  hero.root.style.width = 'min(1080px, 100%)';

  const routeGrid = document.createElement('div');
  routeGrid.className = 'arcane-ui-scene-grid';
  for (const entry of TITLE_ROUTE_ENTRIES) {
    routeGrid.appendChild(createSceneRouteButton(entry));
  }

  stack.append(hero.root, routeGrid);
  element.appendChild(stack);
  return element;
}

export function setup(world: World): void {
  const { ctx } = getGameContext();

  inputHandle = createInputManager(world);

  const geometry = new THREE.BoxGeometry(1.4, 1.4, 1.4);
  const material = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x082f49,
    emissiveIntensity: 0.25,
    roughness: 0.28,
  });
  geometries = [geometry];
  materials = [material];

  const entity = spawnMesh(world, ctx, geometry, material, { x: 0, y: 0, z: 0 });
  addComponent(world, entity, Spin, { axis: 'y', speed: 1.2 });
  const mesh = getComponent(world, entity, MeshRef)?.mesh;
  if (mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }

  const environmentLights = addEnvironmentLighting(ctx, {
    ambientIntensity: 0.25,
    hemisphereIntensity: 1.1,
    skyColor: 0xe0f2fe,
    groundColor: 0x020617,
  });
  const shadowRig = addDirectionalShadowLight(ctx, {
    intensity: 2.6,
    position: { x: 3, y: 5, z: 6 },
    shadowCameraExtent: 8,
  });
  const accentLight = new THREE.PointLight(0x22d3ee, 10, 30);
  accentLight.position.set(-3, 2, 3);

  sceneObjects = [...environmentLights, shadowRig.light, shadowRig.target, accentLight];
  ctx.scene.add(accentLight);

  ctx.camera.position.set(0, 0.5, 5);
  ctx.camera.lookAt(0, 0, 0);

  overlay = createOverlay();
  document.body.appendChild(overlay);

  registerSystem(world, spinSystem);
  registerSystem(world, titleInputSystem);
  registerSystem(world, renderSystem(ctx));
}

export function teardown(world: World): void {
  const { ctx } = getGameContext();

  inputHandle?.dispose();
  inputHandle = undefined;

  overlay?.remove();
  overlay = undefined;

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
