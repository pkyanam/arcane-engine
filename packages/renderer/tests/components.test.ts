import { describe, it, expect } from 'vitest';
import { Position, Rotation, Scale, MeshRef, Spin } from '../src/components.js';

describe('Position', () => {
  it('has default { x: 0, y: 0, z: 0 }', () => {
    expect(Position.default()).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('returns a fresh object on each call', () => {
    const a = Position.default();
    const b = Position.default();
    expect(a).not.toBe(b);
    a.x = 99;
    expect(b.x).toBe(0);
  });
});

describe('Rotation', () => {
  it('has default { x: 0, y: 0, z: 0 }', () => {
    expect(Rotation.default()).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('returns a fresh object on each call', () => {
    const a = Rotation.default();
    const b = Rotation.default();
    expect(a).not.toBe(b);
  });
});

describe('Scale', () => {
  it('has default { x: 1, y: 1, z: 1 }', () => {
    expect(Scale.default()).toEqual({ x: 1, y: 1, z: 1 });
  });

  it('returns a fresh object on each call', () => {
    const a = Scale.default();
    const b = Scale.default();
    expect(a).not.toBe(b);
  });
});

describe('MeshRef', () => {
  it('has default { mesh: null }', () => {
    expect(MeshRef.default()).toEqual({ mesh: null });
  });

  it('returns a fresh object on each call', () => {
    const a = MeshRef.default();
    const b = MeshRef.default();
    expect(a).not.toBe(b);
  });
});

describe('Spin', () => {
  it('has default { axis: "y", speed: 1 }', () => {
    expect(Spin.default()).toEqual({ axis: 'y', speed: 1 });
  });

  it('returns a fresh object on each call', () => {
    const a = Spin.default();
    const b = Spin.default();
    expect(a).not.toBe(b);
  });
});
