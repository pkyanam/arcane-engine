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
import { spinSystem } from '../src/spinSystem.js';
import { getGameContext } from '../src/runtime/gameContext.js';
import { requestSceneChange } from '../src/runtime/sceneTransitions.js';

let overlay: HTMLDivElement | undefined;
let inputHandle: ReturnType<typeof createInputManager> | undefined;
let sceneObjects: THREE.Object3D[] = [];
let geometries: THREE.BufferGeometry[] = [];
let materials: THREE.Material[] = [];

const titleInputSystem: SystemFn = (world: World): void => {
  for (const entity of query(world, [InputState])) {
    const input = getComponent(world, entity, InputState)!;

    if (input.keys.has('Enter')) {
      requestSceneChange('gameplay');
    }
  }
};

function createOverlay(): HTMLDivElement {
  const element = document.createElement('div');
  element.style.position = 'fixed';
  element.style.inset = '0';
  element.style.display = 'grid';
  element.style.placeItems = 'center';
  element.style.padding = '24px';
  element.style.pointerEvents = 'none';
  element.style.background =
    'radial-gradient(circle at top, rgba(45, 212, 191, 0.18), transparent 28%), rgba(2, 6, 23, 0.38)';

  const panel = document.createElement('div');
  panel.style.width = 'min(560px, calc(100vw - 48px))';
  panel.style.padding = '24px 26px';
  panel.style.borderRadius = '28px';
  panel.style.border = '1px solid rgba(94, 234, 212, 0.22)';
  panel.style.background = 'rgba(15, 23, 42, 0.84)';
  panel.style.boxShadow = '0 24px 64px rgba(2, 6, 23, 0.44)';
  panel.style.backdropFilter = 'blur(16px)';
  panel.style.fontFamily = '"Avenir Next", "Segoe UI", sans-serif';
  panel.style.color = '#e2e8f0';

  const eyebrow = document.createElement('p');
  eyebrow.textContent = 'Arcane Engine Asset-Ready';
  eyebrow.style.margin = '0 0 10px';
  eyebrow.style.fontSize = '12px';
  eyebrow.style.fontWeight = '700';
  eyebrow.style.letterSpacing = '0.24em';
  eyebrow.style.textTransform = 'uppercase';
  eyebrow.style.color = '#5eead4';

  const title = document.createElement('h1');
  title.textContent = 'Texture, Model, and Preload Walkthrough';
  title.style.margin = '0';
  title.style.fontSize = '34px';
  title.style.lineHeight = '1.04';

  const body = document.createElement('p');
  body.textContent =
    'This template starts from the Stage 15-19 path instead of a plain cube room. The next scene preloads assets first, textures the environment, places imported props, and plays an animated beacon clip.';
  body.style.margin = '14px 0 0';
  body.style.fontSize = '15px';
  body.style.lineHeight = '1.7';
  body.style.color = '#cbd5e1';

  const footer = document.createElement('p');
  footer.textContent = 'Press Enter to open the demo room. Press Escape there to come back here.';
  footer.style.margin = '14px 0 0';
  footer.style.fontSize = '13px';
  footer.style.letterSpacing = '0.04em';
  footer.style.color = '#99f6e4';

  panel.append(eyebrow, title, body, footer);
  element.appendChild(panel);
  return element;
}

export function setup(world: World): void {
  const { ctx } = getGameContext();

  inputHandle = createInputManager(world);

  const geometry = new THREE.BoxGeometry(1.4, 1.4, 1.4);
  const material = new THREE.MeshStandardMaterial({
    color: 0x2dd4bf,
    emissive: 0x0f766e,
    emissiveIntensity: 0.22,
    roughness: 0.3,
  });
  geometries = [geometry];
  materials = [material];

  const entity = spawnMesh(world, ctx, geometry, material, { x: 0, y: 0, z: 0 });
  addComponent(world, entity, Spin, { axis: 'y', speed: 1.15 });
  const mesh = getComponent(world, entity, MeshRef)?.mesh;
  if (mesh) {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }

  const environmentLights = addEnvironmentLighting(ctx, {
    ambientIntensity: 0.24,
    hemisphereIntensity: 1.08,
    skyColor: 0xccfbf1,
    groundColor: 0x04131c,
  });
  const shadowRig = addDirectionalShadowLight(ctx, {
    intensity: 2.7,
    position: { x: 3.5, y: 5, z: 6.5 },
    shadowCameraExtent: 8,
  });
  const accentLight = new THREE.PointLight(0x2dd4bf, 12, 24);
  accentLight.position.set(-2.6, 2.2, 2.8);

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
