# @arcane-engine/audio

Beginner-friendly Web Audio helpers for Arcane Engine.

This package handles:

- a small master / SFX / music mixer
- sound loading and decoded-buffer caching
- one-shot or looping sound effects
- positional sound with `PannerNode`
- entity-attached spatial audio through ECS
- listener syncing from your camera
- background music playback with fade-ins and crossfades
- browser autoplay-safe resume after user interaction
- explicit cleanup during scene teardown

It does not add:

- occlusion, obstruction, or reverb zones
- third-party audio wrappers
- UI for settings menus or sliders
- game-specific sound design for `hello-cube`

## Install

```sh
pnpm add @arcane-engine/audio @arcane-engine/core
```

If you want entity-attached spatial audio, your game should also have a
`Position` component. Most Arcane Engine games already use `Position` from
`@arcane-engine/renderer`.

## What It Exports

- `createAudioContext(options?)`
- `loadSound(audioCtx, id, source)`
- `loadSounds(audioCtx, manifest)`
- `playSFX(audioCtx, id, options?)`
- `playSFXAtPosition(audioCtx, id, position, options?)`
- `stopSound(handle)`
- `SpatialAudio`
- `spatialAudioSystem(audioCtx)`
- `updateAudioListener(audioCtx, camera)`
- `playMusic(audioCtx, id, options?)`
- `stopMusic(audioCtx, options?)`
- `crossfadeMusic(audioCtx, id, duration?)`
- `setMasterVolume(audioCtx, volume)`
- `setSFXVolume(audioCtx, volume)`
- `setMusicVolume(audioCtx, volume)`
- `resumeAudioOnInteraction(audioCtx)`
- `disposeAudioContext(audioCtx)`

## Quick Start

```ts
import {
  createAudioContext,
  disposeAudioContext,
  loadSounds,
  playSFX,
  resumeAudioOnInteraction,
} from '@arcane-engine/audio';
import laserUrl from './assets/laser.ogg';

const audio = createAudioContext({
  masterVolume: 0.9,
  sfxVolume: 1,
  musicVolume: 0.5,
});

await loadSounds(audio, {
  laser: laserUrl,
});

const audioReady = resumeAudioOnInteraction(audio);

window.addEventListener('click', async () => {
  await audioReady;
  playSFX(audio, 'laser', {
    volume: 0.75,
    pitch: 1.1,
  });
});

// Later, during scene teardown:
await disposeAudioContext(audio);
```

## Attach A Sound To An Entity

This is the standard Arcane Engine pattern:

1. load the sound once
2. add `SpatialAudio` to an entity that already has `Position`
3. run `spatialAudioSystem(audio)` after movement
4. sync the Web Audio listener from your camera each frame

```ts
import { addComponent, createEntity, createWorld, registerSystem } from '@arcane-engine/core';
import {
  SpatialAudio,
  createAudioContext,
  loadSound,
  resumeAudioOnInteraction,
  spatialAudioSystem,
  updateAudioListener,
} from '@arcane-engine/audio';
import { Position, createRenderer } from '@arcane-engine/renderer';
import reactorHumUrl from './assets/reactor-hum.ogg';

const world = createWorld();
const renderer = createRenderer();
const audio = createAudioContext();

await loadSound(audio, 'reactorHum', reactorHumUrl);
await resumeAudioOnInteraction(audio);

const reactor = createEntity(world);
addComponent(world, reactor, Position, { x: 8, y: 1.5, z: -6 });
addComponent(world, reactor, SpatialAudio, {
  soundId: 'reactorHum',
  playing: true,
  loop: true,
  volume: 0.45,
  refDistance: 2,
  maxDistance: 20,
  rolloffFactor: 1,
});

registerSystem(world, spatialAudioSystem(audio));
registerSystem((_world, _dt) => {
  updateAudioListener(audio, renderer.camera);
});
```

`SpatialAudio.playing` lets your game toggle the sound on or off. The spatial
system keeps the underlying `PannerNode` synced to the entity's current
position and stops the sound when the component stops playing or the entity
goes away.

## One-Shot Positional Sounds

Use `playSFXAtPosition(...)` when the sound should come from a point in the
world but does not need to stay attached to a long-lived entity.

```ts
playSFXAtPosition(audio, 'explosion', { x: 12, y: 0.5, z: -4 }, {
  volume: 0.8,
  maxDistance: 28,
  refDistance: 3,
});
```

## Play Background Music

Music routes through `musicGain`, not the SFX bus.

```ts
import {
  createAudioContext,
  crossfadeMusic,
  loadSounds,
  playMusic,
  stopMusic,
} from '@arcane-engine/audio';
import calmUrl from './assets/music-calm.ogg';
import dangerUrl from './assets/music-danger.ogg';

const audio = createAudioContext({ musicVolume: 0.65 });

await loadSounds(audio, {
  calm: calmUrl,
  danger: dangerUrl,
});

playMusic(audio, 'calm', {
  volume: 0.8,
  fadeInDuration: 0.75,
});

// Later, when the game state shifts:
crossfadeMusic(audio, 'danger', 1.2);

// Fade the current track out completely:
stopMusic(audio, { fadeOutDuration: 0.5 });
```

`playMusic(...)` starts a track and fades out the old one if music is already
playing. `crossfadeMusic(...)` is the quick path when you just want to swap
tracks over a shared duration.

## Browser Autoplay Rule

Browsers often start `AudioContext` in a suspended state.

Use `resumeAudioOnInteraction(audio)` once during startup. It listens for the
next click, tap, or key press, resumes the context, and removes its listeners
after the context is running.

Calling it more than once on the same context is safe. It reuses the same
pending promise instead of stacking duplicate listeners.

## Loading And Caching

`loadSound(...)` and `loadSounds(...)` accept normal URL strings, including the
URL strings Vite gives you from imported sound files.

Example:

```ts
import hitUrl from './assets/hit.wav';

await loadSound(audio, 'hit', hitUrl);
```

The cache key is the sound `id`.

That means:

1. the first successful load for an `id` fetches and decodes the file
2. later loads with the same `id` return the cached buffer
3. the cache clears when you call `disposeAudioContext(audio)`

## Volume Controls

The mixer has three gain nodes:

- `master`: affects everything
- `sfx`: affects `playSFX(...)` and `playSFXAtPosition(...)`
- `music`: affects `playMusic(...)` and `crossfadeMusic(...)`

All volume setters clamp to the `0` to `1` range.

## Teardown Rule

Dispose the audio context when the owning scene or runtime ends:

1. stop any game logic that might trigger new sounds
2. call `await disposeAudioContext(audio)`

That stops active SFX, positional sounds, and music, disconnects the gain
graph, clears the decoded cache, and closes the browser audio context cleanly.
