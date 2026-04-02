# Arcane Engine Task Brief Template

This file keeps its old filename for compatibility, but you should now use it as a general task brief template.

## Task Summary

- task name:
- user outcome:
- why this work matters:
- current shipped behavior:

## Read First

List the exact files to read before editing.

1. `README.md`
2. `AGENTS.md`
3. area-specific README
4. source files
5. tests

## In Scope

- one sentence per deliverable
- keep each deliverable concrete and testable

## Explicitly Out Of Scope

- tempting extras
- new abstractions not needed for this task
- future ideas unrelated to the current user problem

## Constraints

- package boundaries that must stay intact
- source-of-truth files and mirrored files
- example or template expectations
- docs and tests that must stay aligned

## Suggested Approach

1. inspect the existing implementation first
2. choose the smallest stable shape that solves the task
3. implement the main user-facing path before optional polish
4. update tests and docs for public-facing changes
5. verify with the right local checks

## Verification

Use the smallest useful set:

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- targeted app or package checks

## Definition Of Done

- user-facing outcome works
- docs match the code
- tests cover the changed behavior
- package boundaries still make sense
- templates and mirrors stay in sync

## Final Summary Checklist

- what changed
- what stayed intentionally local
- what docs were updated
- what verification was run
