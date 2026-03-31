import * as THREE from 'three';

/**
 * Three.js objects shared by rendering-aware systems.
 */
export interface RendererContext {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
}

/**
 * Acceptable scene background values for renderer helpers.
 */
export type SceneBackground = THREE.ColorRepresentation | THREE.Texture | THREE.CubeTexture | null;

/**
 * Optional shadow-map settings for `createRenderer()`.
 */
export interface RendererShadowMapOptions {
  /**
   * Whether shadow mapping is enabled.
   *
   * Defaults to `false`.
   */
  enabled?: boolean;
  /**
   * Three.js shadow map type.
   *
   * Defaults to `THREE.PCFSoftShadowMap`.
   */
  type?: THREE.ShadowMapType;
}

/**
 * Options for `createRenderer()`.
 */
export interface RendererOptions {
  /**
   * Existing canvas to render into. If omitted, Arcane Engine creates a
   * full-window canvas and appends it to `document.body`.
   */
  canvas?: HTMLCanvasElement;
  /**
   * Clear color used when the scene does not have a background.
   */
  clearColor?: THREE.ColorRepresentation;
  /**
   * Optional scene background. Pass a color for a flat background, or a
   * texture/cubemap if a later stage provides one.
   */
  background?: SceneBackground;
  /**
   * Device-pixel-ratio cap passed to `renderer.setPixelRatio()`.
   *
   * Defaults to `2`.
   */
  maxPixelRatio?: number;
  /**
   * Shadow-map configuration. Pass `true` for the default soft shadow setup.
   */
  shadowMap?: boolean | RendererShadowMapOptions;
  /**
   * Renderer output color space.
   *
   * Defaults to `THREE.SRGBColorSpace`.
   */
  outputColorSpace?: THREE.ColorSpace;
}

/**
 * Small `{ x, y, z }` vector shape used by renderer helpers.
 */
export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

/**
 * Options for `addEnvironmentLighting()`.
 */
export interface EnvironmentLightingOptions {
  /**
   * Optional scene background to apply while adding the lights.
   */
  background?: SceneBackground;
  /**
   * Ambient light color. Keep this subtle so materials do not look flat.
   *
   * Defaults to white.
   */
  ambientColor?: THREE.ColorRepresentation;
  /**
   * Ambient light intensity.
   *
   * Defaults to `0.35`.
   */
  ambientIntensity?: number;
  /**
   * Hemisphere sky color.
   *
   * Defaults to a soft daylight blue.
   */
  skyColor?: THREE.ColorRepresentation;
  /**
   * Hemisphere ground bounce color.
   *
   * Defaults to a dark slate blue.
   */
  groundColor?: THREE.ColorRepresentation;
  /**
   * Hemisphere light intensity.
   *
   * Defaults to `1.15`.
   */
  hemisphereIntensity?: number;
}

/**
 * Options for `addDirectionalShadowLight()`.
 */
export interface DirectionalShadowLightOptions {
  /**
   * Light color.
   *
   * Defaults to white.
   */
  color?: THREE.ColorRepresentation;
  /**
   * Light intensity.
   *
   * Defaults to `2.4`.
   */
  intensity?: number;
  /**
   * World-space light position.
   *
   * Defaults to `{ x: 8, y: 12, z: 10 }`.
   */
  position?: Vector3Like;
  /**
   * World-space light target position.
   *
   * Defaults to the scene origin.
   */
  target?: Vector3Like;
  /**
   * Shadow map size in pixels.
   *
   * Defaults to `2048`.
   */
  mapSize?: number;
  /**
   * Half-width/height of the orthographic shadow camera.
   *
   * Defaults to `12`.
   */
  shadowCameraExtent?: number;
  /**
   * Near plane for the shadow camera.
   *
   * Defaults to `0.5`.
   */
  near?: number;
  /**
   * Far plane for the shadow camera.
   *
   * Defaults to `50`.
   */
  far?: number;
  /**
   * Depth bias applied to reduce acne.
   *
   * Defaults to `-0.0001`.
   */
  bias?: number;
  /**
   * Normal bias applied to reduce peter-panning on large surfaces.
   *
   * Defaults to `0.02`.
   */
  normalBias?: number;
}

/**
 * Return shape from `addDirectionalShadowLight()`.
 */
export interface DirectionalShadowLightRig {
  readonly light: THREE.DirectionalLight;
  readonly target: THREE.Object3D;
}

function isHtmlCanvasElement(value: unknown): value is HTMLCanvasElement {
  return typeof HTMLCanvasElement !== 'undefined' && value instanceof HTMLCanvasElement;
}

function getCanvasSize(canvas?: HTMLCanvasElement): { width: number; height: number } {
  if (!canvas) {
    return {
      width: Math.max(window.innerWidth, 1),
      height: Math.max(window.innerHeight, 1),
    };
  }

  const bounds = canvas.getBoundingClientRect();
  const width = Math.max(Math.round(bounds.width || canvas.clientWidth || canvas.width || 1), 1);
  const height = Math.max(Math.round(bounds.height || canvas.clientHeight || canvas.height || 1), 1);

  return { width, height };
}

function syncRendererSize(
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer,
  canvas?: HTMLCanvasElement,
): void {
  const { width, height } = getCanvasSize(canvas);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, !canvas);
}

function applySceneBackground(scene: THREE.Scene, background: SceneBackground | undefined): void {
  if (background === undefined) {
    return;
  }

  if (background === null) {
    scene.background = null;
    return;
  }

  if (background instanceof THREE.Texture || background instanceof THREE.CubeTexture) {
    scene.background = background;
    return;
  }

  scene.background = new THREE.Color(background);
}

/**
 * Create a Three.js renderer wired to a scene and camera.
 *
 * If no canvas is supplied, a full-window canvas is created and appended to
 * `document.body`. In either mode, Arcane Engine keeps the camera aspect and
 * draw buffer synced to the current canvas size.
 */
export function createRenderer(): RendererContext;
export function createRenderer(canvas: HTMLCanvasElement, options?: Omit<RendererOptions, 'canvas'>): RendererContext;
export function createRenderer(options: RendererOptions): RendererContext;
export function createRenderer(
  canvasOrOptions?: HTMLCanvasElement | RendererOptions,
  maybeOptions: Omit<RendererOptions, 'canvas'> = {},
): RendererContext {
  const options = isHtmlCanvasElement(canvasOrOptions)
    ? { ...maybeOptions, canvas: canvasOrOptions }
    : (canvasOrOptions ?? {});
  const { canvas } = options;
  const scene = new THREE.Scene();
  const { width, height } = getCanvasSize(canvas);

  const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.outputColorSpace = options.outputColorSpace ?? THREE.SRGBColorSpace;
  renderer.domElement.style.display = 'block';

  const maxPixelRatio = Math.max(options.maxPixelRatio ?? 2, 1);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));

  if (options.clearColor !== undefined) {
    renderer.setClearColor(options.clearColor);
  }

  applySceneBackground(scene, options.background);

  const shadowMap: RendererShadowMapOptions = options.shadowMap === true
    ? { enabled: true }
    : (options.shadowMap === false || options.shadowMap === undefined ? {} : options.shadowMap);
  renderer.shadowMap.enabled = shadowMap.enabled ?? false;
  renderer.shadowMap.type = shadowMap.type ?? THREE.PCFSoftShadowMap;

  syncRendererSize(camera, renderer, canvas);

  if (!canvas) {
    document.body.appendChild(renderer.domElement);
  }

  const handleResize = (): void => {
    syncRendererSize(camera, renderer, canvas);
  };
  window.addEventListener('resize', handleResize);

  return { scene, camera, renderer };
}

/**
 * Add a simple ambient + hemisphere lighting rig for physically based
 * materials, optionally applying a scene background at the same time.
 *
 * Recommended starting point:
 * - keep ambient light subtle (`0.2` to `0.4`)
 * - let hemisphere light do most of the soft fill (`0.9` to `1.4`)
 * - pair this with one directional key light for form and shadows
 */
export function addEnvironmentLighting(
  ctx: RendererContext,
  options: EnvironmentLightingOptions = {},
): readonly [THREE.AmbientLight, THREE.HemisphereLight] {
  applySceneBackground(ctx.scene, options.background);

  const ambient = new THREE.AmbientLight(
    options.ambientColor ?? 0xffffff,
    options.ambientIntensity ?? 0.35,
  );
  const hemisphere = new THREE.HemisphereLight(
    options.skyColor ?? 0xdbeafe,
    options.groundColor ?? 0x1e293b,
    options.hemisphereIntensity ?? 1.15,
  );

  ctx.scene.add(ambient);
  ctx.scene.add(hemisphere);

  return [ambient, hemisphere] as const;
}

/**
 * Add a directional light configured for common outdoor-style shadow use.
 *
 * This helper also enables the renderer's shadow map if it is currently off.
 * Meshes still need `castShadow = true` and/or `receiveShadow = true`.
 */
export function addDirectionalShadowLight(
  ctx: RendererContext,
  options: DirectionalShadowLightOptions = {},
): DirectionalShadowLightRig {
  const light = new THREE.DirectionalLight(
    options.color ?? 0xffffff,
    options.intensity ?? 2.4,
  );
  const position = options.position ?? { x: 8, y: 12, z: 10 };
  const targetPosition = options.target ?? { x: 0, y: 0, z: 0 };
  const shadowCameraExtent = options.shadowCameraExtent ?? 12;
  const shadowMapSize = options.mapSize ?? 2048;

  light.position.set(position.x, position.y, position.z);
  light.castShadow = true;
  light.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  light.shadow.camera.left = -shadowCameraExtent;
  light.shadow.camera.right = shadowCameraExtent;
  light.shadow.camera.top = shadowCameraExtent;
  light.shadow.camera.bottom = -shadowCameraExtent;
  light.shadow.camera.near = options.near ?? 0.5;
  light.shadow.camera.far = options.far ?? 50;
  light.shadow.bias = options.bias ?? -0.0001;
  light.shadow.normalBias = options.normalBias ?? 0.02;

  light.target.position.set(targetPosition.x, targetPosition.y, targetPosition.z);

  ctx.renderer.shadowMap.enabled = true;
  if (ctx.renderer.shadowMap.type === THREE.BasicShadowMap) {
    ctx.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  ctx.scene.add(light);
  ctx.scene.add(light.target);

  return {
    light,
    target: light.target,
  };
}
