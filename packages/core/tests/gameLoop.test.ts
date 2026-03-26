import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createGameLoop } from '../src/gameLoop.js';

describe('createGameLoop', () => {
  let rafCallbacks: Array<FrameRequestCallback>;

  beforeEach(() => {
    rafCallbacks = [];
    let idCounter = 0;

    globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
      rafCallbacks.push(cb);
      return ++idCounter;
    });

    globalThis.cancelAnimationFrame = vi.fn();
  });

  /** Drive the next pending animation frame. */
  function flushRAF(timestamp: number): void {
    const cbs = [...rafCallbacks];
    rafCallbacks = [];
    for (const cb of cbs) cb(timestamp);
  }

  it('isRunning() starts false', () => {
    const loop = createGameLoop({ onTick: vi.fn(), onRender: vi.fn() });
    expect(loop.isRunning()).toBe(false);
  });

  it('isRunning() is true after start() and false after stop()', () => {
    const loop = createGameLoop({ onTick: vi.fn(), onRender: vi.fn() });
    loop.start();
    expect(loop.isRunning()).toBe(true);
    loop.stop();
    expect(loop.isRunning()).toBe(false);
  });

  it('onTick is called the correct number of times per elapsed duration', () => {
    const onTick = vi.fn();
    const fixedStep = 1 / 60;
    const loop = createGameLoop({ fixedStep, onTick, onRender: vi.fn() });
    loop.start();

    // Frame 1: sets lastTime=0, elapsed=0 → 0 ticks
    flushRAF(0);
    expect(onTick).toHaveBeenCalledTimes(0);

    // Frame 2: elapsed ≈ 16.67ms → 1 tick
    flushRAF(1000 / 60);
    expect(onTick).toHaveBeenCalledTimes(1);

    // Frame 3: elapsed ≈ 16.67ms → 1 more tick
    flushRAF(2 * 1000 / 60);
    expect(onTick).toHaveBeenCalledTimes(2);

    loop.stop();
  });

  it('onTick is called with the fixed step value', () => {
    const onTick = vi.fn();
    const fixedStep = 1 / 60;
    const loop = createGameLoop({ fixedStep, onTick, onRender: vi.fn() });
    loop.start();

    flushRAF(0);
    flushRAF(1000 / 60);

    expect(onTick).toHaveBeenCalledWith(fixedStep);

    loop.stop();
  });

  it('onRender is called every frame', () => {
    const onRender = vi.fn();
    const loop = createGameLoop({ onTick: vi.fn(), onRender });
    loop.start();

    flushRAF(0);
    flushRAF(16);
    flushRAF(32);

    expect(onRender).toHaveBeenCalledTimes(3);

    loop.stop();
  });

  it('stop() halts the loop', () => {
    const onRender = vi.fn();
    const loop = createGameLoop({ onTick: vi.fn(), onRender });
    loop.start();

    flushRAF(0);
    expect(onRender).toHaveBeenCalledTimes(1);

    loop.stop();

    // Pending RAF callback returns early because running=false
    flushRAF(16);
    expect(onRender).toHaveBeenCalledTimes(1);
  });

  it('alpha passed to onRender is in [0, 1]', () => {
    const alphas: number[] = [];
    const loop = createGameLoop({
      fixedStep: 1 / 60,
      onTick: vi.fn(),
      onRender: (alpha) => alphas.push(alpha),
    });
    loop.start();

    flushRAF(0);               // elapsed=0 → alpha=0
    flushRAF(1000 / 60);       // 1 tick consumed → remainder ≈ 0 → alpha ≈ 0
    flushRAF(1000 / 60 + 8);   // 8ms into next step → alpha ≈ 0.48

    loop.stop();

    expect(alphas.length).toBe(3);
    for (const alpha of alphas) {
      expect(alpha).toBeGreaterThanOrEqual(0);
      expect(alpha).toBeLessThanOrEqual(1);
    }
  });

  it('caps accumulator at 200ms to prevent spiral of death', () => {
    const onTick = vi.fn();
    const fixedStep = 1 / 60;
    const loop = createGameLoop({ fixedStep, onTick, onRender: vi.fn() });
    loop.start();

    flushRAF(0);
    // Simulate a 1000ms stall — without the cap this would be 60 ticks
    flushRAF(1000);

    // With 200ms cap: floor(0.2 / (1/60)) = 12 ticks
    expect(onTick.mock.calls.length).toBeLessThanOrEqual(12);

    loop.stop();
  });

  it('does not start again if already running', () => {
    const loop = createGameLoop({ onTick: vi.fn(), onRender: vi.fn() });
    loop.start();
    const rafCallCount = (globalThis.requestAnimationFrame as ReturnType<typeof vi.fn>).mock.calls.length;
    loop.start(); // should be a no-op
    expect((globalThis.requestAnimationFrame as ReturnType<typeof vi.fn>).mock.calls.length).toBe(rafCallCount);
    loop.stop();
  });
});
