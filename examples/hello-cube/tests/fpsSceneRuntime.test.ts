import { createWorld, query } from '@arcane-engine/core';
import { describe, expect, it, beforeAll, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import type { WebGLRenderer } from 'three';
import { InputState } from '@arcane-engine/input';
import type { RendererContext } from '@arcane-engine/renderer';
import { initPhysics } from '@arcane-engine/physics';
import { setupSharedFpsScene } from '../src/fpsSceneRuntime.js';
import {
  clearGameContext,
  setGameContext,
} from '../src/runtime/gameContext.js';

beforeAll(async () => {
  await initPhysics();
});

afterEach(() => {
  clearGameContext();
  document.body.innerHTML = '';
  vi.useRealTimers();
});

function makeRendererContext(): RendererContext {
  return {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(60, 1, 0.1, 100),
    renderer: { domElement: document.createElement('canvas') } as WebGLRenderer,
  };
}

describe('setupSharedFpsScene', () => {
  it('sets up the shared FPS shell and disposes it cleanly', () => {
    vi.useFakeTimers();

    const world = createWorld();
    const ctx = makeRendererContext();
    setGameContext({
      ctx,
      config: { initialScene: 'fps-test' },
      getCurrentSceneName: () => 'fps-test',
    });

    const runtime = setupSharedFpsScene(world, {
      hintText: 'Test hint',
    });

    expect(query(world, [InputState])).toHaveLength(1);
    expect(document.getElementById('arcane-hud')).toBe(runtime.hud.root);
    expect(document.getElementById('arcane-muzzle-flash')).not.toBeNull();
    expect(runtime.buckets.sceneObjects.length).toBeGreaterThan(0);
    expect(runtime.buckets.geometries.length).toBeGreaterThan(0);
    expect(runtime.buckets.materials.length).toBeGreaterThan(0);

    runtime.triggerMuzzleFlash();
    const muzzle = document.getElementById('arcane-muzzle-flash') as HTMLDivElement;
    expect(muzzle.style.opacity).toBe('0.28');

    vi.advanceTimersByTime(80);
    expect(muzzle.style.opacity).toBe('0');

    runtime.dispose(world);

    expect(document.getElementById('arcane-hud')).toBeNull();
    expect(document.getElementById('arcane-muzzle-flash')).toBeNull();
    expect(runtime.buckets.sceneObjects).toHaveLength(0);
    expect(runtime.buckets.geometries).toHaveLength(0);
    expect(runtime.buckets.materials).toHaveLength(0);
  });
});
