# Agonda CLI Methodology and Terminology

Use this reference when an agent needs to understand what the CLI concepts mean, not just which command to run.

## The Four Layers

Agonda operates across four layers:

- **Direction**: goals, tactics, and cycle metadata in `plan.yaml`
- **Context**: per-workspace manifests in `workspace.json`
- **Execution**: tickets and assignments in Linear
- **Knowledge**: synthesized domain knowledge in `domains/*/knowledge/`

The CLI governs only **Direction** and **Context**.

## Information Flow

- Direction flows down: `plan.yaml` -> `workspace.json` -> Linear
- Status flows up: Linear completion -> workspace lifecycle -> synthesis -> domain knowledge

This is why the CLI links workspaces to tactics and optionally to exact Linear objects, but does not manage Linear itself.

## Core Terms

### Cycle

A bounded execution period defined in `plan.yaml` with:
- `name`
- `start`
- `end`
- `vision`

### Goal

A strategic outcome for the cycle. Goals carry lag measures and targets.

Example:
- `G1`: close 3 paid client engagements

### Tactic

A committed action serving a goal. Tactics live in `plan.yaml`.

There are two tactic types:

- **Deliverable**: a concrete output due in a specific week
- **Habit**: a recurring behavior such as weekly calls or daily publishing

This distinction matters because deliverables can be completed and reopened; habits cannot.

### Workspace

A delivery-scoped working area represented by a `workspace.json` manifest plus working files like `CONTINUE.md` and `LEARNINGS.md`.

A workspace exists to produce one deliverable or answer one concrete question.

### Workbench

A reusable plugin/template that creates many workspaces.

- workbench = the reusable capability
- workspace = the specific instance of work

### Work Type

Workspaces classify work as:
- `business`
- `internal`
- `change`

Unplanned work is part of the broader methodology, but not a current workspace type in the CLI.

## Linking Chain

The canonical chain is:

`goal -> tactic -> workspace -> linear`

Example:

- Goal `G1`
- Tactic `T1.3`
- Workspace `barryos-website`
- Linear project `ALA-142`

This is why `workspace.json` is the linchpin of the system.

## Workspace Lifecycle

Current statuses:

1. `active`
2. `ready-for-synthesis`
3. `synthesizing`
4. `archived`

### What they mean

- `active`: work is still in progress
- `ready-for-synthesis`: work is done and insights are waiting to be extracted
- `synthesizing`: the synthesis process is actively promoting insights into domain knowledge
- `archived`: terminal state; value has been captured or synthesis was explicitly skipped

### Allowed transitions

- `active -> ready-for-synthesis`
- `active -> archived` with `--skip-synthesis`
- `synthesizing -> archived`

### Important rule

Transitions are metadata-only. The CLI updates `workspace.json`, but does not move directories on disk.

## Synthesis

Synthesis is the step that turns workspace learnings into governed domain knowledge.

The intended flow is:

`workspace work -> ready-for-synthesis -> synthesizing -> archived`

Use `--skip-synthesis` only when the work produced no reusable knowledge worth promoting.

## Staleness

Staleness is not a lifecycle state.

It is a git-derived signal used in workspace reporting:
- active workspace
- no recent commit activity

In the current CLI:
- JSON output exposes `stale`
- human output shows last activity
- a workspace with no commit history yet is shown as `new`

## How Agents Should Reason About the System

- Use `plan` commands when the user is changing or inspecting commitments.
- Use `workspace` commands when the user is changing or inspecting a concrete unit of work.
- If the user asks why a workspace matters, trace upward: workspace -> tactic -> goal.
- If the user asks where execution happens, answer: Linear.
- If the user asks where durable learnings belong, answer: domain knowledge after synthesis.

