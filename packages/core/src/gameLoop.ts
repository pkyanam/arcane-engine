/**
 * Options for the fixed-timestep game loop.
 */
export interface GameLoopOptions {
  /** Seconds per fixed tick. Default: 1/60 */
  fixedStep?: number;
  /** Called once per fixed step with dt in seconds. */
  onTick: (dt: number) => void;
  /** Called every animation frame; alpha is the interpolation fraction [0, 1]. */
  onRender: (alpha: number) => void;
}

/**
 * Control handle returned by {@link createGameLoop}.
 */
export interface GameLoopHandle {
  /** Start scheduling animation frames if the loop is not already running. */
  start(): void;
  /** Stop the loop and cancel the currently scheduled animation frame. */
  stop(): void;
  /** Return whether the loop is currently running. */
  isRunning(): boolean;
}

/**
 * Create a browser game loop with fixed simulation ticks and interpolated
 * render callbacks.
 */
export function createGameLoop(options: GameLoopOptions): GameLoopHandle {
  const fixedStep = options.fixedStep ?? 1 / 60;
  let running = false;
  let rafId = 0;
  let lastTime: number | undefined;
  let accumulator = 0;

  function loop(timestamp: number): void {
    if (!running) return;

    if (lastTime === undefined) {
      lastTime = timestamp;
    }

    // Cap elapsed at 200ms to prevent spiral of death.
    const elapsed = Math.min((timestamp - lastTime) / 1000, 0.2);
    lastTime = timestamp;
    accumulator += elapsed;

    while (accumulator >= fixedStep) {
      options.onTick(fixedStep);
      accumulator -= fixedStep;
    }

    const alpha = accumulator / fixedStep;
    options.onRender(alpha);

    rafId = requestAnimationFrame(loop);
  }

  return {
    start() {
      if (running) return;
      running = true;
      lastTime = undefined;
      accumulator = 0;
      rafId = requestAnimationFrame(loop);
    },
    stop() {
      running = false;
      cancelAnimationFrame(rafId);
    },
    isRunning() {
      return running;
    },
  };
}
