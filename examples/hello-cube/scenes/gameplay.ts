import {
  animationSystem,
  createTextureCache,
  disposeAssetCache,
  loadModel,
  loadTexture,
  playAnimation,
  spawnModel,
  type AssetCache,
  type TextureLoadContext,
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
import { getGameContext } from '../src/runtime/gameContext.js';
import { requestSceneChange } from '../src/runtime/sceneTransitions.js';
import { spinSystem } from '../src/spinSystem.js';

let inputHandle: ReturnType<typeof createInputManager> | undefined;
let sceneObjects: THREE.Object3D[] = [];
let hud: HTMLDivElement | undefined;
let geometries: THREE.BufferGeometry[] = [];
let materials: THREE.Material[] = [];
let textureCache: AssetCache | undefined;
let assetLoadGeneration = 0;
let animatedBeaconEntity: number | undefined;
let animatedBeaconClip: 'Idle' | 'Activate' | undefined;

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
    'Textured walls, static crystal props, and one animated imported beacon all reuse one scene-local asset cache. Walk near the center beacon to switch it into its Activate clip. Press Escape to return to the title scene.</span>';
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

async function loadGameplayTextures(
  textureCtx: TextureLoadContext,
  groundMaterial: THREE.MeshStandardMaterial,
  wallMaterial: THREE.MeshStandardMaterial,
  generation: number,
): Promise<void> {
  try {
    const [groundTexture, wallTexture] = await Promise.all([
      loadTexture(textureCtx, floorTextureUrl, {
        repeat: { x: 12, y: 12 },
        colorSpace: 'srgb',
      }),
      loadTexture(textureCtx, wallTextureUrl, {
        repeat: { x: 8, y: 2 },
        colorSpace: 'srgb',
      }),
    ]);

    if (generation !== assetLoadGeneration || textureCache !== textureCtx.assetCache) {
      return;
    }

    groundMaterial.color.set(0xffffff);
    groundMaterial.map = groundTexture;
    groundMaterial.needsUpdate = true;

    wallMaterial.color.set(0xffffff);
    wallMaterial.map = wallTexture;
    wallMaterial.needsUpdate = true;
  } catch (error) {
    if (generation === assetLoadGeneration) {
      console.warn('Arcane Engine gameplay texture load failed.', error);
    }
  }
}

function setRootShadows(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
}

async function loadGameplayModels(
  world: World,
  ctx: ReturnType<typeof getGameContext>['ctx'],
  cache: AssetCache,
  generation: number,
): Promise<void> {
  try {
    const [crystalAsset, animatedBeaconAsset] = await Promise.all([
      loadModel(cache, crystalModelUrl),
      loadModel(cache, animatedBeaconModelUrl),
    ]);

    if (generation !== assetLoadGeneration || textureCache !== cache) {
      return;
    }

    for (const prop of IMPORTED_PROP_LAYOUT) {
      const entity = spawnModel(world, ctx, crystalAsset, {
        position: { x: prop.x, y: prop.y, z: prop.z },
        rotation: { y: prop.rotationY },
        scale: prop.scale,
      });
      const root = getComponent(world, entity, MeshRef)?.mesh;
      if (root) {
        setRootShadows(root);
      }
    }

    animatedBeaconEntity = spawnModel(world, ctx, animatedBeaconAsset, {
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
  } catch (error) {
    if (generation === assetLoadGeneration) {
      console.warn('Arcane Engine gameplay model load failed.', error);
    }
  }
}

export function setup(world: World): void {
  const { ctx } = getGameContext();

  inputHandle = createInputManager(world);
  animatedBeaconEntity = undefined;
  animatedBeaconClip = undefined;
  textureCache = createTextureCache();
  const textureCtx = {
    ...ctx,
    assetCache: textureCache,
  } satisfies TextureLoadContext;
  const generation = assetLoadGeneration + 1;
  assetLoadGeneration = generation;

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

  void loadGameplayTextures(textureCtx, groundMaterial, wallMaterial, generation);
  void loadGameplayModels(world, ctx, textureCache, generation);

  hud = createHud();
  document.body.appendChild(hud);
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
  assetLoadGeneration += 1;
  animatedBeaconEntity = undefined;
  animatedBeaconClip = undefined;

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

  if (textureCache) {
    disposeAssetCache(textureCache);
    textureCache = undefined;
  }

  for (const object of sceneObjects) {
    ctx.scene.remove(object);
  }
  sceneObjects = [];
}
