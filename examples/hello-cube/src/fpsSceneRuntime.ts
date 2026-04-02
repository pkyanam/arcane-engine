import { getComponent, query } from '@arcane-engine/core';
import type { World } from '@arcane-engine/core';
import { createInputManager } from '@arcane-engine/input';
import { createPhysicsContext } from '@arcane-engine/physics';
import type { PhysicsContext } from '@arcane-engine/physics';
import { MeshRef } from '@arcane-engine/renderer';
import type { RendererContext } from '@arcane-engine/renderer';
import {
  spawnFpsArenaLights,
  spawnFpsArenaWorld,
  type FpsArenaBuckets,
} from './fpsArenaSetup.js';
import { createArcaneHud, createMuzzleLayer } from './fpsHud.js';
import type { FpsHudHandles } from './fpsHud.js';
import { getGameContext } from './runtime/gameContext.js';
import { requestSceneChange } from './runtime/sceneTransitions.js';

export interface SharedFpsSceneOptions {
  hintText: string;
  showMultiplayerStatus?: boolean;
  sceneEyebrow?: string;
  sceneTitle?: string;
  sceneSummary?: string;
  sceneBadges?: readonly string[];
}

export interface SharedFpsSceneRuntime {
  /** Renderer context for systems such as `fpsCameraSystem`, `healthSystem`, and `renderSystem`. */
  readonly ctx: RendererContext;
  /** Shared Rapier world for the active FPS scene. */
  readonly physicsCtx: PhysicsContext;
  /** Disposable geometries, materials, and lights owned by the FPS arena. */
  readonly buckets: FpsArenaBuckets;
  /** DOM nodes updated by `gameStateSystem`. */
  readonly hud: { root: HTMLDivElement; handles: FpsHudHandles };
  /** Show the one-frame full-screen white flash used for muzzle feedback. */
  triggerMuzzleFlash(): void;
  /** Remove DOM, mesh, and arena resources created by `setupSharedFpsScene(...)`. */
  dispose(world: World): void;
}

/**
 * Shared setup/teardown shell for the local FPS scenes in `hello-cube`.
 *
 * Stage 18 keeps this example-local on purpose: both `fps-test` and
 * `multiplayer` benefit, but the repo still does not have a second
 * non-example consumer that justifies a shipped `packages/gameplay` API.
 */
export function setupSharedFpsScene(
  world: World,
  options: SharedFpsSceneOptions,
): SharedFpsSceneRuntime {
  const { ctx } = getGameContext();
  const physicsCtx = createPhysicsContext();
  const inputHandle = createInputManager(world, ctx.renderer.domElement);
  const buckets: FpsArenaBuckets = { geometries: [], materials: [], sceneObjects: [] };

  spawnFpsArenaLights(ctx, buckets.sceneObjects);
  spawnFpsArenaWorld(world, ctx, buckets);

  ctx.camera.position.set(0, 3.7, 0);
  ctx.camera.rotation.set(0, 0, 0, 'YXZ');

  const escListener = (event: KeyboardEvent): void => {
    if (event.code === 'Escape') {
      requestSceneChange('title');
    }
  };
  window.addEventListener('keydown', escListener);

  const hud = createArcaneHud(options.hintText, {
    showMultiplayerStatus: options.showMultiplayerStatus,
    sceneEyebrow: options.sceneEyebrow,
    sceneTitle: options.sceneTitle,
    sceneSummary: options.sceneSummary,
    sceneBadges: options.sceneBadges,
  });
  document.body.appendChild(hud.root);

  const muzzleLayer = createMuzzleLayer();
  document.body.appendChild(muzzleLayer);

  let muzzleTimeout: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  return {
    ctx,
    physicsCtx,
    buckets,
    hud,
    triggerMuzzleFlash(): void {
      if (muzzleTimeout !== undefined) {
        clearTimeout(muzzleTimeout);
        muzzleTimeout = undefined;
      }
      muzzleLayer.style.opacity = '0.28';
      muzzleTimeout = setTimeout(() => {
        muzzleLayer.style.opacity = '0';
        muzzleTimeout = undefined;
      }, 80);
    },
    dispose(sceneWorld: World): void {
      if (disposed) return;
      disposed = true;

      document.exitPointerLock?.();
      window.removeEventListener('keydown', escListener);
      inputHandle.dispose();
      hud.root.remove();

      if (muzzleTimeout !== undefined) {
        clearTimeout(muzzleTimeout);
        muzzleTimeout = undefined;
      }
      muzzleLayer.remove();

      for (const entity of query(sceneWorld, [MeshRef])) {
        const meshRef = getComponent(sceneWorld, entity, MeshRef);
        if (meshRef?.mesh) {
          ctx.scene.remove(meshRef.mesh);
        }
      }

      for (const geometry of buckets.geometries) {
        geometry.dispose();
      }
      buckets.geometries.length = 0;

      for (const material of buckets.materials) {
        material.dispose();
      }
      buckets.materials.length = 0;

      for (const object of buckets.sceneObjects) {
        ctx.scene.remove(object);
      }
      buckets.sceneObjects.length = 0;
    },
  };
}
