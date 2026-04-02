# `@arcane-engine/create-arcane`

CLI scaffolder for Arcane Engine starter projects.

## Usage

```sh
npx @arcane-engine/create-arcane my-game
npx @arcane-engine/create-arcane my-game --template asset-ready
```

This will:

- copy the requested template into `./my-game`
- replace scaffold placeholders with your project name
- run `pnpm install` by default
- start `pnpm dev` automatically only in interactive terminals

## Options

```sh
create-arcane <project-directory> [options]
```

- `-t, --template <name>`: choose `starter` or `asset-ready`
- `--no-install`: skip `pnpm install`
- `--no-start`: scaffold and install, but do not start the dev server

## Templates

- `starter`: minimal ECS + scene-transition baseline
- `asset-ready`: Stage 15-19 walkthrough with preload, textures, imported props, and an animated imported beacon

## Notes

- When you run the local CLI from inside this monorepo, the scaffolded project links to the local `assets`, `core`, `input`, and `renderer` packages with `file:` dependencies.
- Outside the monorepo, it uses the published package versions instead.
- Both shipped templates already include `@arcane-engine/assets`, so new projects have the official texture path, the Stage 16 `.glb` / `.gltf` model-loading path, the Stage 17 imported-animation playback path, and the Stage 19 named scene-manifest preload path ready on day one.
- Stage 18 kept FPS gameplay helpers example-local on purpose. If you want the shipped FPS baseline, copy from `examples/hello-cube/src/fpsSceneRuntime.ts` and `examples/hello-cube/src/fpsPlayerSetup.ts` instead of expecting a generated `packages/gameplay` dependency.
- The generated runtime also supports an optional scene `preload()` export, so apps can preload assets before sync `setup(world)` without changing the core scene API.
- Shipped runtimes load scene modules on demand, so heavier scenes stay out of the initial bundle until the player enters them.

## Getting Started

If you skip install or start, run these commands manually:

```sh
cd my-game
pnpm install
pnpm dev
```
