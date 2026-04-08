import { getComponent, query } from '@arcane-engine/core';
import type { Entity, SystemFn, World } from '@arcane-engine/core';
import {
  playSFXAtPosition,
  stopSound,
  updateSpatialHandle,
  type AudioContext,
  type AudioSourceHandle,
} from './audio.js';
import { SpatialAudio } from './components/SpatialAudio.js';
import { PositionRef } from './interopComponents.js';

interface SpatialPlaybackState {
  handle: AudioSourceHandle | null;
  lastLoop: boolean;
  lastSoundId: string;
  wasPlaying: boolean;
}

/**
 * Keep entity-attached positional audio in sync with ECS `Position` data.
 *
 * Run this after your movement systems so the panner positions reflect the
 * current frame's world transforms.
 */
export function spatialAudioSystem(audioCtx: AudioContext): SystemFn {
  const tracked = new Map<Entity, SpatialPlaybackState>();

  return (world: World, _dt: number): void => {
    const activeEntities = new Set<Entity>();

    for (const entity of query(world, [SpatialAudio, PositionRef])) {
      activeEntities.add(entity);

      const spatial = getComponent(world, entity, SpatialAudio)!;
      const position = getComponent(world, entity, PositionRef)!;
      const state = tracked.get(entity) ?? {
        handle: null,
        lastLoop: spatial.loop,
        lastSoundId: spatial.soundId,
        wasPlaying: false,
      };

      if (state.handle?.stopped) {
        state.handle = null;
      }

      const soundChanged = state.lastSoundId !== spatial.soundId || state.lastLoop !== spatial.loop;
      if (soundChanged && state.handle) {
        stopSound(state.handle);
        state.handle = null;
      }

      if (!spatial.playing || spatial.soundId.trim() === '') {
        if (state.handle) {
          stopSound(state.handle);
          state.handle = null;
        }
      } else {
        const shouldStart = !state.wasPlaying || soundChanged;
        if (shouldStart && !state.handle) {
          state.handle = playSFXAtPosition(audioCtx, spatial.soundId, position, {
            loop: spatial.loop,
            maxDistance: spatial.maxDistance,
            refDistance: spatial.refDistance,
            rolloffFactor: spatial.rolloffFactor,
            volume: spatial.volume,
          });
        }

        if (state.handle) {
          updateSpatialHandle(state.handle, position, {
            maxDistance: spatial.maxDistance,
            refDistance: spatial.refDistance,
            rolloffFactor: spatial.rolloffFactor,
            volume: spatial.volume,
          });
        }
      }

      state.wasPlaying = spatial.playing;
      state.lastLoop = spatial.loop;
      state.lastSoundId = spatial.soundId;
      tracked.set(entity, state);
    }

    for (const [entity, state] of tracked) {
      if (activeEntities.has(entity)) {
        continue;
      }

      if (state.handle) {
        stopSound(state.handle);
      }

      tracked.delete(entity);
    }
  };
}
