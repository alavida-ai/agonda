# Operations System — Domain Model

Core objects and terminology for the operations system architecture. This is the shared vocabulary — all design documents, stories, and implementation reference these definitions.

## Four-Layer Architecture

The operations system spans four layers, each with a single owner and clear boundaries:

```
DIRECTION    plan.yaml         Goals, tactics, cycle. What we're doing and why.
CONTEXT      workspace.json    Per-workspace manifest. What this workspace delivers.
EXECUTION    Linear            Tickets, assignments, status. The actual work items.
KNOWLEDGE    domains/          Synthesized insights. What we learned.
```

Information flows in one direction per layer:

- **Direction flows DOWN:** plan.yaml → workspace.json → Linear project
- **Status flows UP:** Linear tickets done → workspace complete → synthesis → domains

| Layer | Source of Truth | Managed By | Read By |
|-------|----------------|------------|---------|
| Direction | plan.yaml | Alex via CLI (`agonda plan`) | Agents (`plan view --json`), dashboard, humans |
| Context | workspace.json | CLI (`agonda workspace`) | Agents (direct read), dashboard |
| Execution | Linear | Humans in Linear UI, agents via Linear MCP | Everyone |
| Knowledge | `domains/*/knowledge/` | Synthesis pipeline | Agents (domain CLAUDE.md → knowledge files) |

### Why Four Layers, Not One

No single tool handles all four. plan.yaml is agent-readable without API calls but human-hostile for daily task management. Linear has the human UI for tickets but can't express goals or habits. Domain knowledge is governed and structured but too heavy for operational tracking. Workspaces are file-native for agents but invisible without the CLI/dashboard.

The hybrid model connects them via workspace.json — the linchpin that links a workspace to both its plan tactic (direction) and its exact Linear object (execution).

### Linear's Role

Linear is the execution leaf. It owns tickets, assignments, and status tracking. It does NOT own direction (plan.yaml does), workspace context (workspace.json does), or knowledge (domains do).

The CLI never talks to Linear API. Agents interact with Linear via the Linear MCP server. The operations system establishes conventions for how Linear should be structured so both systems stay coherent.

**Mapping to 12 Week Year:**

| 12WY Concept | Linear Concept | Rationale |
|---|---|---|
| Goal | **plan.yaml only** | Goals are direction. Linear doesn't need them — initiatives are designed for multi-team orgs, overkill for 3 people. plan.yaml already owns this layer. |
| Tactic (deliverable) | Project | A deliverable tactic decomposes into tickets grouped in a Linear project. The project name matches the tactic text. |
| Tactic (habit) | Nothing | Habits are recurring behaviors scored at WAM. They never become tickets. |
| Work items | Issues | Individual tasks within a Linear project. |

**Labels:** One label group — `Work Type` (Business, Internal, Change, Unplanned). Exclusive (one per issue). This is the only source of work-type data for tickets without workspaces (quick fixes, bug reports, unplanned work). The `Unplanned` label is the most important — it makes the invisible visible for WAM.

**The linking chain:**

```
Goal G2 (plan.yaml)
  └── Tactic T2.1 "Ship website-dev workbench" (plan.yaml)
        └── workspace: website-dev (workspace.json, tactic: T2.1, linear: { type: project, id: ALA-PRJ-123 })
              └── Linear project "Ship website-dev workbench" (issues: ALA-340, ALA-341...)
```

## Direction Layer

### Cycle

A 12-week execution period. Scopes one plan, one set of goals, and weekly scorecards. Each cycle is a fresh start — previous cycle's plan is replaced, not amended. Defined in `plan.yaml` with start/end dates.

**Source:** 12 Week Year — "annualized thinking" creates a false sense of available time. 12-week cycles create perpetual urgency.

### Goal

What the team is trying to achieve within a cycle. 1-3 per cycle. Each goal has a lag measure (the result you want: "3 signed contracts") and a target. Goals are scored at cycle end, not weekly.

**Source:** 12 Week Year — goals must be specific, measurable, and few. More than 3 dilutes focus.

### Tactic

A line item in `plan.yaml` that serves a goal. Every tactic has an owner, a goal reference, and a type (deliverable or habit). Tactics are what get scored weekly — they are the lead indicators.

**Source:** 12 Week Year — tactics "start with a verb, assigned to one person, due in a specific week." Not objectives (what) but actions (how).

### Deliverable

A tactic that produces a concrete output by a due week. "Ship landing page by week 2." Has a completion state — done or not done. A deliverable may spawn one or more workspaces to get the work done, and may decompose into one or more tickets in Linear.

### Habit

A tactic representing a recurring behavior with no end state. "Schedule 3 discovery calls per week." Scored each week at WAM — did you do it or not? Habits never become tickets. Habits never spawn workspaces. They exist only in `plan.yaml` and on scorecards.

**Source:** 12 Week Year — habits are lead measures. You control them directly. They compound over time.

### Lead Measure vs Lag Measure

Lead measures are on tactics — did you DO the action? Lag measures are on goals — did you ACHIEVE the result? The scorecard scores leads. The dashboard tracks lags. You control leads; you observe lags.

**Source:** 12 Week Year — "most people measure lag indicators, but you can only influence lead indicators."

## Work Execution Layer

### Ticket

A Linear issue. The unit of work an engineer picks up. Deliverable tactics decompose into tickets for execution. A ticket has an assignee, status, and optionally a project grouping in Linear. Tickets live in Linear — they are not repo artifacts.

**Relationship to tactics:** A tactic says WHAT to achieve. Tickets say HOW to get it done. One deliverable tactic may decompose into many tickets. Habits never become tickets.

### Work Type

Categorization of all work into four types. Applied via Linear labels on tickets and the `work_type` field on `workspace.json` manifests for workspaces.

| Type | Definition | Danger |
|------|-----------|--------|
| Business | Work that delivers value to customers | Gets displaced by internal and unplanned work |
| Internal | Work that improves your own capability | Never urgent, always deferred |
| Change | Modifications to existing systems | Volume overwhelms if uncontrolled |
| Unplanned | Recovery, firefighting, surprises | Destroys all other types. The silent killer. |

**Source:** Phoenix Project — unplanned work is "anti-work." It doesn't create value, it displaces all planned work, and it feeds on itself. Making the four types visible is the first step to managing them.

### Constraint

The single bottleneck in the system — the resource everything waits on. Currently Alex. Every priority question, coordination decision, and "what's urgent?" routes through him. The operations system exists to externalize the constraint.

**Source:** Phoenix Project / Theory of Constraints — "improving anything that isn't the bottleneck is an illusion." The fix: externalize knowledge, make priorities visible, enable self-service.

## Methodology Concepts

These concepts from 12 Week Year and Phoenix Project inform how the team thinks about execution. They are documented in `execution-methodology.md` as reference knowledge — not as system infrastructure requiring CLI commands or YAML schemas.

### Execution Score

Completed tactics / due tactics * 100. Target: 85%+. Scored at WAM. The team tracks this however works — conversation, notes, spreadsheet. The concept matters; the format doesn't, yet.

### Breakdown Diagnosis

When execution is low: was it *execution* (didn't do the tactics) or *plan content* (tactics were wrong)? >60% of the time it's execution. Don't change the plan prematurely.

### Unplanned Work

Work that displaced planned tactics. The silent killer. Tracked narratively at WAM — what happened, what it displaced.

### WAM

Weekly Accountability Meeting. 15-30 min. Score, diagnose, commit. The forcing function for honest assessment. Documented as a process in `processes/weekly-accountability.md`.

## Workspace Layer

### Workspace

A directory in `workspace/` that exists to produce a specific deliverable or answer a specific question. The unit of work that agents operate inside. Each workspace has a `workspace.json` manifest, a `CONTINUE.md` for rich status, and accumulated working files.

Workspaces are delivery-scoped — each one delivers one thing. A goal may spawn multiple workspaces through its tactics, but each workspace has its own scope.

Workspaces can be:
- **Project-scoped** — serves a multi-ticket Linear project
- **Issue-scoped** — serves a single Linear ticket needing agent context
- **Unlinked** — pure discovery, no Linear commitment yet

### Workbench

A plugin template that lives in `domains/*/workbenches/`. Provides skills, hooks, and tools. A workbench is a capability; a workspace is an instance of using that capability. One workbench can spawn many workspaces.

### `workspace.json`

The manifest file at a workspace root. Links the workspace to its creating workbench and carries metadata: owner, status, deliverable, work type, and optional pointers to plan tactics and Linear tickets. Managed exclusively by the Agonda CLI — never hand-edited. Agents and dashboards are read-only consumers. See [workspace-json-schema.md](workspace-json-schema.md) for the full schema.

### Workspace Lifecycle

The stages a workspace moves through from creation to archive. One path:

```
active → ready-for-synthesis → synthesizing → archived
     ↘ archived (requires skip-synthesis reasoning)
```

No backwards transitions. If an archived workspace needs more work, create a new workspace. Skipping synthesis requires explicit reasoning — the default path always passes through synthesis.

`agonda workspace complete` handles the fork: without `--skip-synthesis`, it queues for synthesis. With `--skip-synthesis "reason"`, it archives directly. CLI commands are metadata-only — the physical `git mv` to `workspace/archive/` is a deliberate human action. `agonda workspace validate` catches drift between status and file location.

See [workspace-json-schema.md](workspace-json-schema.md) for status definitions, transition rules, and examples.

### WIP

Work in progress. The count of active workspaces is the primary WIP proxy. High WIP = fragmented attention = context-switching = slower delivery.

**Source:** Phoenix Project — at 90% utilization, wait time is 9x. "The path to getting more done is to start less, not push harder."

## Learning Layer

### Compound Learning

The Plan/Work/Review/Compound loop enforced by hooks on workbenches. The canonical behavior pack in Agonda.

- **Plan (40%)** — Define goal, research context, structure strategy
- **Work (20%)** — Execute against the plan
- **Review (30%)** — Validate against criteria
- **Compound (10%)** — Capture learnings that improve the next session

Learnings persist in `LEARNINGS.md` at the workbench level, surviving across workspace instances. This implements template-instance feedback — each run makes the next one better.

**Source:** Agonda framework — compound-learning is the system default. Production workbenches SHOULD declare it in `workbench.json` primitives.

### Synthesis

The process of transforming workspace insights into domain knowledge. Workspaces produce raw material; synthesis extracts durable patterns and writes them into `domains/*/knowledge/`. The workspace is cited, not consumed — source material stays as provenance.

Synthesis is triggered when a workspace reaches `ready-for-synthesis` in its lifecycle. It is a separate process from compound learning: compound learning captures learnings within a workbench's lifecycle; synthesis promotes insights across the system boundary into governed domain knowledge.

### Template-Instance Feedback

The mechanism by which learnings from workspace runs (instances) flow back to improve the workbench (template). Compound learning hooks enforce the capture side. Synthesis processes the improvement side. Without this, workbenches only improve through deliberate author effort.

**Lifecycle:** Install → Run instances → Capture feedback → Evolve template

## Relationships

```
Cycle
  └── Goal (1-3 per cycle)
        └── Tactic
              ├── Deliverable → Workspace(s) → Tickets (Linear)
              └── Habit (no workspace, no ticket)

Workspace
  ├── workspace.json (CLI-managed manifest)
  ├── CONTINUE.md (rich status)
  ├── LEARNINGS.md (compound learning output)
  └── Working files (research, decisions, drafts)

Workbench (template)
  ├── Skills (what it can do)
  ├── Hooks (how it works, incl. compound learning)
  └── LEARNINGS.md (accumulated across instances)

Synthesis
  Workspace insights → Domain knowledge (one-way promotion)
```
