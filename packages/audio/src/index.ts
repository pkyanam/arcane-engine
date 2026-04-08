export { SpatialAudio } from './components/SpatialAudio.js';
export type { SpatialAudioData } from './components/SpatialAudio.js';

export type {
  AudioContext,
  AudioListenerCameraLike,
  AudioOptions,
  AudioSourceHandle,
  MusicHandle,
  PlayMusicOptions,
  PlaySFXAtPositionOptions,
  PlaySFXOptions,
  SoundManifest,
  SoundSource,
  StopMusicOptions,
  Vector3Like,
} from './audio.js';
export {
  createAudioContext,
  crossfadeMusic,
  disposeAudioContext,
  loadSound,
  loadSounds,
  playMusic,
  playSFX,
  playSFXAtPosition,
  resumeAudioOnInteraction,
  setMasterVolume,
  setMusicVolume,
  setSFXVolume,
  stopMusic,
  stopSound,
  updateAudioListener,
} from './audio.js';

export { spatialAudioSystem } from './spatialAudioSystem.js';
