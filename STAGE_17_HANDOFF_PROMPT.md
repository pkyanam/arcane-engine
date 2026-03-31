# Stage 17 Handoff Prompt for Codex

Use this prompt to start the next Codex work session for Arcane Engine.

---

You are continuing work on **Arcane Engine**, a lightweight browser game framework built in public with AI coding agents.

Before making any edits, confirm the shipped **Stage 16 model-loading baseline** first. Do not assume animation playback already exists.

## Read first

Start by reading these files in this order:

1. `AGENTS.md`
2. `README.md`
3. `CONTRIBUTING.md`
4. `ARCANE_ENGINE_PRD_V2.md`
5. `ARCANE_ENGINE_PRD_V3.md`
6. `packages/assets/src/cache.ts`
7. `packages/assets/src/index.ts`
8. `packages/assets/src/textures.ts`
9. `packages/assets/src/models.ts`
10. `packages/assets/README.md`
11. `packages/renderer/src/components.ts`
12. `packages/renderer/src/renderSystem.ts`
13. `packages/renderer/README.md`
14. `examples/hello-cube/src/main.ts`
15. `examples/hello-cube/game.config.ts`
16. `examples/hello-cube/scenes/gameplay.ts`
17. `templates/starter/README.md`
18. `packages/create-arcane/README.md`

Then inspect the current Stage 16 validation and model-adjacent usage in:

- `packages/assets/tests/*.test.ts`
- `packages/renderer/tests/*.test.ts`
- `examples/hello-cube/scenes/*`
- `examples/hello-cube/src/assets/*`
- `templates/starter/scenes/*`
- `packages/create-arcane/templates/starter/*`

## Important context

- **V2.0 is already shipped.** Stages 1–12 are complete in the repo.
- **Stage 13 is complete.** Docs and package READMEs were synced to the shipped V2 surface.
- **Stage 14 is complete.** The renderer has better defaults for color, shadows, lighting helpers, and resize behavior.
- **Stage 15 is complete.** `packages/assets` provides the shared asset cache plus the official texture workflow.
- **Stage 16 is complete.** `packages/assets` now provides `loadModel(...)` / `spawnModel(...)`, the cache reuses model sources, and `hello-cube` gameplay validates imported `.glb` props.
- Your task is to begin **Stage 17: Animation Playback**.
- There is still **no official animation playback helper**, **no `AnimationPlayer` component**, **no animation system**, and **no animated example path** yet.
- Do **not** jump into Stage 18 gameplay extraction, prefab manifests, or broad preload orchestration unless Stage 17 needs a tiny supporting type or doc note.

## Stage 17 goal

Make imported model animation playback a first-class, beginner-friendly workflow in Arcane Engine.

## Stage 17 deliverables

- extend **`packages/assets`** with the smallest explicit animation playback surface that fits the current Stage 16 model APIs:
  - an **`AnimationPlayer`** component or equivalent explicit helper tied to loaded model instances
  - an **animation system** or equivalent system factory for advancing mixers each tick
  - clip selection by name
  - play / stop / loop controls
  - small, readable crossfade support
- keep the workflow compatible with the existing Stage 16 model loader and spawn path
- add one small example usage path:
  - at least one animated imported model in `hello-cube`
  - at least one gameplay-driven clip switch or simple state-driven transition
- add a tiny starter/template doc path:
  - “drop in an animated `.glb`, load it, play a named clip”

## Working rules

- Inspect the shipped Stage 16 model APIs before designing any animation helpers
- Keep the animation API thin and explicit
- Prefer Three.js-native mixer / clip patterns where possible
- Do not invent a hidden asset database, animation graph product, or generalized scene preload manager in Stage 17
- Do not start retargeting, blend trees, state machines, or gameplay extraction work yet
- Keep package boundaries intact
- Do not revert unrelated user changes

## Suggested approach

1. Audit the Stage 16 asset cache, model spawn flow, and example usage to identify the cleanest animation entry point.
2. Add the smallest animation playback surface to `packages/assets` that satisfies Stage 17 without pulling in Stage 18+ concerns.
3. Add or update tests for clip lookup, play / stop / loop behavior, crossfade behavior, and failure handling first or alongside implementation.
4. Add one tiny animated-model validation path in `hello-cube`.
5. Update starter docs and affected package docs so the animation workflow is understandable in one pass.
6. Run verification from the repo root:
   - `pnpm test`
   - `pnpm typecheck`
   - `pnpm build`

## Stage boundaries

- Stage 17 **can** add mixer-backed clip playback, clip selection by name, looping / one-shot behavior, and small explicit crossfades.
- Stage 17 **should not** add animation state machines, blend trees, retargeting, prefab manifests, scene preload orchestration, or broad asset-management abstractions.
- If you need tiny supporting adjustments in `packages/assets` or `packages/renderer`, keep them directly in support of animation playback.

## Definition of done for this task

You are done when:

- `packages/assets` supports the Stage 17 animation playback API
- one scene demonstrates real animated imported model playback through the official workflow
- clip switching / playback behavior is covered by tests
- the new public APIs have tests and JSDoc
- docs explain the animation workflow in beginner-friendly language
- `pnpm test`, `pnpm typecheck`, and `pnpm build` pass from the repo root
- your final summary explains:
  - what Stage 16 made ready for this work
  - what animation workflow you added
  - what should still wait for Stage 18+

## Output style

When you begin, first summarize your understanding of the shipped Stage 16 model-loading baseline and the Stage 17 scope before editing files. Then inspect the real current behavior, confirm the gaps, and only then make changes.
