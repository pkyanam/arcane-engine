import { addComponent, createEntity, createWorld, defineComponent } from '@arcane-engine/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SpatialAudio,
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
  spatialAudioSystem,
  stopMusic,
  stopSound,
  updateAudioListener,
} from '../src/index.js';

const Position = defineComponent('Position', () => ({ x: 0, y: 0, z: 0 }));

class FakeAudioParam {
  value: number;
  readonly cancelScheduledValues = vi.fn();
  readonly setValueAtTime = vi.fn((next: number) => {
    this.value = next;
  });
  readonly linearRampToValueAtTime = vi.fn((next: number) => {
    this.value = next;
  });

  constructor(initialValue: number) {
    this.value = initialValue;
  }
}

class FakeGainNode {
  readonly gain = new FakeAudioParam(1);
  readonly connections: unknown[] = [];
  readonly connect = vi.fn((target: unknown) => {
    this.connections.push(target);
    return target;
  });
  readonly disconnect = vi.fn(() => {
    this.connections.length = 0;
  });
}

class FakePannerNode {
  readonly positionX = new FakeAudioParam(0);
  readonly positionY = new FakeAudioParam(0);
  readonly positionZ = new FakeAudioParam(0);
  panningModel: PanningModelType = 'equalpower';
  distanceModel: DistanceModelType = 'inverse';
  refDistance = 1;
  maxDistance = 10000;
  rolloffFactor = 1;
  readonly connections: unknown[] = [];
  readonly connect = vi.fn((target: unknown) => {
    this.connections.push(target);
    return target;
  });
  readonly disconnect = vi.fn(() => {
    this.connections.length = 0;
  });
  readonly setPosition = vi.fn((x: number, y: number, z: number) => {
    this.positionX.value = x;
    this.positionY.value = y;
    this.positionZ.value = z;
  });
}

class FakeAudioListener {
  readonly positionX = new FakeAudioParam(0);
  readonly positionY = new FakeAudioParam(0);
  readonly positionZ = new FakeAudioParam(0);
  readonly forwardX = new FakeAudioParam(0);
  readonly forwardY = new FakeAudioParam(0);
  readonly forwardZ = new FakeAudioParam(-1);
  readonly upX = new FakeAudioParam(0);
  readonly upY = new FakeAudioParam(1);
  readonly upZ = new FakeAudioParam(0);
  readonly setPosition = vi.fn((x: number, y: number, z: number) => {
    this.positionX.value = x;
    this.positionY.value = y;
    this.positionZ.value = z;
  });
  readonly setOrientation = vi.fn(
    (fx: number, fy: number, fz: number, ux: number, uy: number, uz: number) => {
      this.forwardX.value = fx;
      this.forwardY.value = fy;
      this.forwardZ.value = fz;
      this.upX.value = ux;
      this.upY.value = uy;
      this.upZ.value = uz;
    },
  );
}

class FakeAudioBufferSourceNode {
  buffer: AudioBuffer | null = null;
  loop = false;
  readonly playbackRate = { value: 1 };
  onended: ((event: Event) => void) | null = null;
  readonly connections: unknown[] = [];
  readonly connect = vi.fn((target: unknown) => {
    this.connections.push(target);
    return target;
  });
  readonly disconnect = vi.fn(() => {
    this.connections.length = 0;
  });
  readonly start = vi.fn();
  readonly stop = vi.fn(() => {
    this.onended?.(new Event('ended'));
  });

  endNaturally(): void {
    this.onended?.(new Event('ended'));
  }
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];

  state: AudioContextState = 'suspended';
  currentTime = 12;
  readonly destination = { kind: 'destination' } as unknown as AudioDestinationNode;
  readonly listener = new FakeAudioListener() as unknown as AudioListener;
  readonly gainNodes: FakeGainNode[] = [];
  readonly sourceNodes: FakeAudioBufferSourceNode[] = [];
  readonly pannerNodes: FakePannerNode[] = [];
  readonly decodedBuffers: ArrayBuffer[] = [];
  resumeBlocked = false;
  readonly close = vi.fn(async () => {
    this.state = 'closed';
  });
  readonly resume = vi.fn(async () => {
    if (this.resumeBlocked) {
      throw new Error('blocked');
    }
    this.state = 'running';
  });
  readonly decodeAudioData = vi.fn(async (data: ArrayBuffer) => {
    this.decodedBuffers.push(data);
    return {
      byteLength: data.byteLength,
      sampleRate: 44100,
    } as unknown as AudioBuffer;
  });

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createGain(): GainNode {
    const node = new FakeGainNode();
    this.gainNodes.push(node);
    return node as unknown as GainNode;
  }

  createBufferSource(): AudioBufferSourceNode {
    const node = new FakeAudioBufferSourceNode();
    this.sourceNodes.push(node);
    return node as unknown as AudioBufferSourceNode;
  }

  createPanner(): PannerNode {
    const node = new FakePannerNode();
    this.pannerNodes.push(node);
    return node as unknown as PannerNode;
  }
}

const originalAudioContext = globalThis.AudioContext;
const originalFetch = globalThis.fetch;

describe('@arcane-engine/audio', () => {
  beforeEach(() => {
    FakeAudioContext.instances.length = 0;
    Object.defineProperty(globalThis, 'AudioContext', {
      value: FakeAudioContext,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'fetch', {
      value: vi.fn(async () => ({
        ok: true,
        status: 200,
        arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
      })),
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'AudioContext', {
      value: originalAudioContext,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(globalThis, 'fetch', {
      value: originalFetch,
      configurable: true,
      writable: true,
    });
  });

  it('creates a mixer with default and clamped custom volumes', () => {
    const audio = createAudioContext({
      masterVolume: 2,
      sfxVolume: -1,
      musicVolume: 0.25,
    });
    const ctx = FakeAudioContext.instances[0]!;

    expect(audio.kind).toBe('arcane-audio-context');
    expect(ctx.gainNodes).toHaveLength(3);
    expect(audio.masterGain.gain.value).toBe(1);
    expect(audio.sfxGain.gain.value).toBe(0);
    expect(audio.musicGain.gain.value).toBe(0.25);
    expect((audio.sfxGain.connect as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(audio.masterGain);
    expect((audio.musicGain.connect as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(audio.masterGain);
    expect((audio.masterGain.connect as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(ctx.destination);
  });

  it('loads and caches one sound by id', async () => {
    const audio = createAudioContext();
    const fetcher = vi.mocked(globalThis.fetch);

    const first = await loadSound(audio, 'laser', '/sounds/laser.ogg');
    const second = await loadSound(audio, 'laser', '/sounds/laser-v2.ogg');
    const ctx = FakeAudioContext.instances[0]!;

    expect(first).toBe(second);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(ctx.decodeAudioData).toHaveBeenCalledTimes(1);
    expect(audio.loaded.get('laser')).toBe(first);
  });

  it('deduplicates concurrent loads and batch-loads a manifest', async () => {
    let resolveFetch:
      | ((value: {
          ok: boolean;
          status: number;
          arrayBuffer: () => Promise<ArrayBuffer>;
        }) => void)
      | undefined;

    Object.defineProperty(globalThis, 'fetch', {
      value: vi
        .fn()
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveFetch = resolve;
            }),
        )
        .mockImplementation(async () => ({
          ok: true,
          status: 200,
          arrayBuffer: async () => new Uint8Array([4, 5, 6]).buffer,
        })),
      configurable: true,
      writable: true,
    });

    const audio = createAudioContext();
    const pendingA = loadSound(audio, 'alarm', '/sounds/alarm.ogg');
    const pendingB = loadSound(audio, 'alarm', '/sounds/alarm.ogg');

    resolveFetch?.({
      ok: true,
      status: 200,
      arrayBuffer: async () => new Uint8Array([9, 9, 9]).buffer,
    });

    const [first, second] = await Promise.all([pendingA, pendingB]);
    const loaded = await loadSounds(audio, {
      alarm: '/sounds/alarm.ogg',
      chime: '/sounds/chime.wav',
    });

    expect(first).toBe(second);
    expect(loaded.alarm).toBe(first);
    expect(loaded.chime).toBe(audio.loaded.get('chime'));
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(2);
  });

  it('plays loaded SFX with per-playback options and stops safely', async () => {
    const audio = createAudioContext();
    await loadSound(audio, 'hit', '/sounds/hit.wav');

    const handle = playSFX(audio, 'hit', {
      volume: 0.4,
      pitch: 1.25,
      loop: true,
    });
    const ctx = FakeAudioContext.instances[0]!;
    const source = ctx.sourceNodes[0]!;

    expect(handle.id).toBe('hit');
    expect(handle.gain.gain.value).toBe(0.4);
    expect(handle.source.playbackRate.value).toBe(1.25);
    expect(handle.source.loop).toBe(true);
    expect((handle.source.start as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(0);
    expect((handle.gain.connect as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(audio.sfxGain);

    stopSound(handle);
    stopSound(handle);

    expect(handle.stopped).toBe(true);
    expect((source.stop as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
    expect((source.disconnect as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
  });

  it('plays positional SFX through a panner node', async () => {
    const audio = createAudioContext();
    await loadSound(audio, 'reactor', '/sounds/reactor.ogg');

    const handle = playSFXAtPosition(
      audio,
      'reactor',
      { x: 4, y: 2, z: -6 },
      {
        volume: 0.35,
        loop: true,
        maxDistance: 18,
        refDistance: 2,
        rolloffFactor: 0.75,
      },
    );
    const ctx = FakeAudioContext.instances[0]!;
    const panner = ctx.pannerNodes[0]!;

    expect(handle.panner).toBeDefined();
    expect(handle.gain.gain.value).toBe(0.35);
    expect(handle.source.loop).toBe(true);
    expect(panner.positionX.value).toBe(4);
    expect(panner.positionY.value).toBe(2);
    expect(panner.positionZ.value).toBe(-6);
    expect(panner.maxDistance).toBe(18);
    expect(panner.refDistance).toBe(2);
    expect(panner.rolloffFactor).toBe(0.75);
    expect(panner.panningModel).toBe('HRTF');
    expect((panner.connect as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(audio.sfxGain);
  });

  it('keeps entity-attached spatial audio in sync with ECS positions', async () => {
    const audio = createAudioContext();
    await loadSound(audio, 'hum', '/sounds/hum.ogg');

    const world = createWorld();
    const entity = createEntity(world);
    addComponent(world, entity, Position, { x: 1, y: 2, z: 3 });
    addComponent(world, entity, SpatialAudio, {
      soundId: 'hum',
      loop: true,
      playing: true,
      volume: 0.5,
      maxDistance: 30,
      refDistance: 1.5,
      rolloffFactor: 1.2,
    });

    const system = spatialAudioSystem(audio);
    system(world, 1 / 60);

    const ctx = FakeAudioContext.instances[0]!;
    const source = ctx.sourceNodes[0]!;
    const panner = ctx.pannerNodes[0]!;

    expect(ctx.sourceNodes).toHaveLength(1);
    expect(panner.positionX.value).toBe(1);
    expect(panner.positionY.value).toBe(2);
    expect(panner.positionZ.value).toBe(3);
    expect(panner.maxDistance).toBe(30);
    expect(panner.refDistance).toBe(1.5);
    expect(panner.rolloffFactor).toBe(1.2);

    const position = world.components.get('Position')!.get(entity) as { x: number; y: number; z: number };
    const spatial = world.components.get('SpatialAudio')!.get(entity) as { volume: number; playing: boolean };
    position.x = -2;
    position.y = 4;
    position.z = 8;
    spatial.volume = 0.2;
    system(world, 1 / 60);

    expect(ctx.sourceNodes).toHaveLength(1);
    expect(panner.positionX.value).toBe(-2);
    expect(panner.positionY.value).toBe(4);
    expect(panner.positionZ.value).toBe(8);
    expect(ctx.gainNodes[3]!.gain.value).toBe(0.2);

    spatial.playing = false;
    system(world, 1 / 60);

    expect((source.stop as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
  });

  it('updates the listener from camera position and orientation', () => {
    const audio = createAudioContext();
    const ctx = FakeAudioContext.instances[0]!;

    updateAudioListener(audio, {
      position: { x: 1, y: 1, z: 1 },
      up: { x: 0, y: 1, z: 0 },
      getWorldPosition(target) {
        target.x = 6;
        target.y = 3;
        target.z = -2;
        return target;
      },
      getWorldDirection(target) {
        target.x = 0;
        target.y = 0.5;
        target.z = -0.5;
        return target;
      },
    });

    const listener = ctx.listener as unknown as FakeAudioListener;
    expect(listener.positionX.value).toBe(6);
    expect(listener.positionY.value).toBe(3);
    expect(listener.positionZ.value).toBe(-2);
    expect(listener.forwardX.value).toBe(0);
    expect(listener.forwardY.value).toBeCloseTo(Math.SQRT1_2);
    expect(listener.forwardZ.value).toBeCloseTo(-Math.SQRT1_2);
    expect(listener.upY.value).toBe(1);
  });

  it('plays music on the music bus and fades it out cleanly', async () => {
    vi.useFakeTimers();

    const audio = createAudioContext();
    await loadSound(audio, 'bgm', '/sounds/bgm.ogg');

    const handle = playMusic(audio, 'bgm', {
      volume: 0.4,
      fadeInDuration: 0.25,
    });
    const ctx = FakeAudioContext.instances[0]!;
    const gain = ctx.gainNodes[3]!;

    expect(handle.kind).toBe('arcane-music-handle');
    expect((handle.gain.connect as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(audio.musicGain);
    expect(handle.source.loop).toBe(true);
    expect((gain.gain.linearRampToValueAtTime as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(0.4, 12.25);

    stopMusic(audio, { fadeOutDuration: 0.5 });

    expect((handle.source.stop as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(12.5);
    vi.advanceTimersByTime(600);
    expect(handle.stopped).toBe(true);
  });

  it('crossfades from one music track to another', async () => {
    const audio = createAudioContext();
    await loadSounds(audio, {
      calm: '/sounds/calm.ogg',
      danger: '/sounds/danger.ogg',
    });

    const first = playMusic(audio, 'calm', { fadeInDuration: 0 });
    crossfadeMusic(audio, 'danger', 1.2);

    const ctx = FakeAudioContext.instances[0]!;
    const second = ctx.sourceNodes[1]!;
    const secondGain = ctx.gainNodes[4]!;

    expect(ctx.sourceNodes).toHaveLength(2);
    expect((first.source.stop as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(13.2);
    expect(second.loop).toBe(true);
    expect((secondGain.gain.linearRampToValueAtTime as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(1, 13.2);
  });

  it('cleans up one-shot handles when they end naturally', async () => {
    const audio = createAudioContext();
    await loadSound(audio, 'click', '/sounds/click.mp3');

    const handle = playSFX(audio, 'click');
    const ctx = FakeAudioContext.instances[0]!;
    ctx.sourceNodes[0]!.endNaturally();

    expect(handle.stopped).toBe(true);
    expect((ctx.sourceNodes[0]!.disconnect as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
  });

  it('throws when trying to play a sound that has not been loaded', () => {
    const audio = createAudioContext();

    expect(() => playSFX(audio, 'missing')).toThrow('playSFX: sound "missing" has not been loaded');
    expect(() => playSFXAtPosition(audio, 'missing', { x: 0, y: 0, z: 0 })).toThrow(
      'playSFXAtPosition: sound "missing" has not been loaded',
    );
    expect(() => playMusic(audio, 'missing')).toThrow('playMusic: sound "missing" has not been loaded');
  });

  it('updates master, sfx, and music channel volumes independently', () => {
    const audio = createAudioContext();

    setMasterVolume(audio, 0.8);
    setSFXVolume(audio, 0.6);
    setMusicVolume(audio, 2);

    expect(audio.masterGain.gain.value).toBe(0.8);
    expect(audio.sfxGain.gain.value).toBe(0.6);
    expect(audio.musicGain.gain.value).toBe(1);
  });

  it('resumes audio on interaction without stacking duplicate listeners', async () => {
    const audio = createAudioContext();
    const ctx = FakeAudioContext.instances[0]!;
    ctx.resumeBlocked = true;

    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const first = resumeAudioOnInteraction(audio);
    const second = resumeAudioOnInteraction(audio);

    expect(first).toBe(second);
    expect(addSpy).toHaveBeenCalledTimes(4);

    ctx.resumeBlocked = false;
    window.dispatchEvent(new Event('click'));
    await first;

    expect(ctx.resume).toHaveBeenCalledTimes(2);
    expect(removeSpy).toHaveBeenCalledTimes(4);
  });

  it('stops active sfx, spatial sounds, music, clears cache, and closes on dispose', async () => {
    const audio = createAudioContext();
    const ctx = FakeAudioContext.instances[0]!;
    ctx.resumeBlocked = true;

    await loadSounds(audio, {
      loop: '/sounds/loop.ogg',
      reactor: '/sounds/reactor.ogg',
      bgm: '/sounds/bgm.ogg',
    });

    const loopHandle = playSFX(audio, 'loop', { loop: true });
    const spatialHandle = playSFXAtPosition(audio, 'reactor', { x: 2, y: 0, z: -4 }, { loop: true });
    const musicHandle = playMusic(audio, 'bgm', { fadeInDuration: 0 });
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const resumePromise = resumeAudioOnInteraction(audio);
    await disposeAudioContext(audio);
    await expect(resumePromise).resolves.toBeUndefined();

    expect(loopHandle.stopped).toBe(true);
    expect(spatialHandle.stopped).toBe(true);
    expect(musicHandle.stopped).toBe(true);
    expect(audio.loaded.size).toBe(0);
    expect((spatialHandle.panner!.disconnect as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
    expect((audio.masterGain.disconnect as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
    expect((audio.sfxGain.disconnect as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
    expect((audio.musicGain.disconnect as ReturnType<typeof vi.fn>)).toHaveBeenCalledTimes(1);
    expect(removeSpy).toHaveBeenCalledTimes(4);
    expect(ctx.close).toHaveBeenCalledTimes(1);
    await expect(loadSound(audio, 'after', '/sounds/after.wav')).rejects.toThrow(
      'loadSound: audio context has already been disposed',
    );
  });
});
