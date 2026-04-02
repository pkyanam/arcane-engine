import {
  animationSystem,
  disposeAssetCache,
  playAnimation,
  preloadSceneAssets,
  spawnModel,
  spawnModelInstances,
  type SceneAssetBundle,
  type SceneAssetManifest,
} from '@arcane-engine/assets';
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
import animatedBeaconModelUrl from '../src/assets/arcane-beacon.gltf?url';
import crystalModelUrl from '../src/assets/arcane-crystal.glb?url';
import floorTextureUrl from '../src/assets/gameplay-floor.svg';
import wallTextureUrl from '../src/assets/gameplay-wall.svg';
import { getGameContext } from '../src/runtime/gameContext.js';
import type { ScenePreloadContext } from '../src/runtime/scenePreload.js';
import { requestSceneChange } from '../src/runtime/sceneTransitions.js';

const PROP_LAYOUT = [
  { x: -10, y: 1.1, z: -8, rotationY: 0.2, scale: 1.15 },
  { x: -6, y: 1, z: 10, rotationY: -0.55, scale: 0.95 },
  { x: 10, y: 1.35, z: 6, rotationY: 0.65, scale: 1.35 },
] as const;
const BEACON_TRIGGER_DISTANCE = 6.5;
const GAMEPLAY_SCENE_ASSET_MANIFEST = {
  textures: {
    floor: {
      source: floorTextureUrl,
      options: {
        repeat: { x: 10, y: 10 },
        colorSpace: 'srgb',
      },
    },
    wall: {
      source: wallTextureUrl,
      options: {
        repeat: { x: 6, y: 2 },
        colorSpace: 'srgb',
      },
    },
  },
  models: {
    crystal: {
      source: crystalModelUrl,
    },
    beacon: {
      source: animatedBeaconModelUrl,
    },
  },
} satisfies SceneAssetManifest;

type GameplaySceneAssets = SceneAssetBundle<typeof GAMEPLAY_SCENE_ASSET_MANIFEST>;

let gameplaySceneAssets: GameplaySceneAssets | undefined;
let inputHandle: ReturnType<typeof createInputManager> | undefined;
let sceneObjects: THREE.Object3D[] = [];
let geometries: THREE.BufferGeometry[] = [];
let materials: THREE.Material[] = [];
let hud:
  | {
      root: HTMLDivElement;
      body: HTMLParagraphElement;
      status: HTMLParagraphElement;
    }
  | undefined;
let animatedBeaconEntity: number | undefined;
let animatedBeaconClip: 'Idle' | 'Activate' | undefined;

const GAMEPLAY_SCENE_ASSET_COUNT =
  Object.keys(GAMEPLAY_SCENE_ASSET_MANIFEST.textures).length +
  Object.keys(GAMEPLAY_SCENE_ASSET_MANIFEST.models).length;

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

  const position = getComponent(world, controlled[0]!, Position)!;
  hud.body.textContent =
    'This room preloads its assets before setup, textures the environment from a manifest, and spawns imported props from cached sources.';
  hud.status.textContent =
    `Beacon ${animatedBeaconClip === 'Activate' ? 'awake' : 'idle'} • ` +
    `Player x ${position.x.toFixed(1)}, z ${position.z.toFixed(1)}`;
};

const animatedBeaconSystem: SystemFn = (world: World): void => {
  if (animatedBeaconEntity === undefined) {
    return;
  }

  const controlled = query(world, [Controllable, Position]);
  if (!controlled.length) {
    return;
  }

  const playerPosition = getComponent(world, controlled[0]!, Position);
  const beaconPosition = getComponent(world, animatedBeaconEntity, Position);
  if (!playerPosition || !beaconPosition) {
    return;
  }

  const dx = playerPosition.x - beaconPosition.x;
  const dz = playerPosition.z - beaconPosition.z;
  const nextClip: 'Idle' | 'Activate' =
    Math.hypot(dx, dz) <= BEACON_TRIGGER_DISTANCE ? 'Activate' : 'Idle';

  if (nextClip === animatedBeaconClip) {
    return;
  }

  playAnimation(world, animatedBeaconEntity, nextClip, {
    fadeDuration: 0.22,
    loop: nextClip === 'Activate' ? 'ping-pong' : 'repeat',
  });
  animatedBeaconClip = nextClip;
};

function createHud(): {
  root: HTMLDivElement;
  body: HTMLParagraphElement;
  status: HTMLParagraphElement;
} {
  const root = document.createElement('div');
  root.style.position = 'fixed';
  root.style.top = '24px';
  root.style.left = '24px';
  root.style.width = 'min(440px, calc(100vw - 48px))';
  root.style.padding = '18px 20px';
  root.style.borderRadius = '24px';
  root.style.border = '1px solid rgba(94, 234, 212, 0.22)';
  root.style.background = 'rgba(15, 23, 42, 0.82)';
  root.style.boxShadow = '0 18px 48px rgba(2, 6, 23, 0.4)';
  root.style.backdropFilter = 'blur(14px)';
  root.style.fontFamily = '"Avenir Next", "Segoe UI", sans-serif';
  root.style.color = '#e2e8f0';
  root.style.pointerEvents = 'none';
  root.style.zIndex = '7';

  const eyebrow = document.createElement('p');
  eyebrow.textContent = 'Asset-Ready Demo';
  eyebrow.style.margin = '0 0 10px';
  eyebrow.style.fontSize = '12px';
  eyebrow.style.fontWeight = '700';
  eyebrow.style.letterSpacing = '0.24em';
  eyebrow.style.textTransform = 'uppercase';
  eyebrow.style.color = '#5eead4';

  const title = document.createElement('h2');
  title.textContent = 'Preload, Then Setup';
  title.style.margin = '0';
  title.style.fontSize = '28px';
  title.style.lineHeight = '1.08';

  const body = document.createElement('p');
  body.style.margin = '12px 0 0';
  body.style.fontSize = '14px';
  body.style.lineHeight = '1.6';
  body.style.color = '#cbd5e1';

  const status = document.createElement('p');
  status.style.margin = '10px 0 0';
  status.style.fontSize = '12px';
  status.style.letterSpacing = '0.05em';
  status.style.textTransform = 'uppercase';
  status.style.color = '#99f6e4';

  const footer = document.createElement('p');
  footer.textContent = 'Move with WASD or arrows. Walk near the center beacon to wake it up. Press Escape to return.';
  footer.style.margin = '12px 0 0';
  footer.style.fontSize = '13px';
  footer.style.lineHeight = '1.5';
  footer.style.color = '#cbd5e1';

  root.append(eyebrow, title, body, status, footer);
  return { root, body, status };
}

function getGameplaySceneAssets(): GameplaySceneAssets {
  if (!gameplaySceneAssets) {
    throw new Error(
      'gameplay.setup: scene assets were not preloaded. Load this scene with loadSceneWithPreload() first.',
    );
  }

  return gameplaySceneAssets;
}

function applyGameplayTextures(
  assets: GameplaySceneAssets,
  groundMaterial: THREE.MeshStandardMaterial,
  wallMaterial: THREE.MeshStandardMaterial,
): void {
  groundMaterial.color.set(0xffffff);
  groundMaterial.map = assets.textures.floor;
  groundMaterial.needsUpdate = true;

  wallMaterial.color.set(0xffffff);
  wallMaterial.map = assets.textures.wall;
  wallMaterial.needsUpdate = true;
}

function setRootShadows(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
}

export async function preload(preloadContext: ScenePreloadContext = {}): Promise<void> {
  if (gameplaySceneAssets) {
    preloadContext.reportProgress?.({
      loaded: GAMEPLAY_SCENE_ASSET_COUNT,
      total: GAMEPLAY_SCENE_ASSET_COUNT,
      label: 'Scene assets ready.',
    });
    return;
  }

  const { ctx } = getGameContext();
  gameplaySceneAssets = await preloadSceneAssets(ctx, GAMEPLAY_SCENE_ASSET_MANIFEST, {
    onProgress(progress) {
      preloadContext.reportProgress?.({
        loaded: progress.loaded,
        total: progress.total,
        label: progress.assetName
          ? `Loaded ${progress.assetKind} "${progress.assetName}".`
          : 'Preparing scene assets.',
      });
    },
  });
}

export function setup(world: World): void {
  const { ctx } = getGameContext();
  const assets = getGameplaySceneAssets();

  inputHandle = createInputManager(world);
  animatedBeaconEntity = undefined;
  animatedBeaconClip = undefined;

  const playerGeometry = new THREE.BoxGeometry(1, 1, 1);
  const playerMaterial = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    roughness: 0.4,
    metalness: 0.08,
  });
  const groundGeometry = new THREE.PlaneGeometry(34, 34);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.96,
    metalness: 0.02,
  });
  const wallGeometry = new THREE.BoxGeometry(34, 4.2, 0.8);
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0.04,
  });
  geometries = [playerGeometry, groundGeometry, wallGeometry];
  materials = [playerMaterial, groundMaterial, wallMaterial];
  applyGameplayTextures(assets, groundMaterial, wallMaterial);

  const playerEntity = spawnMesh(world, ctx, playerGeometry, playerMaterial, { x: 0, y: 0.5, z: 0 });
  addComponent(world, playerEntity, Controllable);
  const playerMesh = getComponent(world, playerEntity, MeshRef)?.mesh;
  if (playerMesh) {
    playerMesh.castShadow = true;
    playerMesh.receiveShadow = true;
  }

  const environmentLights = addEnvironmentLighting(ctx, {
    ambientIntensity: 0.3,
    hemisphereIntensity: 1.08,
    skyColor: 0xccfbf1,
    groundColor: 0x082f49,
  });
  const shadowRig = addDirectionalShadowLight(ctx, {
    intensity: 2.25,
    position: { x: 6, y: 8, z: 7 },
    shadowCameraExtent: 16,
    far: 44,
  });

  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.01;
  ground.receiveShadow = true;

  const walls = [
    new THREE.Mesh(wallGeometry, wallMaterial),
    new THREE.Mesh(wallGeometry, wallMaterial),
    new THREE.Mesh(wallGeometry, wallMaterial),
    new THREE.Mesh(wallGeometry, wallMaterial),
  ];
  walls[0].position.set(0, 2.1, -17);
  walls[1].position.set(0, 2.1, 17);
  walls[2].position.set(-17, 2.1, 0);
  walls[2].rotation.y = Math.PI / 2;
  walls[3].position.set(17, 2.1, 0);
  walls[3].rotation.y = Math.PI / 2;
  for (const wall of walls) {
    wall.castShadow = true;
    wall.receiveShadow = true;
  }

  sceneObjects = [...environmentLights, shadowRig.light, shadowRig.target, ground, ...walls];
  ctx.scene.add(ground);
  for (const wall of walls) {
    ctx.scene.add(wall);
  }

  const crystalEntities = spawnModelInstances(
    world,
    ctx,
    assets.models.crystal,
    PROP_LAYOUT.map((prop) => ({
      position: { x: prop.x, y: prop.y, z: prop.z },
      rotation: { y: prop.rotationY },
      scale: prop.scale,
    })),
  );
  for (const entity of crystalEntities) {
    const root = getComponent(world, entity, MeshRef)?.mesh;
    if (root) {
      setRootShadows(root);
    }
  }

  animatedBeaconEntity = spawnModel(world, ctx, assets.models.beacon, {
    position: { x: 0, y: 1.15, z: -5 },
    scale: 1.75,
  });
  const beaconRoot = getComponent(world, animatedBeaconEntity, MeshRef)?.mesh;
  if (beaconRoot) {
    setRootShadows(beaconRoot);
  }
  playAnimation(world, animatedBeaconEntity, 'Idle', { loop: 'repeat' });
  animatedBeaconClip = 'Idle';

  hud = createHud();
  document.body.appendChild(hud.root);

  registerSystem(world, movementSystem(5));
  registerSystem(world, gameplaySceneSystem);
  registerSystem(world, gameplayHudSystem);
  registerSystem(world, animatedBeaconSystem);
  registerSystem(world, cameraFollowSystem(ctx, { radius: 8 }));
  registerSystem(world, animationSystem());
  registerSystem(world, renderSystem(ctx));
}

export function teardown(world: World): void {
  const { ctx } = getGameContext();

  inputHandle?.dispose();
  inputHandle = undefined;

  hud?.root.remove();
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

  if (gameplaySceneAssets) {
    disposeAssetCache(gameplaySceneAssets.cache);
    gameplaySceneAssets = undefined;
  }

  animatedBeaconEntity = undefined;
  animatedBeaconClip = undefined;
}
