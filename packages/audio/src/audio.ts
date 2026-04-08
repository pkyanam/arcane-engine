export interface AudioContext {
  readonly kind: 'arcane-audio-context';
  readonly ctx: globalThis.AudioContext;
  readonly masterGain: GainNode;
  readonly sfxGain: GainNode;
  readonly musicGain: GainNode;
  readonly loaded: Map<string, AudioBuffer>;
}

export interface AudioOptions {
  masterVolume?: number;
  sfxVolume?: number;
  musicVolume?: number;
}

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export interface AudioListenerCameraLike {
  readonly position: Vector3Like;
  readonly up?: Vector3Like;
  getWorldDirection?(target: Vector3Like): Vector3Like;
  getWorldPosition?(target: Vector3Like): Vector3Like;
}

export interface PlaySFXOptions {
  volume?: number;
  pitch?: number;
  loop?: boolean;
}

export interface PlaySFXAtPositionOptions extends PlaySFXOptions {
  maxDistance?: number;
  refDistance?: number;
  rolloffFactor?: number;
}

export interface PlayMusicOptions {
  volume?: number;
  loop?: boolean;
  fadeInDuration?: number;
}

export interface StopMusicOptions {
  fadeOutDuration?: number;
}

export interface AudioSourceHandle {
  readonly kind: 'arcane-audio-source-handle';
  readonly id: string;
  readonly source: AudioBufferSourceNode;
  readonly gain: GainNode;
  readonly panner?: PannerNode;
  stopped: boolean;
}

export interface MusicHandle {
  readonly kind: 'arcane-music-handle';
  readonly id: string;
  readonly source: AudioBufferSourceNode;
  readonly gain: GainNode;
  stopped: boolean;
}

export type SoundSource = string;
export type SoundManifest = Record<string, SoundSource>;

type LoadedSounds<TManifest extends SoundManifest> = {
  [K in keyof TManifest]: AudioBuffer;
};

interface AudioParamLike {
  value: number;
  cancelScheduledValues?: (startTime: number) => void;
  setValueAtTime?: (value: number, startTime: number) => void;
  linearRampToValueAtTime?: (value: number, endTime: number) => void;
}

interface AudioContextState {
  disposed: boolean;
  readonly loading: Map<string, Promise<AudioBuffer>>;
  readonly activeHandles: Set<AudioSourceHandle>;
  readonly activeMusicHandles: Set<MusicHandle>;
  currentMusic: MusicHandle | null;
  resumePromise: Promise<void> | null;
  resumeResolve: (() => void) | null;
  resumeReject: ((error: Error) => void) | null;
  clearResumeListeners: (() => void) | null;
}

interface ManagedHandleState {
  cleaned: boolean;
  cleanupTimer: ReturnType<typeof setTimeout> | null;
  cleanup: () => void;
}

interface WebAudioContextConstructor {
  new (): globalThis.AudioContext;
}

const contextStates = new WeakMap<AudioContext, AudioContextState>();
const handleStates = new WeakMap<AudioSourceHandle, ManagedHandleState>();
const musicHandleStates = new WeakMap<MusicHandle, ManagedHandleState>();
const RESUME_EVENTS = ['pointerdown', 'keydown', 'touchstart', 'click'] as const;
const DEFAULT_MUSIC_FADE_SECONDS = 0.5;
const DEFAULT_CROSSFADE_SECONDS = 1;

/**
 * Create an Arcane Engine audio context with master, SFX, and music channels.
 *
 * Keep one audio context for your game or scene, then dispose it during
 * teardown when you no longer need any loaded sounds or active playback.
 */
export function createAudioContext(options: AudioOptions = {}): AudioContext {
  const AudioContextCtor = resolveAudioContextConstructor();
  const ctx = new AudioContextCtor();
  const masterGain = ctx.createGain();
  const sfxGain = ctx.createGain();
  const musicGain = ctx.createGain();

  sfxGain.connect(masterGain);
  musicGain.connect(masterGain);
  masterGain.connect(ctx.destination);

  masterGain.gain.value = clampVolume(options.masterVolume ?? 1);
  sfxGain.gain.value = clampVolume(options.sfxVolume ?? 1);
  musicGain.gain.value = clampVolume(options.musicVolume ?? 0.5);

  const audioCtx: AudioContext = {
    kind: 'arcane-audio-context',
    ctx,
    masterGain,
    sfxGain,
    musicGain,
    loaded: new Map(),
  };

  contextStates.set(audioCtx, {
    disposed: false,
    loading: new Map(),
    activeHandles: new Set(),
    activeMusicHandles: new Set(),
    currentMusic: null,
    resumePromise: null,
    resumeResolve: null,
    resumeReject: null,
    clearResumeListeners: null,
  });

  return audioCtx;
}

/**
 * Load and decode one sound into the context cache.
 *
 * Sound IDs are the cache key. Loading the same `id` again returns the cached
 * buffer and does not fetch or decode a second time until the context is
 * disposed.
 */
export async function loadSound(
  audioCtx: AudioContext,
  id: string,
  source: SoundSource,
): Promise<AudioBuffer> {
  const state = getAudioContextState(audioCtx);
  assertAudioContextActive(state, 'loadSound');

  const cached = audioCtx.loaded.get(id);
  if (cached) {
    return cached;
  }

  const pending = state.loading.get(id);
  if (pending) {
    return pending;
  }

  const loadPromise = (async (): Promise<AudioBuffer> => {
    const fetcher = globalThis.fetch;
    if (!fetcher) {
      throw new Error('loadSound: fetch is not available in this environment');
    }

    const response = await fetcher(source);
    if (!response.ok) {
      throw new Error(`loadSound: failed to fetch "${source}" (${response.status})`);
    }

    const encoded = await response.arrayBuffer();
    const decoded = await audioCtx.ctx.decodeAudioData(encoded.slice(0));
    audioCtx.loaded.set(id, decoded);
    return decoded;
  })();

  state.loading.set(id, loadPromise);

  try {
    return await loadPromise;
  } finally {
    state.loading.delete(id);
  }
}

/**
 * Batch-load a manifest of sounds into the cache.
 *
 * This is a thin wrapper around `loadSound(...)`, so the same per-id cache
 * rules still apply.
 */
export async function loadSounds<TManifest extends SoundManifest>(
  audioCtx: AudioContext,
  manifest: TManifest,
): Promise<LoadedSounds<TManifest>> {
  const loaded = {} as LoadedSounds<TManifest>;

  await Promise.all(
    Object.entries(manifest).map(async ([id, source]) => {
      const buffer = await loadSound(audioCtx, id, source);
      (loaded as Record<string, AudioBuffer>)[id] = buffer;
    }),
  );

  return loaded;
}

/**
 * Play one loaded sound effect through the SFX channel.
 *
 * Call `stopSound(handle)` if you need to stop a looping sound or cancel a
 * one-shot before it ends naturally.
 */
export function playSFX(
  audioCtx: AudioContext,
  id: string,
  options: PlaySFXOptions = {},
): AudioSourceHandle {
  const state = getAudioContextState(audioCtx);
  assertAudioContextActive(state, 'playSFX');

  return createAudioSourceHandle(audioCtx, id, options, audioCtx.sfxGain);
}

/**
 * Play one loaded sound effect at a world-space position through a
 * `PannerNode`.
 *
 * This is useful for one-shot world sounds such as an explosion, a sentry
 * chirp, or a button press that should come from a specific place in the
 * level even when it is not tied to a long-lived entity.
 */
export function playSFXAtPosition(
  audioCtx: AudioContext,
  id: string,
  position: Vector3Like,
  options: PlaySFXAtPositionOptions = {},
): AudioSourceHandle {
  const state = getAudioContextState(audioCtx);
  assertAudioContextActive(state, 'playSFXAtPosition');

  const panner = audioCtx.ctx.createPanner();
  panner.connect(audioCtx.sfxGain);

  const handle = createAudioSourceHandle(audioCtx, id, options, panner, panner);
  updateSpatialHandle(handle, position, options);
  return handle;
}

/**
 * Update the position and attenuation settings for a positional sound handle.
 *
 * The handle must come from `playSFXAtPosition(...)` or from the spatial audio
 * system. Non-positional handles are ignored.
 */
export function updateSpatialHandle(
  handle: AudioSourceHandle,
  position: Vector3Like,
  options: Pick<PlaySFXAtPositionOptions, 'maxDistance' | 'refDistance' | 'rolloffFactor' | 'volume'> = {},
): void {
  if (handle.panner) {
    setPannerPosition(handle.panner, position);
    handle.panner.panningModel = 'HRTF';
    handle.panner.distanceModel = 'inverse';
    handle.panner.maxDistance = sanitizePositiveDistance(options.maxDistance, 24);
    handle.panner.refDistance = sanitizePositiveDistance(options.refDistance, 1);
    handle.panner.rolloffFactor = sanitizeNonNegative(options.rolloffFactor, 1);
  }

  handle.gain.gain.value = clampVolume(options.volume ?? handle.gain.gain.value);
}

/**
 * Start background music on the music channel.
 *
 * If a track is already playing, the old one fades out while the new one fades
 * in on the same `musicGain` bus.
 */
export function playMusic(
  audioCtx: AudioContext,
  id: string,
  options: PlayMusicOptions = {},
): MusicHandle {
  const state = getAudioContextState(audioCtx);
  assertAudioContextActive(state, 'playMusic');

  const handle = createMusicHandle(audioCtx, id, options);
  const previous = state.currentMusic;
  state.currentMusic = handle;

  if (previous && previous !== handle && !previous.stopped) {
    fadeOutAndStopMusicHandle(audioCtx, previous, normalizeDuration(options.fadeInDuration, DEFAULT_MUSIC_FADE_SECONDS));
  }

  return handle;
}

/**
 * Stop the current music track with an optional fade-out.
 */
export function stopMusic(
  audioCtx: AudioContext,
  options: StopMusicOptions = {},
): void {
  const state = getAudioContextState(audioCtx);
  assertAudioContextActive(state, 'stopMusic');

  const currentMusic = state.currentMusic;
  state.currentMusic = null;

  if (!currentMusic) {
    return;
  }

  fadeOutAndStopMusicHandle(
    audioCtx,
    currentMusic,
    normalizeDuration(options.fadeOutDuration, DEFAULT_MUSIC_FADE_SECONDS),
  );
}

/**
 * Crossfade from the current music track to another loaded track.
 */
export function crossfadeMusic(
  audioCtx: AudioContext,
  id: string,
  duration = DEFAULT_CROSSFADE_SECONDS,
): void {
  playMusic(audioCtx, id, {
    fadeInDuration: normalizeDuration(duration, DEFAULT_CROSSFADE_SECONDS),
    loop: true,
  });
}

/**
 * Sync the Web Audio listener to a camera.
 *
 * Pass `ctx.camera` from `@arcane-engine/renderer` after your camera movement
 * has already been applied for the frame.
 */
export function updateAudioListener(
  audioCtx: AudioContext,
  camera: AudioListenerCameraLike,
): void {
  const state = getAudioContextState(audioCtx);
  assertAudioContextActive(state, 'updateAudioListener');

  const listener = audioCtx.ctx.listener as AudioListener & {
    positionX?: AudioParamLike;
    positionY?: AudioParamLike;
    positionZ?: AudioParamLike;
    forwardX?: AudioParamLike;
    forwardY?: AudioParamLike;
    forwardZ?: AudioParamLike;
    upX?: AudioParamLike;
    upY?: AudioParamLike;
    upZ?: AudioParamLike;
  };

  const position = readWorldPosition(camera);
  const forward = normalizeVector(readForwardDirection(camera), { x: 0, y: 0, z: -1 });
  const up = normalizeVector(camera.up ?? { x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 0 });

  if (
    listener.positionX &&
    listener.positionY &&
    listener.positionZ &&
    listener.forwardX &&
    listener.forwardY &&
    listener.forwardZ &&
    listener.upX &&
    listener.upY &&
    listener.upZ
  ) {
    listener.positionX.value = position.x;
    listener.positionY.value = position.y;
    listener.positionZ.value = position.z;
    listener.forwardX.value = forward.x;
    listener.forwardY.value = forward.y;
    listener.forwardZ.value = forward.z;
    listener.upX.value = up.x;
    listener.upY.value = up.y;
    listener.upZ.value = up.z;
    return;
  }

  listener.setPosition?.(position.x, position.y, position.z);
  listener.setOrientation?.(forward.x, forward.y, forward.z, up.x, up.y, up.z);
}

/**
 * Stop a sound handle returned by `playSFX(...)` or `playSFXAtPosition(...)`.
 *
 * Repeated stops are safe and do nothing after the first cleanup.
 */
export function stopSound(handle: AudioSourceHandle): void {
  const state = handleStates.get(handle);
  if (!state || state.cleaned) {
    return;
  }

  try {
    handle.source.stop(0);
  } catch {
    // Some browsers throw if the source has already ended. Cleanup still
    // needs to run so the handle disconnects cleanly.
  }

  state.cleanup();
}

/**
 * Set the master output volume for every Arcane Engine audio channel.
 */
export function setMasterVolume(audioCtx: AudioContext, volume: number): void {
  const state = getAudioContextState(audioCtx);
  assertAudioContextActive(state, 'setMasterVolume');
  audioCtx.masterGain.gain.value = clampVolume(volume);
}

/**
 * Set the SFX channel volume.
 */
export function setSFXVolume(audioCtx: AudioContext, volume: number): void {
  const state = getAudioContextState(audioCtx);
  assertAudioContextActive(state, 'setSFXVolume');
  audioCtx.sfxGain.gain.value = clampVolume(volume);
}

/**
 * Set the music channel volume.
 */
export function setMusicVolume(audioCtx: AudioContext, volume: number): void {
  const state = getAudioContextState(audioCtx);
  assertAudioContextActive(state, 'setMusicVolume');
  audioCtx.musicGain.gain.value = clampVolume(volume);
}

/**
 * Resume a suspended browser audio context after user interaction.
 *
 * Browsers often block audio autoplay until a click, tap, or key press. This
 * helper keeps one shared listener set per context and removes it once the
 * context is running.
 */
export function resumeAudioOnInteraction(audioCtx: AudioContext): Promise<void> {
  const state = getAudioContextState(audioCtx);
  assertAudioContextActive(state, 'resumeAudioOnInteraction');

  if (audioCtx.ctx.state === 'running') {
    return Promise.resolve();
  }

  if (state.resumePromise) {
    return state.resumePromise;
  }

  const eventTarget = resolveResumeEventTarget();

  state.resumePromise = new Promise<void>((resolve) => {
    state.resumeResolve = resolve;

    const cleanup = (): void => {
      state.clearResumeListeners?.();
      state.clearResumeListeners = null;
      state.resumeResolve = null;
      state.resumeReject = null;
      state.resumePromise = null;
    };

    const tryResume = async (): Promise<void> => {
      if (state.disposed) {
        cleanup();
        resolve();
        return;
      }

      try {
        await audioCtx.ctx.resume();
      } catch {
        return;
      }

      if (audioCtx.ctx.state === 'running') {
        cleanup();
        resolve();
      }
    };

    for (const eventName of RESUME_EVENTS) {
      eventTarget.addEventListener(eventName, tryResume as EventListener);
    }

    state.clearResumeListeners = () => {
      for (const eventName of RESUME_EVENTS) {
        eventTarget.removeEventListener(eventName, tryResume as EventListener);
      }
    };

    void tryResume();
  });

  return state.resumePromise;
}

/**
 * Stop active playback, disconnect the mixer graph, clear loaded sounds, and
 * close the underlying Web Audio context.
 */
export async function disposeAudioContext(audioCtx: AudioContext): Promise<void> {
  const state = getAudioContextState(audioCtx);
  if (state.disposed) {
    return;
  }

  state.disposed = true;
  state.clearResumeListeners?.();
  state.clearResumeListeners = null;
  state.resumeResolve?.();
  state.resumeResolve = null;
  state.resumeReject = null;
  state.resumePromise = null;
  state.loading.clear();
  state.currentMusic = null;

  for (const handle of Array.from(state.activeHandles)) {
    stopSound(handle);
  }

  for (const handle of Array.from(state.activeMusicHandles)) {
    stopManagedMusicHandle(handle);
  }

  audioCtx.loaded.clear();
  safelyDisconnectNode(audioCtx.sfxGain);
  safelyDisconnectNode(audioCtx.musicGain);
  safelyDisconnectNode(audioCtx.masterGain);

  if (audioCtx.ctx.state !== 'closed') {
    await audioCtx.ctx.close();
  }
}

function createAudioSourceHandle(
  audioCtx: AudioContext,
  id: string,
  options: PlaySFXOptions,
  destination: AudioNode,
  panner?: PannerNode,
): AudioSourceHandle {
  const state = getAudioContextState(audioCtx);
  const buffer = getLoadedSoundBuffer(audioCtx, id, panner ? 'playSFXAtPosition' : 'playSFX');
  const source = audioCtx.ctx.createBufferSource();
  const gain = audioCtx.ctx.createGain();
  source.buffer = buffer;
  source.loop = options.loop ?? false;
  source.playbackRate.value = normalizePitch(options.pitch);
  gain.gain.value = clampVolume(options.volume ?? 1);

  source.connect(gain);
  gain.connect(destination);

  const handle: AudioSourceHandle = {
    kind: 'arcane-audio-source-handle',
    id,
    source,
    gain,
    panner,
    stopped: false,
  };

  const handleState = createManagedHandleState(() => {
    handle.stopped = true;
    state.activeHandles.delete(handle);
    source.onended = null;
    safelyDisconnectNode(source);
    safelyDisconnectNode(gain);
    if (panner) {
      safelyDisconnectNode(panner);
    }
  });

  handleStates.set(handle, handleState);
  state.activeHandles.add(handle);
  source.onended = () => {
    handleState.cleanup();
  };
  source.start(0);

  return handle;
}

function createMusicHandle(
  audioCtx: AudioContext,
  id: string,
  options: PlayMusicOptions,
): MusicHandle {
  const state = getAudioContextState(audioCtx);
  const buffer = getLoadedSoundBuffer(audioCtx, id, 'playMusic');
  const source = audioCtx.ctx.createBufferSource();
  const gain = audioCtx.ctx.createGain();
  const targetVolume = clampVolume(options.volume ?? 1);
  const fadeInDuration = normalizeDuration(options.fadeInDuration, DEFAULT_MUSIC_FADE_SECONDS);
  const now = getCurrentTime(audioCtx.ctx);

  source.buffer = buffer;
  source.loop = options.loop ?? true;
  source.connect(gain);
  gain.connect(audioCtx.musicGain);
  gain.gain.value = 0;

  const handle: MusicHandle = {
    kind: 'arcane-music-handle',
    id,
    source,
    gain,
    stopped: false,
  };

  const handleState = createManagedHandleState(() => {
    handle.stopped = true;
    const currentState = getAudioContextState(audioCtx);
    currentState.activeMusicHandles.delete(handle);
    if (currentState.currentMusic === handle) {
      currentState.currentMusic = null;
    }
    source.onended = null;
    safelyDisconnectNode(source);
    safelyDisconnectNode(gain);
  });

  musicHandleStates.set(handle, handleState);
  state.activeMusicHandles.add(handle);
  source.onended = () => {
    handleState.cleanup();
  };

  rampAudioParam(gain.gain, 0, targetVolume, now, fadeInDuration);
  source.start(0);

  return handle;
}

function fadeOutAndStopMusicHandle(
  audioCtx: AudioContext,
  handle: MusicHandle,
  fadeOutDuration: number,
): void {
  const state = musicHandleStates.get(handle);
  if (!state || state.cleaned) {
    return;
  }

  const now = getCurrentTime(audioCtx.ctx);
  rampAudioParam(handle.gain.gain, handle.gain.gain.value, 0, now, fadeOutDuration);

  try {
    handle.source.stop(now + fadeOutDuration);
  } catch {
    // Ignore already-stopped or ended sources. Cleanup still runs below.
  }

  scheduleCleanup(state, fadeOutDuration);
}

function stopManagedMusicHandle(handle: MusicHandle): void {
  const state = musicHandleStates.get(handle);
  if (!state || state.cleaned) {
    return;
  }

  try {
    handle.source.stop(0);
  } catch {
    // Ignore already-stopped or ended sources.
  }

  state.cleanup();
}

function createManagedHandleState(cleanupImpl: () => void): ManagedHandleState {
  const state: ManagedHandleState = {
    cleaned: false,
    cleanupTimer: null,
    cleanup: () => {
      if (state.cleaned) {
        return;
      }

      state.cleaned = true;

      if (state.cleanupTimer !== null) {
        clearTimeout(state.cleanupTimer);
        state.cleanupTimer = null;
      }

      cleanupImpl();
    },
  };

  return state;
}

function scheduleCleanup(state: ManagedHandleState, delaySeconds: number): void {
  if (state.cleanupTimer !== null) {
    clearTimeout(state.cleanupTimer);
    state.cleanupTimer = null;
  }

  if (delaySeconds <= 0) {
    state.cleanup();
    return;
  }

  state.cleanupTimer = setTimeout(() => {
    state.cleanup();
  }, Math.max(1, Math.ceil(delaySeconds * 1000) + 10));
}

function getLoadedSoundBuffer(
  audioCtx: AudioContext,
  id: string,
  consumer: 'playMusic' | 'playSFX' | 'playSFXAtPosition',
): AudioBuffer {
  const buffer = audioCtx.loaded.get(id);
  if (!buffer) {
    throw new Error(`${consumer}: sound "${id}" has not been loaded`);
  }

  return buffer;
}

function readWorldPosition(camera: AudioListenerCameraLike): Vector3Like {
  const target = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
  return camera.getWorldPosition?.(target) ?? target;
}

function readForwardDirection(camera: AudioListenerCameraLike): Vector3Like {
  const target = { x: 0, y: 0, z: -1 };
  return camera.getWorldDirection?.(target) ?? target;
}

function setPannerPosition(panner: PannerNode, position: Vector3Like): void {
  if (panner.positionX && panner.positionY && panner.positionZ) {
    panner.positionX.value = position.x;
    panner.positionY.value = position.y;
    panner.positionZ.value = position.z;
    return;
  }

  panner.setPosition?.(position.x, position.y, position.z);
}

function rampAudioParam(
  param: AudioParamLike,
  from: number,
  to: number,
  startTime: number,
  duration: number,
): void {
  const clampedFrom = clampVolume(from);
  const clampedTo = clampVolume(to);

  param.cancelScheduledValues?.(startTime);
  param.setValueAtTime?.(clampedFrom, startTime);

  if (duration > 0 && param.linearRampToValueAtTime) {
    param.linearRampToValueAtTime(clampedTo, startTime + duration);
  } else {
    param.setValueAtTime?.(clampedTo, startTime);
    param.value = clampedTo;
  }

  if (!param.setValueAtTime && !param.linearRampToValueAtTime) {
    param.value = clampedTo;
  }
}

function getCurrentTime(ctx: globalThis.AudioContext): number {
  return typeof ctx.currentTime === 'number' ? ctx.currentTime : 0;
}

function normalizeVector(vector: Vector3Like, fallback: Vector3Like): Vector3Like {
  const length = Math.hypot(vector.x, vector.y, vector.z);
  if (length <= Number.EPSILON) {
    return { ...fallback };
  }

  return {
    x: vector.x / length,
    y: vector.y / length,
    z: vector.z / length,
  };
}

function resolveAudioContextConstructor(): WebAudioContextConstructor {
  const candidate = (
    globalThis as typeof globalThis & {
      webkitAudioContext?: WebAudioContextConstructor;
    }
  ).AudioContext ?? (
    globalThis as typeof globalThis & {
      webkitAudioContext?: WebAudioContextConstructor;
    }
  ).webkitAudioContext;

  if (!candidate) {
    throw new Error('createAudioContext: Web Audio API is not available in this environment');
  }

  return candidate;
}

function resolveResumeEventTarget(): Window {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    throw new Error(
      'resumeAudioOnInteraction: window event listeners are not available in this environment',
    );
  }

  return window;
}

function getAudioContextState(audioCtx: AudioContext): AudioContextState {
  const state = contextStates.get(audioCtx);
  if (!state || audioCtx.kind !== 'arcane-audio-context') {
    throw new Error('Arcane Engine audio context was not created by createAudioContext()');
  }
  return state;
}

function assertAudioContextActive(
  state: AudioContextState,
  consumer:
    | 'crossfadeMusic'
    | 'loadSound'
    | 'playMusic'
    | 'playSFX'
    | 'playSFXAtPosition'
    | 'resumeAudioOnInteraction'
    | 'setMasterVolume'
    | 'setMusicVolume'
    | 'setSFXVolume'
    | 'stopMusic'
    | 'updateAudioListener',
): void {
  if (state.disposed) {
    throw new Error(`${consumer}: audio context has already been disposed`);
  }
}

function clampVolume(volume: number): number {
  if (!Number.isFinite(volume)) {
    return 0;
  }

  return Math.min(1, Math.max(0, volume));
}

function normalizePitch(pitch: number | undefined): number {
  if (pitch === undefined || !Number.isFinite(pitch) || pitch <= 0) {
    return 1;
  }

  return pitch;
}

function normalizeDuration(duration: number | undefined, fallback: number): number {
  if (duration === undefined || !Number.isFinite(duration) || duration < 0) {
    return fallback;
  }

  return duration;
}

function sanitizePositiveDistance(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return fallback;
  }

  return value;
}

function sanitizeNonNegative(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value < 0) {
    return fallback;
  }

  return value;
}

function safelyDisconnectNode(node: { disconnect(): void }): void {
  try {
    node.disconnect();
  } catch {
    // Disconnecting an already-disconnected node is safe to ignore.
  }
}
