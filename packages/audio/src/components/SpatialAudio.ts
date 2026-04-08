import { defineComponent } from '@arcane-engine/core';

export interface SpatialAudioData {
  soundId: string;
  volume: number;
  loop: boolean;
  maxDistance: number;
  refDistance: number;
  rolloffFactor: number;
  playing: boolean;
}

/** Positional sound state attached to an entity with a `Position` component. */
export const SpatialAudio = defineComponent<SpatialAudioData>('SpatialAudio', () => ({
  soundId: '',
  volume: 1,
  loop: true,
  maxDistance: 24,
  refDistance: 1,
  rolloffFactor: 1,
  playing: false,
}));
