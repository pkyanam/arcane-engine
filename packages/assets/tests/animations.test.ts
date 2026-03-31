import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createWorld, getComponent } from '../../core/src/index.js';
import type { RendererContext } from '../../renderer/src/renderer.js';
import {
  AnimationPlayer,
  animationSystem,
  createTextureCache,
  getModelAnimationClipNames,
  loadModel,
  playAnimation,
  spawnModel,
  stopAnimation,
} from '../src/index.js';

function makeRendererContext(): RendererContext {
  return {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    renderer: { render: vi.fn() } as unknown as THREE.WebGLRenderer,
  };
}

function makeAnimatedGltf(
  clipNames: string[] = ['Idle', 'Activate'],
): Awaited<ReturnType<GLTFLoader['loadAsync']>> {
  const scene = new THREE.Group();
  scene.name = 'AnimatedBeacon';
  scene.add(
    new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x5eead4 }),
    ),
  );

  const animations = clipNames.map((clipName, index) => (
    new THREE.AnimationClip(
      clipName,
      0.5 + index * 0.1,
      [
        new THREE.VectorKeyframeTrack(
          '.position',
          [0, 0.25, 0.5],
          [0, 0, 0, 0, 0.15 + index * 0.05, 0, 0, 0, 0],
        ),
      ],
    )
  ));

  return {
    scene,
    animations,
  } as Awaited<ReturnType<GLTFLoader['loadAsync']>>;
}

describe('animated model playback', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('lists normalized animation clip names from a loaded model asset', async () => {
    const cache = createTextureCache();
    vi
      .spyOn(GLTFLoader.prototype, 'loadAsync')
      .mockResolvedValue(makeAnimatedGltf(['', 'Idle', 'Idle']));

    const asset = await loadModel(cache, '/models/animated-beacon.glb');

    expect(getModelAnimationClipNames(asset)).toEqual(['Clip 1', 'Idle', 'Idle 2']);
  });

  it('attaches AnimationPlayer when spawnModel clones an animated model', async () => {
    const cache = createTextureCache();
    vi
      .spyOn(GLTFLoader.prototype, 'loadAsync')
      .mockResolvedValue(makeAnimatedGltf());

    const asset = await loadModel(cache, '/models/animated-beacon.glb');
    const world = createWorld();
    const entity = spawnModel(world, makeRendererContext(), asset);
    const player = getComponent(world, entity, AnimationPlayer);

    expect(player).toBeDefined();
    expect(player?.clipNames).toEqual(['Idle', 'Activate']);
    expect(player?.mixer).toBeInstanceOf(THREE.AnimationMixer);
    expect(Object.keys(player?.actions ?? {})).toEqual(['Idle', 'Activate']);
  });

  it('plays named clips with loop controls and does not restart the same clip by default', async () => {
    const cache = createTextureCache();
    vi
      .spyOn(GLTFLoader.prototype, 'loadAsync')
      .mockResolvedValue(makeAnimatedGltf());

    const asset = await loadModel(cache, '/models/animated-beacon.glb');
    const world = createWorld();
    const entity = spawnModel(world, makeRendererContext(), asset);
    const player = getComponent(world, entity, AnimationPlayer)!;
    const idleAction = player.actions.Idle!;

    playAnimation(world, entity, 'Idle', {
      loop: 'ping-pong',
      repetitions: 3,
    });
    player.mixer!.update(0.2);
    const firstTime = idleAction.time;

    playAnimation(world, entity, 'Idle');
    player.mixer!.update(0.2);

    expect(player.currentClip).toBe('Idle');
    expect(idleAction.loop).toBe(THREE.LoopPingPong);
    expect(idleAction.repetitions).toBe(3);
    expect(idleAction.time).toBeGreaterThan(firstTime);
  });

  it('fades between clips and stops the old action after the fade duration', async () => {
    const cache = createTextureCache();
    vi
      .spyOn(GLTFLoader.prototype, 'loadAsync')
      .mockResolvedValue(makeAnimatedGltf());

    const asset = await loadModel(cache, '/models/animated-beacon.glb');
    const world = createWorld();
    const entity = spawnModel(world, makeRendererContext(), asset);
    const player = getComponent(world, entity, AnimationPlayer)!;
    const idleAction = player.actions.Idle!;
    const activateAction = player.actions.Activate!;
    const idleFadeOut = vi.spyOn(idleAction, 'fadeOut');
    const idleStop = vi.spyOn(idleAction, 'stop');
    const activateFadeIn = vi.spyOn(activateAction, 'fadeIn');

    playAnimation(world, entity, 'Idle');
    playAnimation(world, entity, 'Activate', {
      fadeDuration: 0.25,
      loop: 'once',
    });

    expect(player.currentClip).toBe('Activate');
    expect(player.pendingStopDurations).toEqual({ Idle: 0.25 });
    expect(idleFadeOut).toHaveBeenCalledWith(0.25);
    expect(activateFadeIn).toHaveBeenCalledWith(0.25);
    expect(activateAction.clampWhenFinished).toBe(true);

    animationSystem()(world, 0.3);

    expect(idleStop).toHaveBeenCalled();
    expect(player.pendingStopDurations).toEqual({});
  });

  it('stops the current clip immediately or after a fade', async () => {
    const cache = createTextureCache();
    vi
      .spyOn(GLTFLoader.prototype, 'loadAsync')
      .mockResolvedValue(makeAnimatedGltf());

    const asset = await loadModel(cache, '/models/animated-beacon.glb');
    const world = createWorld();
    const entity = spawnModel(world, makeRendererContext(), asset);
    const player = getComponent(world, entity, AnimationPlayer)!;
    const idleAction = player.actions.Idle!;
    const idleStop = vi.spyOn(idleAction, 'stop');
    const idleFadeOut = vi.spyOn(idleAction, 'fadeOut');

    playAnimation(world, entity, 'Idle');
    stopAnimation(world, entity, { fadeDuration: 0.2 });

    expect(player.currentClip).toBeNull();
    expect(idleFadeOut).toHaveBeenCalledWith(0.2);

    animationSystem()(world, 0.25);

    expect(idleStop).toHaveBeenCalledTimes(1);
  });

  it('throws helpful errors for missing clips or non-animated entities', async () => {
    const cache = createTextureCache();
    const loadAsync = vi.spyOn(GLTFLoader.prototype, 'loadAsync');
    loadAsync
      .mockResolvedValueOnce(makeAnimatedGltf(['Idle']))
      .mockResolvedValueOnce({
        scene: new THREE.Group(),
        animations: [],
      } as unknown as Awaited<ReturnType<GLTFLoader['loadAsync']>>);

    const asset = await loadModel(cache, '/models/animated-beacon.glb');
    const world = createWorld();
    const animatedEntity = spawnModel(world, makeRendererContext(), asset);

    expect(() => playAnimation(world, animatedEntity, 'Run')).toThrow(
      'playAnimation: clip "Run" was not found',
    );

    const staticAsset = await loadModel(cache, '/models/static.glb');
    const staticEntity = spawnModel(world, makeRendererContext(), staticAsset);

    expect(() => stopAnimation(world, staticEntity)).toThrow(
      `stopAnimation: entity ${staticEntity} does not have an AnimationPlayer.`,
    );
  });
});
