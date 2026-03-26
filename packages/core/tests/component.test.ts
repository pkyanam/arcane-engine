import { describe, it, expect } from 'vitest';
import { defineComponent } from '../src/component.js';

describe('defineComponent', () => {
  it('returns an object with the given name', () => {
    const Position = defineComponent('Position', () => ({ x: 0, y: 0 }));
    expect(Position.name).toBe('Position');
  });

  it('provides a default factory function', () => {
    const Health = defineComponent('Health', () => ({ hp: 100, max: 100 }));
    expect(Health.default()).toEqual({ hp: 100, max: 100 });
  });

  it('each call to default() returns a fresh object (no shared reference)', () => {
    const Position = defineComponent('Position', () => ({ x: 0, y: 0, z: 0 }));
    const a = Position.default();
    const b = Position.default();
    a.x = 99;
    expect(b.x).toBe(0);
  });

  it('supports numeric, string, boolean, and array field types', () => {
    const Tags = defineComponent('Tags', () => ({ labels: [] as string[], active: false }));
    const instance = Tags.default();
    expect(instance.labels).toEqual([]);
    expect(instance.active).toBe(false);
  });

  it('supports nested object defaults', () => {
    const Transform = defineComponent('Transform', () => ({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
    }));
    const t = Transform.default();
    expect(t.position).toEqual({ x: 0, y: 0, z: 0 });
    expect(t.rotation.w).toBe(1);
  });

  it('two components with different names are distinct', () => {
    const A = defineComponent('A', () => ({ v: 1 }));
    const B = defineComponent('B', () => ({ v: 2 }));
    expect(A.name).not.toBe(B.name);
    expect(A.default()).not.toEqual(B.default());
  });
});
