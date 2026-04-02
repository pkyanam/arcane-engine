# __ARCANE_PROJECT_NAME__

Asset-ready Arcane Engine starter.

Use this template when you want a clean starter app that already shows the official imported-asset workflow.

## Getting Started

```sh
pnpm install
pnpm dev
```

## What Is In Here

- `game.config.ts`: first scene and renderer options
- `scenes/title.ts`: intro scene
- `scenes/gameplay.ts`: preload, textures, imported props, and animated beacon example
- `src/assets/*`: tiny example assets you can replace with your own
- `src/runtime/*`: runtime helpers plus a simple preload overlay

## Controls

- `Enter`: open the gameplay scene
- `WASD` or arrows: move
- `Escape`: go back to title

## Edit These Files First

1. `scenes/gameplay.ts`
2. `src/assets/*`
3. `game.config.ts`

## How The Asset Flow Works

This template uses the recommended pattern:

1. declare a scene asset manifest
2. preload it before scene setup
3. use the loaded textures and models during `setup(world)`
4. dispose the asset cache during teardown

The runtime also lazy-loads scene modules, so scenes stay out of the initial bundle until needed.

## Swap In Your Own Assets

1. replace files in `src/assets/`
2. update the scene manifest in `scenes/gameplay.ts`
3. adjust the positions passed to `spawnModelInstances(...)` or `spawnModel(...)`
4. keep `preload()` async and `setup(world)` sync

## Need More Than This?

- want the absolute basics first: use the `starter` template
- want FPS or multiplayer patterns: copy from `examples/hello-cube`
