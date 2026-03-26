# Contributing

Arcane Engine is intentionally small. Contributions should make the framework easier to learn, easier to extend, and easier for AI agents to modify safely.

## Start Here

- Read `AGENTS.md` before changing code or adding files.
- For the active milestone, read **`PROMPT.md`** (handoff + scope).
- Keep work aligned with the current stage and PRD scope.
- Prefer small, reviewable changes over broad framework expansion.

## Local Workflow

Install dependencies and run the verification commands from the repo root:

```sh
pnpm install
pnpm test
pnpm typecheck
pnpm build
```

If you touch the example or starter flow, also run the relevant app locally with Vite.

## Coding Conventions

- Use TypeScript strict mode.
- Use `import type { ... }` for type-only imports.
- Components must be created with `defineComponent()` and remain plain objects.
- Systems must remain pure functions with the signature `(world: World, dt: number) => void`.
- `dt` is always in seconds.
- Entity IDs are numbers, not classes or wrappers.
- Prefer convention over configuration. If a feature can live in app code instead of a package API, keep it in app code.

## File Conventions

- `components/<name>.ts`: one exported component definition
- `systems/<name>.ts`: one exported system function
- `scenes/<name>.ts`: `setup(world)` plus optional `teardown(world)`
- `game.config.ts`: initial scene and renderer defaults

When adding framework features, preserve the existing package boundaries:

- `packages/core`: ECS, queries, systems, scenes, game loop
- `packages/renderer`: Three.js integration
- `packages/input`: DOM input bridge and input-focused systems
- `packages/create-arcane`: scaffolding

## Tests And Docs

- Add or update Vitest coverage for every public function you introduce.
- Keep tests importing from `src/`, not from built `dist/`.
- Add JSDoc for new public types and functions.
- Update `README.md`, starter docs, or package docs when the onboarding path changes.

## Guidance For AI Agents

- Re-check `AGENTS.md`, **`PROMPT.md`**, and any archived Cursor prompts before making assumptions.
- Inspect the existing implementation first; do not invent missing architecture if a lighter extension will work.
- Avoid feature creep. Stage work should feel polished, not bigger.
- Prefer example-local helpers for demo behavior instead of expanding package APIs just to support one example.
- Never revert unrelated user changes.
- Do not use destructive git commands unless the user explicitly asks for them.
- Finish the loop when possible: implement, test, typecheck, build, and summarize tradeoffs clearly.

## Out Of Scope By Default

Do not add these unless a task explicitly asks for them:

- asset pipelines
- audio
- UI frameworks
- networking (in scope only for **PRD Stage 12** — see **`PROMPT.md`**)
- plugin systems
- WebGPU renderer work
