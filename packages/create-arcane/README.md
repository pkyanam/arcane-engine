# `@arcane-engine/create-arcane`

CLI scaffolder for Arcane Engine starter projects.

## Usage

```sh
npx @arcane-engine/create-arcane my-game
```

This will:

- copy the starter template into `./my-game`
- replace scaffold placeholders with your project name
- run `pnpm install`
- start `pnpm dev` automatically in interactive terminals

## Options

```sh
create-arcane <project-directory> [--no-install] [--no-start]
```

- `--no-install`: skip `pnpm install`
- `--no-start`: scaffold and install, but do not start the dev server

## Getting Started

If you skip install or start, run these commands manually:

```sh
cd my-game
pnpm install
pnpm dev
```
