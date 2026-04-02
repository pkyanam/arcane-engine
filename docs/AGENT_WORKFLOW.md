# Arcane Engine Agent Workflow

Arcane Engine is easiest to extend when one agent owns the scope, reads the real code first, and keeps package boundaries boring.

## Session Start

Before editing:

1. Read `AGENTS.md`, `README.md`, `CONTRIBUTING.md`, and the current PRD stage.
2. Confirm the shipped baseline in code and tests, not just in roadmap prose.
3. Write down the smallest version of the task that solves the user problem.
4. State what is explicitly out of scope for this session.

## Task Splitting By Tool

These are defaults, not hard rules.

### Codex

Best for:

- bounded package work
- CLI and scaffolding changes
- example implementation
- test additions and regression fixes
- carrying a change through implementation, verification, and cleanup

Good handoff shape:

- one package or template path
- exact files to inspect first
- explicit acceptance checks

### Claude Code

Best for:

- architecture passes across multiple packages
- docs + code alignment work
- integration planning
- repo-wide cleanup where several moving pieces must stay coherent

Good handoff shape:

- one architectural question
- a clear scope ceiling
- the docs and packages that must stay aligned

### Cursor

Best for:

- tight iteration inside one local area
- fast editing and preview loops
- refactors where the code owner wants to stay hands-on

Good handoff shape:

- one file cluster
- short edit instructions
- a narrow local verification loop

## Task Splitting Rules

- Split by write scope, not by vague topic.
- Give one agent ownership of the final integration pass.
- Do not have multiple agents edit the same file unless the overlap is intentional and coordinated.
- Prefer one strong scaffold path over parallel half-finished template ideas.
- When a task touches docs, templates, and package code, decide which piece is the source of truth first.

## Example-Local Vs Package-Level Checklist

Keep logic example-local when most answers below are "yes":

- it only serves one shipped example or template
- the API shape is still changing while the example teaches it
- the code is easier to understand next to the scene that uses it
- moving it into a package would force naming or abstraction choices early
- another example or template does not clearly need the same helper yet

Promote logic into a package only when most answers below are "yes":

- at least two shipped paths need the same behavior
- the API can be explained in simple public docs
- the lifecycle and teardown rules are stable
- the helper reduces repeated code without hiding important behavior
- package tests are clearer than example-only tests for the feature

If the answer is "not sure," keep it local and document why.

## Template And Scaffold Rules

- `templates/` is the source of truth for scaffold content.
- `packages/create-arcane/templates/` is the packaged mirror.
- Prefer explicit template files over hidden CLI generation.
- Add a new template only when it tells a meaningfully different onboarding story.

## End Of Session Check

Before calling the work done:

1. Did the scope expand beyond the original goal?
2. Did any helper move into a package without two clear call sites?
3. Do the docs explain the shipped path without sending the reader into `hello-cube` to guess?
4. Did you run the repo checks plus any direct scaffold verification the task needed?

If not, tighten the change before moving on.
