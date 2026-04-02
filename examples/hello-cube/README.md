# hello-cube

`hello-cube` is the main Arcane Engine teaching example.

If you want to see how the engine works in a real app, start here.

## Run It

From the repo root:

```sh
pnpm --filter hello-cube dev
```

Open the Vite URL in your browser.

## What It Shows

- title-screen scene switching
- a textured gameplay walkthrough
- imported model props
- imported model animation
- preload-before-setup scene flow
- physics playground
- FPS movement and pointer lock
- multiplayer relay support
- touch controls for phones and tablets

## Controls

Title screen:

- `Enter`: gameplay walkthrough
- `P`: physics scene
- `F`: FPS scene
- `M`: multiplayer scene

Gameplay and physics scenes:

- `WASD` or arrows: move
- `Escape`: go back to title

FPS and multiplayer scenes:

- click canvas: pointer lock
- mouse: look
- `WASD`: move
- `Space`: jump
- left click: fire
- `R`: respawn when available
- `Escape`: pointer unlock or return to title

## Best Files To Read

If you are learning the repo:

1. `examples/hello-cube/scenes/title.ts`
2. `examples/hello-cube/scenes/gameplay.ts`
3. `examples/hello-cube/src/runtime/sceneRegistry.ts`
4. `examples/hello-cube/src/fpsSceneRuntime.ts`
5. `examples/hello-cube/src/fpsPlayerSetup.ts`
6. `examples/hello-cube/src/networkSyncSystem.ts`

## Copy-From-Here Helpers

These files are meant to be read and copied, not hidden behind framework magic:

- `src/fpsSceneRuntime.ts`: shared FPS scene shell
- `src/fpsPlayerSetup.ts`: local player rig and game-state setup
- `src/networkSyncSystem.ts`: simple relay sync logic
- `src/mobileControls.ts`: touch overlay logic

These stay example-local on purpose so the framework API can stay small.

## Multiplayer Local Test

Run the relay in one terminal:

```sh
pnpm --filter @arcane-engine/server build
pnpm --filter @arcane-engine/server start
```

Run the example in another:

```sh
pnpm --filter hello-cube dev
```

Open two tabs and press `M` in both.
