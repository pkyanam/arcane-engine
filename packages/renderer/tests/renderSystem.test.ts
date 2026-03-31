import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { createWorld, createEntity, addComponent } from '@arcane-engine/core';
import { renderSystem } from '../src/renderSystem.js';
import { Position, Rotation, Scale, MeshRef } from '../src/components.js';
import type { RendererContext } from '../src/renderer.js';

function makeMockCtx(): RendererContext {
  return {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    renderer: { render: vi.fn() } as unknown as THREE.WebGLRenderer,
  };
}

describe('renderSystem', () => {
  it('syncs Position to mesh.position', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    const system = renderSystem(ctx);

    const entity = createEntity(world);
    const mesh = new THREE.Mesh();
    addComponent(world, entity, Position, { x: 1, y: 2, z: 3 });
    addComponent(world, entity, MeshRef, { mesh });

    system(world, 0);

    expect(mesh.position.x).toBe(1);
    expect(mesh.position.y).toBe(2);
    expect(mesh.position.z).toBe(3);
  });

  it('syncs Rotation to mesh.rotation', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    const system = renderSystem(ctx);

    const entity = createEntity(world);
    const mesh = new THREE.Mesh();
    addComponent(world, entity, Position);
    addComponent(world, entity, Rotation, { x: Math.PI / 2, y: Math.PI / 4, z: 0 });
    addComponent(world, entity, MeshRef, { mesh });

    system(world, 0);

    expect(mesh.rotation.x).toBeCloseTo(Math.PI / 2);
    expect(mesh.rotation.y).toBeCloseTo(Math.PI / 4);
    expect(mesh.rotation.z).toBeCloseTo(0);
  });

  it('syncs Scale to mesh.scale', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    const system = renderSystem(ctx);

    const entity = createEntity(world);
    const mesh = new THREE.Mesh();
    addComponent(world, entity, Position);
    addComponent(world, entity, Scale, { x: 2, y: 3, z: 0.5 });
    addComponent(world, entity, MeshRef, { mesh });

    system(world, 0);

    expect(mesh.scale.x).toBe(2);
    expect(mesh.scale.y).toBe(3);
    expect(mesh.scale.z).toBe(0.5);
  });

  it('syncs transforms for model root groups as well as meshes', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    const system = renderSystem(ctx);

    const entity = createEntity(world);
    const root = new THREE.Group();
    addComponent(world, entity, Position, { x: -2, y: 4, z: 6 });
    addComponent(world, entity, Rotation, { x: 0.1, y: 0.2, z: 0.3 });
    addComponent(world, entity, Scale, { x: 1.5, y: 2, z: 0.75 });
    addComponent(world, entity, MeshRef, { mesh: root });

    system(world, 0);

    expect(root.position.toArray()).toEqual([-2, 4, 6]);
    expect(root.rotation.x).toBeCloseTo(0.1);
    expect(root.rotation.y).toBeCloseTo(0.2);
    expect(root.rotation.z).toBeCloseTo(0.3);
    expect(root.scale.toArray()).toEqual([1.5, 2, 0.75]);
  });

  it('calls ctx.renderer.render with scene and camera', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    const system = renderSystem(ctx);

    system(world, 0);

    expect(ctx.renderer.render).toHaveBeenCalledTimes(1);
    expect(ctx.renderer.render).toHaveBeenCalledWith(ctx.scene, ctx.camera);
  });

  it('skips entities where meshRef.mesh is null', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    const system = renderSystem(ctx);

    const entity = createEntity(world);
    addComponent(world, entity, Position, { x: 5, y: 5, z: 5 });
    addComponent(world, entity, MeshRef, { mesh: null });

    expect(() => system(world, 0)).not.toThrow();
  });

  it('does not sync entities that lack MeshRef', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    const system = renderSystem(ctx);

    const entity = createEntity(world);
    addComponent(world, entity, Position, { x: 1, y: 2, z: 3 });
    // No MeshRef added — should not appear in query results

    expect(() => system(world, 0)).not.toThrow();
    // render is still called once
    expect(ctx.renderer.render).toHaveBeenCalledTimes(1);
  });
});
