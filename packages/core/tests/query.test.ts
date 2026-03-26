import { describe, it, expect, beforeEach } from 'vitest';
import { defineComponent } from '../src/component.js';
import {
  createWorld,
  createEntity,
  destroyEntity,
  addComponent,
  removeComponent,
} from '../src/world.js';
import type { World } from '../src/world.js';
import { query } from '../src/query.js';

const Position   = defineComponent('Position',   () => ({ x: 0, y: 0, z: 0 }));
const Velocity   = defineComponent('Velocity',   () => ({ vx: 0, vy: 0, vz: 0 }));
const Health     = defineComponent('Health',     () => ({ hp: 100 }));
const Renderable = defineComponent('Renderable', () => ({ mesh: 'cube' }));

let world: World;

beforeEach(() => {
  world = createWorld();
});

describe('query', () => {
  it('returns all live entities when called with an empty type list', () => {
    const a = createEntity(world);
    const b = createEntity(world);
    const result = query(world, []);
    expect(result).toContain(a);
    expect(result).toContain(b);
    expect(result).toHaveLength(2);
  });

  it('returns an empty array when no entities exist', () => {
    expect(query(world, [Position])).toEqual([]);
  });

  it('returns an empty array when component type was never added', () => {
    createEntity(world);
    expect(query(world, [Position])).toEqual([]);
  });

  it('returns entities with a single matching component', () => {
    const a = createEntity(world);
    const b = createEntity(world);
    addComponent(world, a, Position);
    const result = query(world, [Position]);
    expect(result).toContain(a);
    expect(result).not.toContain(b);
  });

  it('returns entities that have ALL requested components', () => {
    const a = createEntity(world); // has Position + Velocity
    const b = createEntity(world); // has Position only
    const c = createEntity(world); // has Velocity only
    addComponent(world, a, Position);
    addComponent(world, a, Velocity);
    addComponent(world, b, Position);
    addComponent(world, c, Velocity);

    const result = query(world, [Position, Velocity]);
    expect(result).toContain(a);
    expect(result).not.toContain(b);
    expect(result).not.toContain(c);
  });

  it('handles a three-component query correctly', () => {
    const full    = createEntity(world); // Position + Velocity + Health
    const partial = createEntity(world); // Position + Velocity only

    addComponent(world, full,    Position);
    addComponent(world, full,    Velocity);
    addComponent(world, full,    Health);
    addComponent(world, partial, Position);
    addComponent(world, partial, Velocity);

    const result = query(world, [Position, Velocity, Health]);
    expect(result).toContain(full);
    expect(result).not.toContain(partial);
  });

  it('excludes entities after removeComponent', () => {
    const e = createEntity(world);
    addComponent(world, e, Position);
    addComponent(world, e, Velocity);
    expect(query(world, [Position, Velocity])).toContain(e);

    removeComponent(world, e, Velocity);
    expect(query(world, [Position, Velocity])).not.toContain(e);
  });

  it('excludes entities after destroyEntity', () => {
    const a = createEntity(world);
    const b = createEntity(world);
    addComponent(world, a, Position);
    addComponent(world, b, Position);

    destroyEntity(world, a);
    const result = query(world, [Position]);
    expect(result).not.toContain(a);
    expect(result).toContain(b);
  });

  it('returns empty array if one component in query has no registered bit', () => {
    const e = createEntity(world);
    addComponent(world, e, Position);
    // Velocity has never been added to any entity, so has no bit
    const Never = defineComponent('NeverAdded', () => ({}));
    expect(query(world, [Position, Never])).toEqual([]);
  });

  it('returns an empty array when query matches no entities', () => {
    const e = createEntity(world);
    addComponent(world, e, Position);
    expect(query(world, [Health])).toEqual([]);
  });

  it('query result contains only entity IDs (numbers)', () => {
    const e = createEntity(world);
    addComponent(world, e, Position);
    const result = query(world, [Position]);
    for (const id of result) {
      expect(typeof id).toBe('number');
    }
  });

  it('works correctly with many component types (no bitmask overflow)', () => {
    // Register 64 distinct component types — well beyond 32-bit int limits.
    const types = Array.from({ length: 64 }, (_, i) =>
      defineComponent(`Comp${i}`, () => ({ v: i })),
    );
    const e = createEntity(world);
    for (const t of types) addComponent(world, e, t);

    for (const t of types) {
      expect(query(world, [t])).toContain(e);
    }
    expect(query(world, types)).toContain(e);
  });

  it('can query 1,000 entities with a two-component filter in under 5ms', () => {
    for (let i = 0; i < 1000; i++) {
      const e = createEntity(world);
      addComponent(world, e, Position, { x: i, y: 0, z: 0 });
      if (i % 2 === 0) addComponent(world, e, Velocity);
    }

    const start = performance.now();
    const result = query(world, [Position, Velocity]);
    const elapsed = performance.now() - start;

    expect(result).toHaveLength(500);
    expect(elapsed).toBeLessThan(5);
  });
});
