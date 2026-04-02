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
  Scale,
  Spin,
  renderSystem,
  spawnMesh,
} from '@arcane-engine/renderer';
import * as THREE from 'three';
import animatedBeaconModelUrl from '../src/assets/arcane-beacon.gltf?url';
import floorTextureUrl from '../src/assets/gameplay-floor.svg';
import wallTextureUrl from '../src/assets/gameplay-wall.svg';
import crystalModelUrl from '../src/assets/arcane-crystal.glb?url';
import { FloatingMotion, floatingMotionSystem } from '../src/floatingMotion.js';
import { createHelloCubePanel, getHelloCubeSceneCopy } from '../src/helloCubePresentation.js';
import { getGameContext } from '../src/runtime/gameContext.js';
import type { ScenePreloadContext } from '../src/runtime/scenePreload.js';
import { requestSceneChange } from '../src/runtime/sceneTransitions.js';
import { spinSystem } from '../src/spinSystem.js';

let inputHandle: ReturnType<typeof createInputManager> | undefined;
let sceneObjects: THREE.Object3D[] = [];
let hud:
  | {
      root: HTMLDivElement;
      body: HTMLParagraphElement;
      status: HTMLParagraphElement;
      footer?: HTMLParagraphElement;
    }
  | undefined;
let geometries: THREE.BufferGeometry[] = [];
let materials: THREE.Material[] = [];
let animatedBeaconEntity: number | undefined;
let animatedBeaconClip: 'Idle' | 'Activate' | undefined;
const GAMEPLAY_COPY = getHelloCubeSceneCopy('gameplay');

const FLOATING_CUBE_COUNT = 20;
const FLOATING_AXIS_OPTIONS: Array<'x' | 'y' | 'z'> = ['x', 'y', 'z'];
const FLOATING_COLORS = [
  0x38bdf8,
  0x818cf8,
  0x22d3ee,
  0x2dd4bf,
  0xf59e0b,
];
const IMPORTED_PROP_LAYOUT = [
  { x: -14, y: 1.2, z: -10, rotationY: 0.2, scale: 1.25 },
  { x: -6, y: 1.05, z: 14, rotationY: -0.45, scale: 0.95 },
  { x: 16, y: 1.45, z: 8, rotationY: 0.7, scale: 1.5 },
];
const ANIMATED_BEACON_LAYOUT = {
  x: 0,
  y: 1.15,
  z: -8,
  scale: 1.8,
};
const BEACON_TRIGGER_DISTANCE = 7.5;
const GAMEPLAY_SCENE_ASSET_MANIFEST = {
  textures: {
    floor: {
      source: floorTextureUrl,
      options: {
        repeat: { x: 12, y: 12 },
        colorSpace: 'srgb',
      },
    },
    wall: {
      source: wallTextureUrl,
      options: {
        repeat: { x: 8, y: 2 },
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

  const position = getComponent(world, controlled[0], Position)!;
  hud.body.textContent =
    'Explore the sanctum to see Stage 15-19 work as one path: textures on the room, imported crystal props, and a preloaded beacon that shifts clips when you get close.';
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
  const isNearby = Math.hypot(dx, dz) <= BEACON_TRIGGER_DISTANCE;
  const nextClip: 'Idle' | 'Activate' = isNearby ? 'Activate' : 'Idle';

  if (nextClip === animatedBeaconClip) {
    return;
  }

  playAnimation(world, animatedBeaconEntity, nextClip, {
    fadeDuration: 0.22,
    loop: nextClip === 'Activate' ? 'ping-pong' : 'repeat',
  });
  animatedBeaconClip = nextClip;
};

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randomAxis(): 'x' | 'y' | 'z' {
  return FLOATING_AXIS_OPTIONS[Math.floor(Math.random() * FLOATING_AXIS_OPTIONS.length)]!;
}

function createHud(): {
  root: HTMLDivElement;
  body: HTMLParagraphElement;
  status: HTMLParagraphElement;
  footer?: HTMLParagraphElement;
} {
  const panel = createHelloCubePanel({
    eyebrow: GAMEPLAY_COPY.eyebrow,
    title: GAMEPLAY_COPY.displayName,
    body: GAMEPLAY_COPY.summary,
    footer: GAMEPLAY_COPY.controlHint,
    badges: GAMEPLAY_COPY.badges,
  });

  panel.root.style.position = 'fixed';
  panel.root.style.top = '24px';
  panel.root.style.left = '24px';
  panel.root.style.maxWidth = 'min(460px, calc(100vw - 48px))';
  panel.root.style.zIndex = '7';
  panel.root.style.pointerEvents = 'none';

  const status = document.createElement('p');
  status.className = 'arcane-ui-panel__meta';
  panel.root.appendChild(status);

  return {
    root: panel.root,
    body: panel.body,
    status,
    footer: panel.footer,
  };
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

function spawnGameplayProps(
  world: World,
  ctx: ReturnType<typeof getGameContext>['ctx'],
  assets: GameplaySceneAssets,
): void {
  const crystalEntities = spawnModelInstances(
    world,
    ctx,
    assets.models.crystal,
    IMPORTED_PROP_LAYOUT.map((prop) => ({
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
    position: {
      x: ANIMATED_BEACON_LAYOUT.x,
      y: ANIMATED_BEACON_LAYOUT.y,
      z: ANIMATED_BEACON_LAYOUT.z,
    },
    scale: ANIMATED_BEACON_LAYOUT.scale,
  });
  const beaconRoot = getComponent(world, animatedBeaconEntity, MeshRef)?.mesh;
  if (beaconRoot) {
    setRootShadows(beaconRoot);
  }
  playAnimation(world, animatedBeaconEntity, 'Idle', { loop: 'repeat' });
  animatedBeaconClip = 'Idle';
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
  gameplaySceneAssets = await preloadSceneAssets(
    ctx,
    GAMEPLAY_SCENE_ASSET_MANIFEST,
    {
      onProgress(progress) {
        preloadContext.reportProgress?.({
          loaded: progress.loaded,
          total: progress.total,
          label: progress.assetName
            ? `Loaded ${progress.assetKind} "${progress.assetName}".`
            : 'Preparing scene assets.',
        });
      },
    },
  );
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
    emissive: 0x7c2d12,
    emissiveIntensity: 0.2,
    roughness: 0.42,
  });
  geometries.push(playerGeometry);
  materials.push(playerMaterial);

  const cubeEntity = spawnMesh(world, ctx, playerGeometry, playerMaterial, { x: 0, y: 0.55, z: 0 });
  addComponent(world, cubeEntity, Controllable);
  const playerMesh = getComponent(world, cubeEntity, MeshRef)?.mesh;
  if (playerMesh) {
    playerMesh.castShadow = true;
    playerMesh.receiveShadow = true;
  }

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
    const mesh = getComponent(world, entity, MeshRef)?.mesh;
    if (mesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
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

  const environmentLights = addEnvironmentLighting(ctx, {
    ambientIntensity: 0.28,
    hemisphereIntensity: 1.2,
    skyColor: 0xe0f2fe,
    groundColor: 0x0f172a,
  });
  const shadowRig = addDirectionalShadowLight(ctx, {
    color: 0xfef3c7,
    intensity: 2.8,
    position: { x: 8, y: 14, z: 10 },
    shadowCameraExtent: 18,
    far: 60,
  });
  const rimLight = new THREE.PointLight(0x22d3ee, 18, 80);
  rimLight.position.set(-12, 7, -10);
  const grid = new THREE.GridHelper(48, 48, 0x334155, 0x1e293b);
  grid.position.y = 0.01;

  const groundGeometry = new THREE.PlaneGeometry(60, 60);
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.96,
    metalness: 0.02,
  });
  geometries.push(groundGeometry);
  materials.push(groundMaterial);

  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.02;
  ground.receiveShadow = true;

  const northSouthWallGeometry = new THREE.BoxGeometry(60, 4, 0.6);
  const eastWestWallGeometry = new THREE.BoxGeometry(0.6, 4, 60);
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.88,
    metalness: 0.05,
  });
  geometries.push(northSouthWallGeometry, eastWestWallGeometry);
  materials.push(wallMaterial);

  const northWall = new THREE.Mesh(northSouthWallGeometry, wallMaterial);
  northWall.position.set(0, 2, -30);
  northWall.castShadow = true;
  northWall.receiveShadow = true;

  const southWall = new THREE.Mesh(northSouthWallGeometry, wallMaterial);
  southWall.position.set(0, 2, 30);
  southWall.castShadow = true;
  southWall.receiveShadow = true;

  const eastWall = new THREE.Mesh(eastWestWallGeometry, wallMaterial);
  eastWall.position.set(30, 2, 0);
  eastWall.castShadow = true;
  eastWall.receiveShadow = true;

  const westWall = new THREE.Mesh(eastWestWallGeometry, wallMaterial);
  westWall.position.set(-30, 2, 0);
  westWall.castShadow = true;
  westWall.receiveShadow = true;

  applyGameplayTextures(assets, groundMaterial, wallMaterial);

  sceneObjects = [
    ...environmentLights,
    shadowRig.light,
    shadowRig.target,
    rimLight,
    ground,
    grid,
    northWall,
    southWall,
    eastWall,
    westWall,
  ];
  ctx.scene.add(rimLight);
  ctx.scene.add(ground);
  ctx.scene.add(grid);
  ctx.scene.add(northWall);
  ctx.scene.add(southWall);
  ctx.scene.add(eastWall);
  ctx.scene.add(westWall);

  spawnGameplayProps(world, ctx, assets);

  hud = createHud();
  document.body.appendChild(hud.root);
  gameplayHudSystem(world, 0);

  registerSystem(world, movementSystem(6));
  registerSystem(world, gameplaySceneSystem);
  registerSystem(world, floatingMotionSystem);
  registerSystem(world, spinSystem);
  registerSystem(world, animatedBeaconSystem);
  registerSystem(world, animationSystem());
  registerSystem(world, gameplayHudSystem);
  registerSystem(world, cameraFollowSystem(ctx, { radius: 9, initialPitch: 0.42 }));
  registerSystem(world, renderSystem(ctx));
}

export function teardown(world: World): void {
  const { ctx } = getGameContext();
  animatedBeaconEntity = undefined;
  animatedBeaconClip = undefined;

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

  if (gameplaySceneAssets) {
    disposeAssetCache(gameplaySceneAssets.cache);
    gameplaySceneAssets = undefined;
  }

  for (const object of sceneObjects) {
    ctx.scene.remove(object);
  }
  sceneObjects = [];
}
