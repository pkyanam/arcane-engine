import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as THREE from 'three';

// Mock WebGLRenderer before importing createRenderer so it never touches WebGL.
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof THREE>();
  return {
    ...actual,
    WebGLRenderer: vi.fn().mockImplementation(() => ({
      setSize: vi.fn(),
      render: vi.fn(),
      domElement: document.createElement('canvas'),
    })),
  };
});

// Import after mock is registered.
const { createRenderer } = await import('../src/renderer.js');

describe('createRenderer', () => {
  beforeEach(() => {
    // Clear any canvases appended to body between tests.
    document.body.innerHTML = '';
    vi.clearAllMocks();
  });

  it('returns an object with scene, camera, and renderer', () => {
    const ctx = createRenderer();
    expect(ctx.scene).toBeInstanceOf(THREE.Scene);
    expect(ctx.camera).toBeInstanceOf(THREE.PerspectiveCamera);
    expect(ctx.renderer).toBeDefined();
  });

  it('camera is positioned at z=5', () => {
    const ctx = createRenderer();
    expect(ctx.camera.position.z).toBe(5);
  });

  it('camera uses fov=75, near=0.1, far=1000', () => {
    const ctx = createRenderer();
    expect(ctx.camera.fov).toBe(75);
    expect(ctx.camera.near).toBe(0.1);
    expect(ctx.camera.far).toBe(1000);
  });

  it('appends a canvas to document.body when no canvas is provided', () => {
    createRenderer();
    expect(document.body.children.length).toBeGreaterThan(0);
  });

  it('does not append to document.body when a canvas is provided', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    createRenderer(canvas);
    expect(document.body.children.length).toBe(0);
  });
});
