# Arcane Engine Stage Template

Use this when writing the next PRD stage, handoff prompt, or agent kickoff.

## Stage Summary

- Stage number and name:
- Goal:
- Why this stage exists:
- Current shipped baseline this stage builds on:

## Read First

List the exact files to read before editing, in order.

1. `AGENTS.md`
2. `README.md`
3. `CONTRIBUTING.md`
4. stage-specific files

## In Scope

- one sentence per deliverable
- keep deliverables concrete and testable

## Explicitly Out Of Scope

- ideas that are tempting but should wait
- package moves that are not yet justified
- future-stage polish or release work

## Existing Constraints

- package boundaries that must stay intact
- source-of-truth files and generated mirrors
- starter/example expectations
- docs or tests that must stay aligned

## Suggested Approach

1. Inspect the real current implementation first.
2. Choose the smallest stable shape that solves the stage goal.
3. Implement the main user-facing path before adding optional polish.
4. Update tests and docs for every public-facing change.
5. Verify from the repo root:
   - `pnpm test`
   - `pnpm typecheck`
   - `pnpm build`
6. Verify any scaffolded or generated output directly when the stage changes templates or examples.

## Definition Of Done

- user-facing outcome is implemented
- docs match the code
- tests cover new public behavior
- package boundaries still make sense
- final summary explains what changed, what stayed local, and what still waits for the next stage

## Final Summary Checklist

- what baseline from the previous stage stayed in place
- what new path was shipped
- why the scope stopped where it did
- how templates/examples/docs stay in sync
- what should wait for the next stage
