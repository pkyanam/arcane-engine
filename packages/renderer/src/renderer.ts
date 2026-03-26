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
 * Create a Three.js renderer wired to a scene and camera.
 *
 * If no canvas is supplied, a full-window canvas is created and appended to
 * `document.body`, and a resize listener keeps it sized to the viewport.
 */
export function createRenderer(canvas?: HTMLCanvasElement): RendererContext {
  const scene = new THREE.Scene();

  const w = canvas ? (canvas.width || 1) : window.innerWidth;
  const h = canvas ? (canvas.height || 1) : window.innerHeight;

  const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({ canvas });

  if (!canvas) {
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }

  return { scene, camera, renderer };
}
