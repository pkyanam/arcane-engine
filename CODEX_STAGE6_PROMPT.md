[arcane-engine-prd.docx](arcane-engine-prd.docx)

# Codex Handoff — Stage 6: Hello Cube Demo + Documentation

> Paste this entire file into the next agent session.
> Read `AGENTS.md` first, then re-check `arcane-engine-prd.docx` for the Stage 6 wording and constraints.

---

## Context

You are working on **Arcane Engine**, a Next.js-inspired browser game framework.
Stages 1-5 are complete:

- Stage 1: ECS core
- Stage 2: game loop + Three.js renderer
- Stage 3: input system + player control
- Stage 4: scene system + file conventions
- Stage 5: CLI scaffolder + starter template

Current verified baseline:

- `pnpm test` passes
- `pnpm typecheck` passes
- `pnpm build` passes
- `packages/create-arcane/` exists and scaffolds from `templates/starter/`
- `templates/starter/` exists and builds as a generated app
- `examples/hello-cube` boots from `game.config.ts`, auto-discovers `scenes/*.ts`, and switches between `title` and `gameplay`
- Manual verification at `http://127.0.0.1:4173/` confirmed the demo and WASD movement work
- A freshly scaffolded project was verified locally with:
  - scaffold via `node packages/create-arcane/bin/create-arcane.js ... --no-install --no-start`
  - `pnpm install --ignore-workspace`
  - `pnpm typecheck`
  - `pnpm build`

The PRD defines **Stage 6** as:

> Goal: A polished demo: player cube, floating cubes, scene switching, plus documentation good enough for someone to start building.

PRD deliverables for Stage 6:

- `examples/hello-cube`: player-controlled cube, 20 floating cubes with random velocities, ground plane, basic lighting
- Two scenes: gameplay scene + title screen with `Press Enter to Start`
- `README.md`: installation, folder conventions, how to add an entity, how to add a system, how to add a scene
- API reference: all public types and functions documented with JSDoc
- `CONTRIBUTING.md` with conventions for AI agents

PRD acceptance criteria:

- A new developer (or agent) can read the README, scaffold a project, and add a new entity type within 10 minutes
- All packages have passing tests
- The demo runs at 60fps with 100 entities on a mid-range laptop

The PRD suggests Codex for demo content and Claude Code for documentation/final integration, but this handoff is for the next agent working in this repo.

---

## What Exists Today

- `packages/core/` provides ECS primitives, queries, system registration, the fixed-timestep game loop, and scene lifecycle helpers
- `packages/renderer/` provides `createRenderer()`, render components, `spawnMesh()`, and `renderSystem(ctx)`
- `packages/input/` provides:
  - `InputState`
  - `Controllable`
  - `createInputManager(world)`
  - `movementSystem(speed?)`
  - `cameraFollowSystem(ctx, options?)`
- `packages/create-arcane/` provides a Node-based scaffolder with:
  - safe destination validation
  - starter template copying
  - project-name placeholder replacement
  - dependency resolution for local repo use vs published package use
  - `pnpm install` and background `pnpm dev` startup behavior
- `templates/starter/` is derived from the current Stage 4 example and includes:
  - `game.config.ts`
  - `scenes/title.ts`
  - `scenes/gameplay.ts`
  - runtime helpers under `src/runtime/`
  - tests for the runtime helpers
- `examples/hello-cube/` already has:
  - `title` and `gameplay` scenes
  - scene transitions via `Enter` and `Escape`
  - a controllable cube
  - a grid helper and HUD so movement is visibly obvious while the camera follows the player

Notably, the Stage 6 targets that still need work are:

- the gameplay demo is still too minimal for the PRD polish target
- there is no root `README.md`
- there is no root `CONTRIBUTING.md`
- public API JSDoc coverage is incomplete across packages

That is the correct place to focus. Do not broaden scope beyond the demo/documentation goals in the PRD.

---

## Suggested Scope

Implement Stage 6 in a way that fits the current repo shape with minimal churn:

1. Polish `examples/hello-cube` into the PRD demo target.
2. Keep the existing title/gameplay scene structure and build on it rather than replacing it.
3. Add floating cube entities with simple randomized motion using the existing ECS conventions.
4. Add a visible ground plane and keep the lighting/basic look simple but intentional.
5. Write a root `README.md` that explains installation, structure, and the core add-an-entity/add-a-system/add-a-scene workflows.
6. Add JSDoc for all public types and functions across packages.
7. Add a root `CONTRIBUTING.md` with conventions for AI agents and repo contributors.
8. Add or update tests only where public APIs or demo helper behavior change.

Prefer simple ECS/demo additions over inventing new engine subsystems. Stage 6 should feel polished, not bigger.

---

## Recommended Demo Outcome

Refine `examples/hello-cube` so it demonstrates the framework clearly:

- `scenes/title.ts` remains a lightweight title/start screen with a clear `Press Enter to Start` prompt
- `scenes/gameplay.ts` contains:
  - the controllable player cube
  - around 20 floating cubes with randomized movement/variation
  - a ground plane
  - basic lighting
  - clear visual evidence that the scene is alive and interactive
- the demo still supports returning to the title scene

Keep the implementation convention-friendly. The demo should teach the architecture by example.

---

## Documentation Outcome

Add the missing top-level docs:

- `README.md`
  - what Arcane Engine is
  - install/setup
  - workspace/package overview
  - file/folder conventions
  - how to add an entity
  - how to add a system
  - how to add a scene
  - how to scaffold a new project with `create-arcane`
- `CONTRIBUTING.md`
  - coding conventions
  - testing expectations
  - agent-focused repo guidance

Also improve public API discoverability by adding JSDoc to exported types/functions in:

- `packages/core/src/`
- `packages/renderer/src/`
- `packages/input/src/`
- `packages/create-arcane/src/` where it makes sense

Do not write a giant manual. Optimize for fast onboarding.

---

## Constraints

- TypeScript strict mode throughout
- Use `import type { ... }` for type-only imports
- Components remain plain objects created by `defineComponent()`
- Systems remain pure functions: `(world: World, dt: number) => void`
- Every public function still needs Vitest coverage
- Prefer convention over configuration and avoid feature creep

Do not add physics, asset pipelines, audio, UI frameworks, networking, plugin infrastructure, or anything from the post-MVP roadmap.

---

## Open Design Decisions

Make these choices deliberately and explain them in the final summary:

- How to implement the floating cubes:
  - purely in example-level systems/components
  - or by reusing/extending an existing pattern without polluting package APIs
- How much visual polish to add without turning Stage 6 into a new rendering feature set
- How to balance concise onboarding docs with the PRD requirement that a new developer can get productive quickly
- How much JSDoc detail is enough to satisfy API reference needs without generating noise

If tradeoffs are non-obvious, keep the simplest version that satisfies the PRD.

---

## Verification

Before finishing, run:

```sh
pnpm test
pnpm typecheck
pnpm build
```

Also verify at least one practical Stage 6 demo outcome, such as:

- the example still boots correctly
- scene switching still works
- movement still works
- the gameplay scene visibly contains the Stage 6 content

If you make documentation claims about the scaffold flow, sanity-check them against the current `packages/create-arcane/` behavior.

---

## Deliverables

- polished `examples/hello-cube`
- floating cubes + ground plane + basic lighting
- preserved title/gameplay scene flow
- root `README.md`
- root `CONTRIBUTING.md`
- JSDoc coverage for public APIs
- updated tests/docs as needed
