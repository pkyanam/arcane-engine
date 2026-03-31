import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { RendererContext } from '../src/renderer.js';

interface MockRenderer {
  setSize: ReturnType<typeof vi.fn>;
  setPixelRatio: ReturnType<typeof vi.fn>;
  setClearColor: ReturnType<typeof vi.fn>;
  render: ReturnType<typeof vi.fn>;
  domElement: HTMLCanvasElement;
  shadowMap: {
    enabled: boolean;
    type: THREE.ShadowMapType;
  };
  outputColorSpace: THREE.ColorSpace;
}

function makeMockRenderer(canvas?: HTMLCanvasElement): MockRenderer {
  return {
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    setClearColor: vi.fn(),
    render: vi.fn(),
    domElement: canvas ?? document.createElement('canvas'),
    shadowMap: {
      enabled: false,
      type: THREE.BasicShadowMap,
    },
    outputColorSpace: THREE.NoColorSpace,
  };
}

// Mock WebGLRenderer before importing helpers so tests never touch WebGL.
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof THREE>();
  return {
    ...actual,
    WebGLRenderer: vi.fn().mockImplementation((params?: { canvas?: HTMLCanvasElement }) => (
      makeMockRenderer(params?.canvas)
    )),
  };
});

const {
  createRenderer,
  addEnvironmentLighting,
  addDirectionalShadowLight,
} = await import('../src/renderer.js');

function getMockRenderer(ctx: RendererContext): MockRenderer {
  return ctx.renderer as unknown as MockRenderer;
}

describe('createRenderer', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.clearAllMocks();

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1280,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 720,
    });
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 3,
    });
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
    const ctx = createRenderer();

    expect(document.body.children).toHaveLength(1);
    expect(document.body.firstElementChild).toBe(getMockRenderer(ctx).domElement);
  });

  it('does not append to document.body when a canvas is provided', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const ctx = createRenderer(canvas);

    expect(document.body.children).toHaveLength(0);
    expect(getMockRenderer(ctx).domElement).toBe(canvas);
  });

  it('uses modern renderer defaults for output color space and pixel ratio', () => {
    const ctx = createRenderer();
    const renderer = getMockRenderer(ctx);

    expect(renderer.outputColorSpace).toBe(THREE.SRGBColorSpace);
    expect(renderer.setPixelRatio).toHaveBeenCalledWith(2);
  });

  it('applies clear color, scene background, and shadow map options', () => {
    const ctx = createRenderer({
      clearColor: 0x0f172a,
      background: 0x020617,
      shadowMap: true,
    });
    const renderer = getMockRenderer(ctx);

    expect(renderer.setClearColor).toHaveBeenCalledWith(0x0f172a);
    expect(renderer.shadowMap.enabled).toBe(true);
    expect(renderer.shadowMap.type).toBe(THREE.PCFSoftShadowMap);
    expect(ctx.scene.background).toBeInstanceOf(THREE.Color);
    expect((ctx.scene.background as THREE.Color).getHex()).toBe(0x020617);
  });

  it('sizes auto-created canvases from the viewport and reacts to window resize', () => {
    const ctx = createRenderer();
    const renderer = getMockRenderer(ctx);

    expect(renderer.setSize).toHaveBeenCalledWith(1280, 720, true);

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1440,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 900,
    });

    window.dispatchEvent(new Event('resize'));

    expect(renderer.setSize).toHaveBeenLastCalledWith(1440, 900, true);
    expect(ctx.camera.aspect).toBe(1440 / 900);
  });

  it('sizes provided canvases from the element and reacts to resize events', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;

    const ctx = createRenderer(canvas);
    const renderer = getMockRenderer(ctx);

    expect(renderer.setSize).toHaveBeenCalledWith(800, 600, false);

    canvas.width = 960;
    canvas.height = 540;
    window.dispatchEvent(new Event('resize'));

    expect(renderer.setSize).toHaveBeenLastCalledWith(960, 540, false);
    expect(ctx.camera.aspect).toBeCloseTo(960 / 540);
  });
});

describe('addEnvironmentLighting', () => {
  it('adds an ambient and hemisphere light and can apply a background', () => {
    const ctx = {
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(),
      renderer: makeMockRenderer() as unknown as THREE.WebGLRenderer,
    };

    const [ambient, hemisphere] = addEnvironmentLighting(ctx, {
      background: 0x0b1120,
    });

    expect(ambient).toBeInstanceOf(THREE.AmbientLight);
    expect(hemisphere).toBeInstanceOf(THREE.HemisphereLight);
    expect(ctx.scene.children).toContain(ambient);
    expect(ctx.scene.children).toContain(hemisphere);
    expect((ctx.scene.background as THREE.Color).getHex()).toBe(0x0b1120);
  });
});

describe('addDirectionalShadowLight', () => {
  it('adds a shadow-ready directional light and enables renderer shadows', () => {
    const renderer = makeMockRenderer();
    const ctx = {
      scene: new THREE.Scene(),
      camera: new THREE.PerspectiveCamera(),
      renderer: renderer as unknown as THREE.WebGLRenderer,
    };

    const rig = addDirectionalShadowLight(ctx, {
      position: { x: 4, y: 6, z: 8 },
      target: { x: 1, y: 0, z: -2 },
      mapSize: 1024,
      shadowCameraExtent: 9,
    });

    expect(rig.light).toBeInstanceOf(THREE.DirectionalLight);
    expect(ctx.scene.children).toContain(rig.light);
    expect(ctx.scene.children).toContain(rig.target);
    expect(renderer.shadowMap.enabled).toBe(true);
    expect(renderer.shadowMap.type).toBe(THREE.PCFSoftShadowMap);
    expect(rig.light.position.toArray()).toEqual([4, 6, 8]);
    expect(rig.target.position.toArray()).toEqual([1, 0, -2]);
    expect(rig.light.shadow.mapSize.x).toBe(1024);
    expect(rig.light.shadow.camera.left).toBe(-9);
    expect(rig.light.shadow.camera.right).toBe(9);
  });
});
