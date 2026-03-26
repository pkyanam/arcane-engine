import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineComponent } from '../src/component.js';
import {
  createWorld,
  createEntity,
  addComponent,
  getComponent,
} from '../src/world.js';
import type { World } from '../src/world.js';
import {
  registerSystem,
  unregisterSystem,
  runSystems,
} from '../src/system.js';
import { query } from '../src/query.js';

const Position = defineComponent('Position', () => ({ x: 0, y: 0, z: 0 }));
const Velocity = defineComponent('Velocity', () => ({ vx: 1, vy: 0, vz: 0 }));

let world: World;

beforeEach(() => {
  world = createWorld();
});

describe('registerSystem', () => {
  it('adds a system to world.systems', () => {
    const sys = vi.fn();
    registerSystem(world, sys);
    expect(world.systems).toContain(sys);
  });

  it('multiple systems are registered in order', () => {
    const a = vi.fn();
    const b = vi.fn();
    const c = vi.fn();
    registerSystem(world, a);
    registerSystem(world, b);
    registerSystem(world, c);
    expect(world.systems).toEqual([a, b, c]);
  });
});

describe('unregisterSystem', () => {
  it('removes a registered system', () => {
    const sys = vi.fn();
    registerSystem(world, sys);
    unregisterSystem(world, sys);
    expect(world.systems).not.toContain(sys);
  });

  it('is a no-op for a system that was never registered', () => {
    const sys = vi.fn();
    expect(() => unregisterSystem(world, sys)).not.toThrow();
  });

  it('only removes the first occurrence if somehow duplicated', () => {
    const sys = vi.fn();
    world.systems.push(sys, sys); // force duplicate
    unregisterSystem(world, sys);
    expect(world.systems).toHaveLength(1);
    expect(world.systems[0]).toBe(sys);
  });
});

describe('runSystems', () => {
  it('calls each registered system once per call', () => {
    const a = vi.fn();
    const b = vi.fn();
    registerSystem(world, a);
    registerSystem(world, b);
    runSystems(world, 0.016);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('passes the world as the first argument', () => {
    const sys = vi.fn();
    registerSystem(world, sys);
    runSystems(world, 0.016);
    expect(sys).toHaveBeenCalledWith(world, expect.any(Number));
  });

  it('passes dt as the second argument', () => {
    const sys = vi.fn();
    registerSystem(world, sys);
    runSystems(world, 1 / 60);
    expect(sys).toHaveBeenCalledWith(expect.anything(), 1 / 60);
  });

  it('runs systems in registration order', () => {
    const callOrder: string[] = [];
    registerSystem(world, () => callOrder.push('first'));
    registerSystem(world, () => callOrder.push('second'));
    registerSystem(world, () => callOrder.push('third'));
    runSystems(world, 0);
    expect(callOrder).toEqual(['first', 'second', 'third']);
  });

  it('does nothing when no systems are registered', () => {
    expect(() => runSystems(world, 0.016)).not.toThrow();
  });

  it('does not call unregistered systems', () => {
    const a = vi.fn();
    const b = vi.fn();
    registerSystem(world, a);
    registerSystem(world, b);
    unregisterSystem(world, a);
    runSystems(world, 0.016);
    expect(a).not.toHaveBeenCalled();
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('accumulates dt correctly across multiple frames', () => {
    let totalDt = 0;
    registerSystem(world, (_w, dt) => { totalDt += dt; });
    runSystems(world, 0.016);
    runSystems(world, 0.016);
    runSystems(world, 0.016);
    expect(totalDt).toBeCloseTo(0.048);
  });

  it('a system can mutate component data and the change is visible to later systems', () => {
    const e = createEntity(world);
    addComponent(world, e, Position, { x: 0, y: 0, z: 0 });
    addComponent(world, e, Velocity, { vx: 5, vy: 0, vz: 0 });

    // System 1: apply velocity to position
    registerSystem(world, (w, dt) => {
      for (const id of query(w, [Position, Velocity])) {
        const pos = getComponent(w, id, Position)!;
        const vel = getComponent(w, id, Velocity)!;
        pos.x += vel.vx * dt;
      }
    });

    // System 2: read the updated position
    let observedX = 0;
    registerSystem(world, (w) => {
      for (const id of query(w, [Position])) {
        observedX = getComponent(w, id, Position)!.x;
      }
    });

    runSystems(world, 1); // dt = 1 second → x should move by 5
    expect(getComponent(world, e, Position)?.x).toBe(5);
    expect(observedX).toBe(5);
  });

  it('integration: movement system advances positions each frame', () => {
    const entities = Array.from({ length: 10 }, () => {
      const e = createEntity(world);
      addComponent(world, e, Position, { x: 0, y: 0, z: 0 });
      addComponent(world, e, Velocity, { vx: 2, vy: 0, vz: 0 });
      return e;
    });

    registerSystem(world, (w, dt) => {
      for (const id of query(w, [Position, Velocity])) {
        const pos = getComponent(w, id, Position)!;
        const vel = getComponent(w, id, Velocity)!;
        pos.x += vel.vx * dt;
        pos.y += vel.vy * dt;
        pos.z += vel.vz * dt;
      }
    });

    runSystems(world, 0.5);
    runSystems(world, 0.5); // total dt = 1

    for (const e of entities) {
      expect(getComponent(world, e, Position)?.x).toBeCloseTo(2);
    }
  });
});
