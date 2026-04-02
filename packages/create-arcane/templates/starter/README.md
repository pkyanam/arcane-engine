# __ARCANE_PROJECT_NAME__

Minimal Arcane Engine starter.

Use this template when you want the smallest possible app that still shows the full Arcane Engine shape.

## Getting Started

```sh
pnpm install
pnpm dev
```

## What Is In Here

- `game.config.ts`: chooses the first scene and renderer options
- `scenes/title.ts`: simple title screen
- `scenes/gameplay.ts`: basic controllable cube scene
- `src/runtime/*`: small runtime helpers for scene loading and transitions

## Controls

- `Enter`: go from title to gameplay
- `WASD` or arrows: move in gameplay
- `Escape`: go back to title

## Edit These Files First

If you are customizing the starter, begin here:

1. `game.config.ts`
2. `scenes/title.ts`
3. `scenes/gameplay.ts`

## Preload A Scene

If a scene needs assets before `setup(world)` runs, export an optional async `preload()` function from that scene module.

```ts
export async function preload(): Promise<void> {
  // load scene assets here
}
```

Keep `setup(world)` synchronous.

## Need More Than This?

- want textures, models, and preload examples right away: use the `asset-ready` template
- want FPS or multiplayer patterns: copy from `examples/hello-cube`
