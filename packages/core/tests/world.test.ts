import { describe, it, expect, beforeEach } from 'vitest';
import { defineComponent } from '../src/component.js';
import {
  createWorld,
  createEntity,
  destroyEntity,
  resetWorld,
  addComponent,
  removeComponent,
  getComponent,
  hasComponent,
} from '../src/world.js';
import type { World } from '../src/world.js';

const Position = defineComponent('Position', () => ({ x: 0, y: 0, z: 0 }));
const Velocity = defineComponent('Velocity', () => ({ vx: 0, vy: 0, vz: 0 }));
const Health   = defineComponent('Health',   () => ({ hp: 100, max: 100 }));

let world: World;

beforeEach(() => {
  world = createWorld();
});

// ─── createWorld ────────────────────────────────────────────────────────────

describe('createWorld', () => {
  it('returns an empty world with no entities', () => {
    expect(world.entities.size).toBe(0);
  });

  it('starts nextId at 0', () => {
    expect(world.nextId).toBe(0);
  });

  it('has empty components and systems', () => {
    expect(world.components.size).toBe(0);
    expect(world.systems).toHaveLength(0);
  });
});

// ─── createEntity ────────────────────────────────────────────────────────────

describe('createEntity', () => {
  it('returns a number', () => {
    const e = createEntity(world);
    expect(typeof e).toBe('number');
  });

  it('returns unique IDs on each call', () => {
    const ids = new Set(Array.from({ length: 100 }, () => createEntity(world)));
    expect(ids.size).toBe(100);
  });

  it('IDs are sequential starting from 0', () => {
    const a = createEntity(world);
    const b = createEntity(world);
    const c = createEntity(world);
    expect([a, b, c]).toEqual([0, 1, 2]);
  });

  it('adds the entity to world.entities', () => {
    const e = createEntity(world);
    expect(world.entities.has(e)).toBe(true);
  });

  it('increments nextId', () => {
    createEntity(world);
    expect(world.nextId).toBe(1);
    createEntity(world);
    expect(world.nextId).toBe(2);
  });
});

// ─── destroyEntity ───────────────────────────────────────────────────────────

describe('destroyEntity', () => {
  it('removes the entity from world.entities', () => {
    const e = createEntity(world);
    destroyEntity(world, e);
    expect(world.entities.has(e)).toBe(false);
  });

  it('removes all attached component data', () => {
    const e = createEntity(world);
    addComponent(world, e, Position, { x: 5 });
    addComponent(world, e, Health);
    destroyEntity(world, e);
    expect(getComponent(world, e, Position)).toBeUndefined();
    expect(getComponent(world, e, Health)).toBeUndefined();
  });

  it('is a no-op for a non-existent entity (does not throw)', () => {
    expect(() => destroyEntity(world, 9999)).not.toThrow();
  });

  it('does not affect other entities', () => {
    const a = createEntity(world);
    const b = createEntity(world);
    addComponent(world, a, Position, { x: 1 });
    addComponent(world, b, Position, { x: 2 });
    destroyEntity(world, a);
    expect(getComponent(world, b, Position)?.x).toBe(2);
  });

  it('clears the entity bitmask', () => {
    const e = createEntity(world);
    addComponent(world, e, Position);
    destroyEntity(world, e);
    expect(world.entityMasks.has(e)).toBe(false);
  });
});

// ─── resetWorld ─────────────────────────────────────────────────────────────

describe('resetWorld', () => {
  it('clears all entities, components, and systems', () => {
    const e = createEntity(world);
    addComponent(world, e, Position, { x: 5 });
    world.systems.push(() => {});

    resetWorld(world);

    expect(world.entities.size).toBe(0);
    expect(world.components.size).toBe(0);
    expect(world.systems).toHaveLength(0);
  });

  it('resets entity and component bitmask bookkeeping', () => {
    const e = createEntity(world);
    addComponent(world, e, Position);

    resetWorld(world);

    expect(world.entityMasks.size).toBe(0);
    expect(world.componentBits.size).toBe(0);
    expect(world.nextBit).toBe(1n);
  });

  it('resets nextId so the world behaves like a fresh world', () => {
    createEntity(world);
    createEntity(world);

    resetWorld(world);

    expect(createEntity(world)).toBe(0);
  });
});

// ─── addComponent ────────────────────────────────────────────────────────────

describe('addComponent', () => {
  it('attaches a component with default values', () => {
    const e = createEntity(world);
    addComponent(world, e, Position);
    expect(getComponent(world, e, Position)).toEqual({ x: 0, y: 0, z: 0 });
  });

  it('merges provided data with defaults', () => {
    const e = createEntity(world);
    addComponent(world, e, Position, { x: 10, z: -5 });
    expect(getComponent(world, e, Position)).toEqual({ x: 10, y: 0, z: -5 });
  });

  it('replaces an existing component when called again', () => {
    const e = createEntity(world);
    addComponent(world, e, Position, { x: 1 });
    addComponent(world, e, Position, { x: 99 });
    expect(getComponent(world, e, Position)?.x).toBe(99);
  });

  it('throws when the entity does not exist', () => {
    expect(() => addComponent(world, 9999, Position)).toThrow();
  });

  it('allows multiple different components on the same entity', () => {
    const e = createEntity(world);
    addComponent(world, e, Position, { x: 3 });
    addComponent(world, e, Velocity, { vx: 1 });
    addComponent(world, e, Health, { hp: 50 });
    expect(getComponent(world, e, Position)?.x).toBe(3);
    expect(getComponent(world, e, Velocity)?.vx).toBe(1);
    expect(getComponent(world, e, Health)?.hp).toBe(50);
  });

  it('updates the entity bitmask', () => {
    const e = createEntity(world);
    expect(world.entityMasks.get(e)).toBe(0n);
    addComponent(world, e, Position);
    expect(world.entityMasks.get(e)).not.toBe(0n);
  });

  it('does not share mutable default state between entities', () => {
    const Tags = defineComponent('Tags', () => ({ items: [] as string[] }));
    const a = createEntity(world);
    const b = createEntity(world);
    addComponent(world, a, Tags);
    addComponent(world, b, Tags);
    getComponent(world, a, Tags)!.items.push('sword');
    expect(getComponent(world, b, Tags)!.items).toHaveLength(0);
  });
});

// ─── removeComponent ─────────────────────────────────────────────────────────

describe('removeComponent', () => {
  it('removes the component so getComponent returns undefined', () => {
    const e = createEntity(world);
    addComponent(world, e, Position);
    removeComponent(world, e, Position);
    expect(getComponent(world, e, Position)).toBeUndefined();
  });

  it('updates the entity bitmask', () => {
    const e = createEntity(world);
    addComponent(world, e, Position);
    const maskBefore = world.entityMasks.get(e)!;
    removeComponent(world, e, Position);
    expect(world.entityMasks.get(e)).not.toBe(maskBefore);
    expect(world.entityMasks.get(e)).toBe(0n);
  });

  it('is a no-op when the entity does not have the component', () => {
    const e = createEntity(world);
    expect(() => removeComponent(world, e, Position)).not.toThrow();
  });

  it('does not remove other components', () => {
    const e = createEntity(world);
    addComponent(world, e, Position, { x: 7 });
    addComponent(world, e, Health);
    removeComponent(world, e, Position);
    expect(getComponent(world, e, Health)?.hp).toBe(100);
  });
});

// ─── getComponent ─────────────────────────────────────────────────────────────

describe('getComponent', () => {
  it('returns the component data', () => {
    const e = createEntity(world);
    addComponent(world, e, Health, { hp: 42 });
    expect(getComponent(world, e, Health)).toEqual({ hp: 42, max: 100 });
  });

  it('returns undefined for a missing component', () => {
    const e = createEntity(world);
    expect(getComponent(world, e, Position)).toBeUndefined();
  });

  it('returns undefined for a destroyed entity', () => {
    const e = createEntity(world);
    addComponent(world, e, Position);
    destroyEntity(world, e);
    expect(getComponent(world, e, Position)).toBeUndefined();
  });

  it('returns a live reference — mutations persist', () => {
    const e = createEntity(world);
    addComponent(world, e, Position);
    const pos = getComponent(world, e, Position)!;
    pos.x = 42;
    expect(getComponent(world, e, Position)?.x).toBe(42);
  });
});

// ─── hasComponent ─────────────────────────────────────────────────────────────

describe('hasComponent', () => {
  it('returns true when the component is attached', () => {
    const e = createEntity(world);
    addComponent(world, e, Position);
    expect(hasComponent(world, e, Position)).toBe(true);
  });

  it('returns false when the component is not attached', () => {
    const e = createEntity(world);
    expect(hasComponent(world, e, Position)).toBe(false);
  });

  it('returns false after removeComponent', () => {
    const e = createEntity(world);
    addComponent(world, e, Position);
    removeComponent(world, e, Position);
    expect(hasComponent(world, e, Position)).toBe(false);
  });

  it('returns false for a destroyed entity', () => {
    const e = createEntity(world);
    addComponent(world, e, Position);
    destroyEntity(world, e);
    expect(hasComponent(world, e, Position)).toBe(false);
  });
});

// ─── Performance ─────────────────────────────────────────────────────────────

describe('performance', () => {
  it('creates 1,000 entities with 3 components each in under 10ms', () => {
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      const e = createEntity(world);
      addComponent(world, e, Position, { x: i, y: i, z: 0 });
      addComponent(world, e, Velocity, { vx: 1, vy: 0, vz: 0 });
      addComponent(world, e, Health,   { hp: 100, max: 100 });
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(10);
  });
});
