import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { createWorld, hasComponent, getComponent } from '@arcane-engine/core';
import { spawnMesh } from '../src/spawnMesh.js';
import { Position, Rotation, Scale, MeshRef } from '../src/components.js';
import type { RendererContext } from '../src/renderer.js';

function makeMockCtx(): RendererContext {
  return {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(),
    renderer: { render: vi.fn() } as unknown as THREE.WebGLRenderer,
  };
}

describe('spawnMesh', () => {
  it('creates an entity with Position, Rotation, Scale, and MeshRef', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    const entity = spawnMesh(world, ctx, new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());

    expect(hasComponent(world, entity, Position)).toBe(true);
    expect(hasComponent(world, entity, Rotation)).toBe(true);
    expect(hasComponent(world, entity, Scale)).toBe(true);
    expect(hasComponent(world, entity, MeshRef)).toBe(true);
  });

  it('sets initial position from the position argument', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    const entity = spawnMesh(
      world,
      ctx,
      new THREE.BoxGeometry(),
      new THREE.MeshBasicMaterial(),
      { x: 3, y: 4, z: 5 },
    );

    const pos = getComponent(world, entity, Position)!;
    expect(pos.x).toBe(3);
    expect(pos.y).toBe(4);
    expect(pos.z).toBe(5);
  });

  it('uses default position { 0, 0, 0 } when none is provided', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    const entity = spawnMesh(world, ctx, new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());

    const pos = getComponent(world, entity, Position)!;
    expect(pos.x).toBe(0);
    expect(pos.y).toBe(0);
    expect(pos.z).toBe(0);
  });

  it('adds the mesh to ctx.scene', () => {
    const world = createWorld();
    const ctx = makeMockCtx();

    expect(ctx.scene.children).toHaveLength(0);
    spawnMesh(world, ctx, new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
    expect(ctx.scene.children).toHaveLength(1);
  });

  it('MeshRef.mesh is a THREE.Mesh instance', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    const entity = spawnMesh(world, ctx, new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());

    const meshRef = getComponent(world, entity, MeshRef)!;
    expect(meshRef.mesh).toBeInstanceOf(THREE.Mesh);
  });

  it('returns a valid entity ID that exists in the world', () => {
    const world = createWorld();
    const ctx = makeMockCtx();
    const entity = spawnMesh(world, ctx, new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());

    expect(world.entities.has(entity)).toBe(true);
  });
});
