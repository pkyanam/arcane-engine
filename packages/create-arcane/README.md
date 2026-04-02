# @arcane-engine/create-arcane

CLI for starting a new Arcane Engine project.

## Usage

```sh
npx @arcane-engine/create-arcane my-game
npx @arcane-engine/create-arcane my-game --template asset-ready
```

It will:

- copy the chosen template
- replace the project name placeholders
- run `pnpm install` by default
- start `pnpm dev` automatically in interactive terminals

## Templates

- `starter`: the smallest readable Arcane Engine app
- `asset-ready`: a starter that already shows textures, models, animation, and preload flow

Choose like this:

- want to learn the basics first: use `starter`
- want imported assets from the beginning: use `asset-ready`
- want FPS or multiplayer patterns: start from `hello-cube`, not from a template

## Options

```sh
create-arcane <project-directory> [options]
```

- `-t, --template <name>`: choose `starter` or `asset-ready`
- `--no-install`: skip `pnpm install`
- `--no-start`: scaffold and install, but do not start the dev server

## Local Monorepo Note

When you run the CLI from inside this repo, generated projects link to the local workspace packages with `file:` dependencies.

Outside the monorepo, generated projects use the published package versions instead.

## After Scaffolding

If you skip auto-start:

```sh
cd my-game
pnpm install
pnpm dev
```
