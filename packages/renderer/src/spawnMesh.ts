import { createEntity, addComponent } from '@arcane-engine/core';
import type { Entity, World } from '@arcane-engine/core';
import * as THREE from 'three';
import type { RendererContext } from './renderer.js';
import { Position, Rotation, Scale, MeshRef } from './components.js';

/**
 * Create an entity with Position / Rotation / Scale / MeshRef components,
 * add the mesh to the scene, and return the entity ID.
 */
export function spawnMesh(
  world: World,
  ctx: RendererContext,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position?: { x?: number; y?: number; z?: number },
): Entity {
  const entity = createEntity(world);
  const mesh = new THREE.Mesh(geometry, material);

  addComponent(world, entity, Position, position ?? {});
  addComponent(world, entity, Rotation);
  addComponent(world, entity, Scale);
  addComponent(world, entity, MeshRef, { mesh });

  ctx.scene.add(mesh);

  return entity;
}
