import { defineComponent, getComponent, query } from '@arcane-engine/core';
import type { Entity, SystemFn, World } from '@arcane-engine/core';
import * as THREE from 'three';

/**
 * Beginner-friendly loop presets for imported model clips.
 */
export type AnimationLoopMode = 'repeat' | 'once' | 'ping-pong';

/**
 * Playback options for `playAnimation()`.
 */
export interface PlayAnimationOptions {
  /**
   * Loop behavior for the clip.
   *
   * Defaults to `'repeat'`.
   */
  loop?: AnimationLoopMode;
  /**
   * Optional loop count. Use `1` for a single play-through.
   *
   * Defaults to `Infinity` for looping clips and `1` for `'once'`.
   */
  repetitions?: number;
  /**
   * Fade duration in seconds when switching from the current clip.
   *
   * Defaults to `0`.
   */
  fadeDuration?: number;
  /**
   * Playback speed multiplier.
   *
   * Defaults to `1`.
   */
  timeScale?: number;
  /**
   * Restart the clip from the beginning if it is already active.
   *
   * Defaults to `false`.
   */
  restart?: boolean;
}

/**
 * Stop options for `stopAnimation()`.
 */
export interface StopAnimationOptions {
  /**
   * Fade-out duration in seconds before the clip is fully stopped.
   *
   * Defaults to `0`.
   */
  fadeDuration?: number;
}

/**
 * Runtime animation state attached to spawned model entities.
 */
export interface AnimationPlayerState {
  /**
   * The cloned model root driven by the mixer.
   */
  root: THREE.Object3D | null;
  /**
   * Three.js mixer that advances imported clips every tick.
   */
  mixer: THREE.AnimationMixer | null;
  /**
   * Available clip names for this spawned model instance.
   */
  clipNames: string[];
  /**
   * Named actions created from the imported clips.
   */
  actions: Record<string, THREE.AnimationAction>;
  /**
   * The clip that should be considered active right now.
   */
  currentClip: string | null;
  /**
   * Fade-out timers for clips that should stop after their fade completes.
   */
  pendingStopDurations: Record<string, number>;
}

/**
 * Animation playback state for imported model instances.
 *
 * `spawnModel()` attaches this automatically when the loaded model includes
 * animation clips.
 */
export const AnimationPlayer = defineComponent<AnimationPlayerState>('AnimationPlayer', () => ({
  root: null,
  mixer: null,
  clipNames: [],
  actions: {},
  currentClip: null,
  pendingStopDurations: {},
}));

/**
 * Returns a system that advances every active imported-model mixer each tick.
 */
export function animationSystem(): SystemFn {
  return (world: World, dt: number): void => {
    for (const entity of query(world, [AnimationPlayer])) {
      const player = getComponent(world, entity, AnimationPlayer)!;
      player.mixer?.update(dt);
      advancePendingStops(player, dt);
    }
  };
}

/**
 * Play a named clip on a spawned model entity.
 *
 * If another clip is active, Stage 17 uses a small explicit fade between the
 * old and new actions instead of a larger animation-graph abstraction.
 */
export function playAnimation(
  world: World,
  entity: Entity,
  clipName: string,
  options: PlayAnimationOptions = {},
): THREE.AnimationAction {
  const player = getRequiredAnimationPlayer(world, entity, 'playAnimation');
  const action = player.actions[clipName];
  if (!action) {
    const available = player.clipNames.length > 0
      ? player.clipNames.join(', ')
      : '(none)';
    throw new Error(
      `playAnimation: clip "${clipName}" was not found on entity ${entity}. Available clips: ${available}`,
    );
  }

  const fadeDuration = Math.max(0, options.fadeDuration ?? 0);
  const currentClip = player.currentClip;
  const currentAction = currentClip ? player.actions[currentClip] : undefined;
  const isSameClip = currentClip === clipName;

  delete player.pendingStopDurations[clipName];

  if (isSameClip && !options.restart && action.isRunning()) {
    if (options.timeScale !== undefined) {
      action.setEffectiveTimeScale(options.timeScale);
    }
    return action;
  }

  configureActionLoop(action, options);
  action.enabled = true;
  action.clampWhenFinished = (options.loop ?? 'repeat') === 'once';
  action.setEffectiveTimeScale(options.timeScale ?? 1);
  action.setEffectiveWeight(1);

  if (currentClip && currentAction && currentClip !== clipName) {
    if (fadeDuration > 0) {
      currentAction.fadeOut(fadeDuration);
      scheduleActionStop(player, currentClip, fadeDuration);
    } else {
      currentAction.stop();
      delete player.pendingStopDurations[currentClip];
    }
  }

  action.reset();
  if (fadeDuration > 0) {
    action.fadeIn(fadeDuration);
  }
  action.play();
  player.currentClip = clipName;

  return action;
}

/**
 * Stop the current clip on a spawned model entity.
 */
export function stopAnimation(
  world: World,
  entity: Entity,
  options: StopAnimationOptions = {},
): void {
  const player = getRequiredAnimationPlayer(world, entity, 'stopAnimation');
  const clipName = player.currentClip;
  if (!clipName) {
    return;
  }

  const action = player.actions[clipName];
  if (!action) {
    player.currentClip = null;
    return;
  }

  const fadeDuration = Math.max(0, options.fadeDuration ?? 0);
  if (fadeDuration > 0) {
    action.fadeOut(fadeDuration);
    scheduleActionStop(player, clipName, fadeDuration);
  } else {
    action.stop();
    delete player.pendingStopDurations[clipName];
  }

  player.currentClip = null;
}

function getRequiredAnimationPlayer(
  world: World,
  entity: Entity,
  consumer: 'playAnimation' | 'stopAnimation',
): AnimationPlayerState {
  const player = getComponent(world, entity, AnimationPlayer);
  if (!player || !player.mixer) {
    throw new Error(
      `${consumer}: entity ${entity} does not have an AnimationPlayer. ` +
      'Spawn an animated model with spawnModel() first.',
    );
  }
  return player;
}

function configureActionLoop(
  action: THREE.AnimationAction,
  options: PlayAnimationOptions,
): void {
  const loop = options.loop ?? 'repeat';
  const repetitions = options.repetitions ?? (loop === 'once' ? 1 : Infinity);

  if (loop === 'once') {
    action.setLoop(THREE.LoopOnce, repetitions);
    return;
  }

  if (loop === 'ping-pong') {
    action.setLoop(THREE.LoopPingPong, repetitions);
    return;
  }

  action.setLoop(THREE.LoopRepeat, repetitions);
}

function scheduleActionStop(
  player: AnimationPlayerState,
  clipName: string,
  duration: number,
): void {
  player.pendingStopDurations[clipName] = Math.max(
    player.pendingStopDurations[clipName] ?? 0,
    duration,
  );
}

function advancePendingStops(player: AnimationPlayerState, dt: number): void {
  for (const [clipName, remaining] of Object.entries(player.pendingStopDurations)) {
    const nextRemaining = remaining - dt;
    if (nextRemaining > 0) {
      player.pendingStopDurations[clipName] = nextRemaining;
      continue;
    }

    player.actions[clipName]?.stop();
    delete player.pendingStopDurations[clipName];
  }
}
