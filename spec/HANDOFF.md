# Agonda CLI — Build Handoff

## Start Here

You are building the Agonda CLI from scratch. TypeScript, Node.js 20+. This is a fresh repo with no legacy code.

## What This CLI Does

Two command groups. Nothing else in v1.

1. **`agonda plan`** — CRUD for a YAML execution plan (goals, tactics, cycle). Read it, validate it, add/edit/remove items.
2. **`agonda workspace`** — manage workspace manifests (workspace.json files). Create, list, filter, lifecycle transitions, validation.

The CLI is the single writer for `plan.yaml` and `workspace.json`. It validates on every write. It never touches Linear or any external API.

## Files to Read

Read them in this order:

| # | File | What you learn |
|---|------|----------------|
| 1 | **[implementation.md](implementation.md)** | The full implementation spec — conventions, schemas, every command with flags, JSON output shapes, exit codes, testing strategy. **This is your primary reference.** |
| 2 | **[phases.md](phases.md)** | Build order. Phase 1 (plan) has zero dependencies. Phase 2 (workspace) needs shared scanning logic. Phase 3 (lifecycle) needs Phase 2. |
| 3 | **[workspace-json-schema.md](workspace-json-schema.md)** | workspace.json field-level spec with 6 annotated examples |
| 4 | **[decisions.md](decisions.md)** | 17 design decisions with rationale. Read if you're unsure about a design choice — the answer is probably here. |
| 5 | **[domain-model.md](domain-model.md)** | Core objects and terminology. Useful if you're confused about what a "tactic" or "deliverable" is. |
| 6 | **[user-stories.md](user-stories.md)** | 20 stories with coverage matrices. Read if you want to understand WHY a command exists. |

The `docs/` directory has client-facing documentation (README, command references, lifecycle guide, schemas). These describe the same system from a user's perspective — useful for understanding the intended experience.

## Build Phase 1 First

Start with the plan commands. They have zero dependencies and operate on a single YAML file.

```
agonda plan view [--json]
agonda plan validate [--json]
agonda plan init --name --start --end --vision
agonda plan goal add/edit/remove/list
agonda plan tactic add/edit/remove/list/complete/reopen
```

A real `plan.yaml` with Cycle 2 data exists in the knowledge base repo at `domains/operations/knowledge/plan.yaml`. Copy it to `test/fixtures/` — your commands should work on real data from day one.

## Tech Stack

| Choice | Why |
|--------|-----|
| TypeScript | Type safety for schema validation |
| Commander.js | Mature CLI framework, supports nested subcommands, auto-help |
| js-yaml | Parse and write plan.yaml |
| chalk | Terminal colors (only when TTY) |
| vitest | Fast, TypeScript-native test runner |

npm package name: `agonda`. Install globally via `npm install -g agonda`.

## Key Constraints

1. **Every command supports `--json`.** Data to stdout, errors to stderr. Agents pipe this.
2. **Validate on every write.** No mutation without full schema validation after.
3. **No interactive prompts.** All mutations are flag-based. Agents and humans use the same interface.
4. **Exit codes matter.** 0 = success, 1 = unexpected error, 2 = validation failure.
5. **Repo discovery:** Walk up from cwd to find `.git`. `plan.yaml` is always at `domains/operations/knowledge/plan.yaml` relative to repo root.
6. **Workspace name resolution:** Scan `workspace/**/workspace.json`. Name = parent directory name. Must be unique or disambiguated with `--path`.

## Fixtures

Copy these from the knowledge base repo into `test/fixtures/`:

- `domains/operations/knowledge/plan.yaml` — real Cycle 2 plan
- Create sample workspace directory trees with workspace.json files at various statuses
- Create old `.workbench` files for migration testing

## What NOT to Build

- No marketplace, plugin management, primitives, or health check commands
- No Linear API integration (the CLI never talks to Linear)
- No interactive prompts or TUI
- No config file (repo discovery is convention-based)
- No daemon or watch mode

## Project Structure

```
agonda/
├── src/
│   ├── index.ts              # CLI entry point
│   ├── commands/
│   │   ├── plan/             # plan view, validate, init, goal/*, tactic/*
│   │   └── workspace/        # create, list, link, complete, archive, graduate, validate, migrate
│   ├── lib/
│   │   ├── repo.ts           # repo root discovery
│   │   ├── plan.ts           # plan.yaml parser, validator, writer
│   │   ├── workspace.ts      # workspace.json parser, validator, scanner
│   │   └── git.ts            # git log for timestamps, staleness
│   └── types.ts              # shared type definitions
├── test/
│   ├── fixtures/
│   │   ├── plan.yaml
│   │   └── workspace/        # sample workspace trees
│   ├── plan.test.ts
│   └── workspace.test.ts
├── docs/                     # client-facing documentation
├── spec/                     # design specs (you are here)
├── package.json
├── tsconfig.json
└── README.md
```
