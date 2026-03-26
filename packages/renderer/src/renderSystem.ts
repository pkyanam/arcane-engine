import { query, getComponent } from '@arcane-engine/core';
import type { SystemFn, World } from '@arcane-engine/core';
import type { RendererContext } from './renderer.js';
import { Position, Rotation, Scale, MeshRef } from './components.js';

/**
 * Returns a SystemFn that syncs ECS transform components to Three.js meshes
 * and then submits a render call.
 *
 * Usage:
 *   registerSystem(world, renderSystem(ctx));
 */
export const renderSystem = (ctx: RendererContext): SystemFn =>
  (world: World, _dt: number): void => {
    for (const entity of query(world, [Position, MeshRef])) {
      const pos = getComponent(world, entity, Position)!;
      const meshRef = getComponent(world, entity, MeshRef)!;

      if (!meshRef.mesh) continue;

      meshRef.mesh.position.set(pos.x, pos.y, pos.z);

      const rot = getComponent(world, entity, Rotation);
      if (rot) {
        meshRef.mesh.rotation.set(rot.x, rot.y, rot.z);
      }

      const scale = getComponent(world, entity, Scale);
      if (scale) {
        meshRef.mesh.scale.set(scale.x, scale.y, scale.z);
      }
    }

    ctx.renderer.render(ctx.scene, ctx.camera);
  };
