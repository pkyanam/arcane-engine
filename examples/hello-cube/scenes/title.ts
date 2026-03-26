import { addComponent, getComponent, query, registerSystem } from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';
import { createInputManager, InputState } from '@arcane-engine/input';
import { renderSystem, spawnMesh, MeshRef, Spin } from '@arcane-engine/renderer';
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
    if (input.keys.has('KeyP')) {
      requestSceneChange('physics');
    }
  }
};

function createOverlay(): HTMLDivElement {
  const element = document.createElement('div');
  element.innerHTML =
    '<div style="display:grid;gap:16px;justify-items:center;">' +
    '<p style="margin:0;font-size:12px;letter-spacing:0.45em;color:#7dd3fc;">HELLO CUBE DEMO</p>' +
    '<h1 style="margin:0;font-size:clamp(40px,9vw,84px);letter-spacing:0.12em;">Arcane Engine</h1>' +
    '<p style="margin:0;max-width:32rem;line-height:1.6;text-transform:none;letter-spacing:0.02em;">' +
    'Press Enter to Start and drop into a live ECS scene with a controllable player cube, floating ambience, and scene-driven transitions.' +
    '</p>' +
    '<div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;">' +
    '<p style="margin:0;padding:12px 18px;border-radius:999px;background:rgba(15, 23, 42, 0.72);border:1px solid rgba(125, 211, 252, 0.35);">' +
    'Enter — Gameplay</p>' +
    '<p style="margin:0;padding:12px 18px;border-radius:999px;background:rgba(15, 23, 42, 0.72);border:1px solid rgba(125, 211, 252, 0.35);">' +
    'P — Physics Demo</p>' +
    '</div>' +
    '</div>';
  element.style.position = 'fixed';
  element.style.inset = '0';
  element.style.display = 'grid';
  element.style.placeItems = 'center';
  element.style.textAlign = 'center';
  element.style.pointerEvents = 'none';
  element.style.padding = '32px';
  element.style.fontFamily = '"Avenir Next", "Segoe UI", sans-serif';
  element.style.color = '#e2e8f0';
  element.style.letterSpacing = '0.08em';
  element.style.textTransform = 'uppercase';
  element.style.background =
    'radial-gradient(circle at top, rgba(14, 165, 233, 0.18), rgba(15, 23, 42, 0.78) 60%)';
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

  const keyLight = new THREE.DirectionalLight(0xffffff, 2.6);
  keyLight.position.set(3, 5, 6);
  const fillLight = new THREE.HemisphereLight(0xe0f2fe, 0x020617, 1.4);
  const accentLight = new THREE.PointLight(0x22d3ee, 10, 30);
  accentLight.position.set(-3, 2, 3);

  sceneObjects = [keyLight, fillLight, accentLight];
  for (const object of sceneObjects) {
    ctx.scene.add(object);
  }

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
