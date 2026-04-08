# Contributing

Arcane Engine is meant to stay small, readable, and easy to teach.

If you contribute here, the best changes usually make one of these better:

- easier to start
- easier to understand
- easier to extend
- easier to modify safely with an AI coding agent

## Read First

Before editing:

1. read `README.md`
2. read `AGENTS.md`
3. read the README for the package, template, or example you are touching
4. inspect the real code and tests in that area

Treat `PRDs/` as historical background, not as the current requirements document.

## Local Workflow

From the repo root:

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

If you touch a template or example, also run that app locally when practical.

Useful commands:

```sh
pnpm --filter hello-cube dev
pnpm --filter @arcane-engine/server start
```

## Coding Conventions

- Use TypeScript strict mode.
- Use `import type { ... }` for type-only imports.
- Components must be created with `defineComponent()` and stay plain objects.
- Systems must stay pure functions with the signature `(world: World, dt: number) => void`.
- `dt` is always in seconds.
- Entity IDs are numbers.
- Prefer clear code over clever abstraction.

## Package Boundaries

Keep each package boring and obvious:

- `packages/core`: ECS, queries, systems, scenes, loop
- `packages/renderer`: Three.js integration
- `packages/assets`: texture/model loading, animation, preload, disposal
- `packages/audio`: Web Audio loading, spatial sound, music, volume, resume, cleanup
- `packages/input`: DOM input bridge and input-driven systems
- `packages/physics`: Rapier integration
- `packages/gameplay`: gameplay primitives, damage zones, and interaction helpers
- `packages/server`: relay only
- `packages/create-arcane`: scaffolding

If a helper only serves `hello-cube`, keep it in `examples/hello-cube` unless a second shipped path clearly needs it.

## Templates And Examples

- `templates/` is the source of truth for scaffold content.
- `packages/create-arcane/templates/` mirrors those files for publishing.
- `templates/starter` should stay as small and readable as possible.
- `templates/asset-ready` should stay focused on asset loading, not become a second `hello-cube`.
- `examples/hello-cube` is the place for bigger copy-from-here gameplay patterns.

## Tests And Docs

- Add or update Vitest coverage for public behavior you change.
- Keep tests importing from `src/`, not `dist/`.
- Update docs when the beginner path changes.
- Keep package READMEs aligned with the real exports.
- If you add or move a recommended workflow, update the relevant template/example README too.

## Docs Style

Assume the reader might be new to game engines.

Prefer:

- simple language
- short examples
- concrete file paths
- one clear recommended path

Avoid:

- roadmap/history language in product docs
- unexplained jargon
- “magic” helpers that hide where the code lives

## Release Hygiene

- Do not commit `node_modules/`, `dist/`, or temporary scaffold folders.
- Update `CHANGELOG.md` for user-facing changes before cutting a release.
- Keep versioning and release notes aligned.

## Guidance For AI Agents

- Re-check the touched package README before adding APIs.
- Inspect the existing implementation before inventing a new abstraction.
- Prefer the smallest useful change over framework growth.
- Keep docs, tests, templates, and examples in sync.
- Never revert unrelated user changes.
- Avoid destructive git commands unless explicitly requested.

## Out Of Scope By Default

Do not add these unless a task explicitly asks for them:

- advanced audio systems beyond the shipped audio package
- a visual editor
- plugin ecosystems
- production-grade multiplayer services
- hidden asset pipelines
- WebGPU renderer work
