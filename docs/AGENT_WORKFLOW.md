# Arcane Engine Agent Workflow

Arcane Engine is easiest to extend when one person or agent keeps the scope small, reads the real code first, and keeps package boundaries obvious.

## Session Start

Before editing:

1. read `README.md`, `AGENTS.md`, and the README for the area you will touch
2. inspect the actual source and tests
3. write down the smallest version of the task that solves the user problem
4. decide what is explicitly out of scope

## Good Default Read Order

For most tasks:

1. root `README.md`
2. package or example README
3. package `src/index.ts`
4. the files used by the current workflow
5. the tests for that area

## Task Splitting By Tool

These are defaults, not hard rules.

### Codex

Best for:

- bounded package work
- template changes
- example implementation
- tests and regression fixes
- carrying a change through implementation and verification

### Claude Code

Best for:

- repo-wide docs alignment
- cross-package planning
- architecture cleanup where several areas must stay consistent

### Cursor

Best for:

- tight local refactors
- fast iteration in one file cluster
- hands-on editing with a human nearby

## Splitting Rules

- Split by write scope, not vague topic.
- Give one owner the final integration pass.
- Do not have multiple agents edit the same file unless that overlap is intentional.
- Decide what the source of truth is before touching mirrored files.

## Example-Local Vs Package-Level

Keep code example-local when most of these are true:

- it only serves `hello-cube`
- the API name is still demo-specific
- the code is easier to understand next to the scene that uses it
- moving it to a package would hide important behavior

Promote code into a package when most of these are true:

- at least two shipped paths need it
- the API can be documented simply
- lifecycle and teardown rules are stable
- package tests are clearer than example-only tests

If you are unsure, keep it local.

## Template Rules

- `templates/` is the source of truth
- `packages/create-arcane/templates/` is the published mirror
- when a template changes, keep the mirror in sync
- `starter` should stay minimal
- `asset-ready` should stay focused on asset loading

## Docs Rules

- write for a beginner reader first
- prefer one recommended path over many equal options
- explain where code lives
- avoid roadmap language in user-facing docs
- update READMEs when the recommended workflow changes

## End Of Session Check

Before calling the task done:

1. did the scope stay small?
2. did any example-only helper get promoted too early?
3. do docs match the shipped code?
4. are templates, mirrors, and examples still aligned?
5. did you run the right checks for the change?
