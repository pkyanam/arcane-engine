# `@arcane-engine/create-arcane`

CLI scaffolder for Arcane Engine starter projects.

## Usage

```sh
npx @arcane-engine/create-arcane my-game
```

This will:

- copy the starter template into `./my-game`
- replace scaffold placeholders with your project name
- run `pnpm install` by default
- start `pnpm dev` automatically only in interactive terminals

## Options

```sh
create-arcane <project-directory> [--no-install] [--no-start]
```

- `--no-install`: skip `pnpm install`
- `--no-start`: scaffold and install, but do not start the dev server

## Notes

- When you run the local CLI from inside this monorepo, the scaffolded project links to the local `assets`, `core`, `input`, and `renderer` packages with `file:` dependencies.
- Outside the monorepo, it uses the published package versions instead.
- The starter already includes `@arcane-engine/assets`, so new projects have the official texture path, the Stage 16 `.glb` / `.gltf` model-loading path, and the Stage 17 imported-animation playback path ready on day one.

## Getting Started

If you skip install or start, run these commands manually:

```sh
cd my-game
pnpm install
pnpm dev
```
