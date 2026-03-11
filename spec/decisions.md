# Design Decisions

## Locked Decisions

### D1: Four-Layer Hybrid Model

The operations system spans four layers, each with a single owner:

| Layer | Source of Truth | Managed By | Why Here |
|-------|----------------|------------|----------|
| **Direction** (goals, tactics, cycle) | plan.yaml in repo | Alex via CLI | Agent-readable without API. Habits don't fit issue lifecycle. Schema-enforced, version-controlled. |
| **Context** (workspace manifests) | workspace.json in repo | CLI | Links workspaces to direction (tactic) and execution (Linear). File-native for agents. |
| **Execution** (tickets, assignments) | Linear (projects, issues) | Humans in UI, agents via MCP | Human UI for Thomas and Chicote. Status tracking, assignments, GitHub integration. |
| **Knowledge** (domain insights) | `domains/*/knowledge/` | Synthesis pipeline | Governed, structured, agent-ready. Survives beyond workspaces. |

**Information flow:** Direction flows DOWN (plan → workspace → Linear). Status flows UP (tickets done → workspace complete → synthesis → domains).

**Why not Linear for everything:** Habits don't fit Linear's issue model. Execution scoring (human judgment) has no Linear surface. Goals are direction, not project management — plan.yaml is the right home. See [ideal-work-manager.md](ideal-work-manager.md) for full gap analysis.

**Why not repo for everything:** Linear provides the human UI that Thomas and Chicote need. Engineering tickets need assignments, status workflows, GitHub integration. The repo is agent-native but human-hostile for daily task management.

**How they connect:** workspace.json is the linchpin — it links to both a plan tactic (`tactic` field) and a typed Linear object (`linear` field). The CLI never talks to Linear API. Agents interact with Linear via the Linear MCP server.

```
plan.yaml (Direction)
  Goal → Tactics (habits + deliverables)
    Deliverable tactics → workspace.json → Linear project
    Habit tactics → scored at WAM, never in Linear

workspace.json (Context)
  Links: tactic field → plan.yaml, linear field → exact Linear issue/milestone/project
  Carries: owner, deliverable, work_type, status

Linear (Execution)
  Projects → Issues → Sub-issues
  Deliverable-type work needing assignment + tracking

domains/ (Knowledge)
  Synthesis promotes workspace insights into governed knowledge
```

**Methodology basis:**
- 12WY: plan.yaml IS the one-page plan. Scorecard scores lead indicators (tactics). Linear tracks execution.
- Phoenix: make work visible across all four layers. Dashboard merges them. Four types of work via workspace.json work_type.

### D2: Workspaces Are Delivery-Scoped

Each workspace exists to produce something specific (deliverable mode) or answer a specific question (discovery mode). A goal may spawn multiple workspaces through its tactics — but each workspace has its own scope.

Workspaces can be:
- **Project-scoped** — serves a multi-ticket Linear project (e.g., website build)
- **Issue-scoped** — serves a single Linear ticket needing agent context
- **Unlinked** — pure discovery, no Linear commitment yet

Work can start in either place. Sometimes you explore first, then commit to Linear. Sometimes a Linear project spawns a workspace for agent work.

**Source:** taxonomy/workbench-concepts.md refined — delivery-scoped, not goal-scoped. A goal spans multiple workspaces; a workspace delivers one thing.

### D3: workspace.json Schema — SUPERSEDED

**Superseded by [workspace-json-schema.md](workspace-json-schema.md).** The original `.workbench` schema evolved significantly:
- Renamed from `.workbench` to `workspace.json`
- Dropped `mode` (deliverable/discovery) — replaced by single `deliverable` field
- Dropped `question` — merged into `deliverable`
- Added `work_type` from Phoenix Project
- Added `tactic` field linking to plan.yaml
- Four-status lifecycle: `active → ready-for-synthesis → synthesizing → archived`
- All known reconciliation issues resolved in the final schema

### D4: Scorecard Format

Per-tactic, weekly. Scores lead indicators (did you do the tactic?), not lag indicators (did you hit the goal?).

```yaml
# domains/operations/knowledge/scorecards/week-1.yaml
week: 1
period: "2026-03-10 to 2026-03-16"
scored_by: Alex
scored_at: "2026-03-17"

tactics:
  T1.1:
    due: true
    done: true
    note: ""
  T1.3:
    due: true
    done: false
    note: "Blocked — BarryOS founders rescheduled"

execution_score: 75
target: 85

# Phoenix Project: track the invisible killer
unplanned_work:
  - "Client emergency displaced 4 hours Tuesday"
unplanned_hours_estimate: 4

breakdown_type: execution  # execution | plan_content
```

**Key concepts:**
- Execution score = completed / due * 100. Target: 85%+
- Breakdown diagnosis: if score < 85%, was it execution (didn't do the tactics) or plan content (tactics were wrong)? >60% of the time it's execution.
- Unplanned work tracking: what displaced planned tactics? Narrative, not just a label.

### D5: Dashboard — Unified View from Two Sources

| Section | Data Source | What You See |
|---------|------------|--------------|
| Goals + lag measures | plan.yaml | "Sign 3 clients" — current: 0, target: 3 |
| Tactics + due weeks | plan.yaml | "Ship landing page" — due week 1, owner: Thomas |
| Ticket progress | Linear API | Project completion %, issue status, assignees |
| Execution score trend | Scorecards | Week 1: 75%, Week 2: 85%, Week 3: 90% |
| Work type split | workspace.json work_type | 40% business, 45% internal, 15% unplanned |
| Workspaces in flight | workspace.json files | 12 active, 3 ready-for-synthesis, 2 stale |
| Unplanned work log | Scorecards | "Client emergency displaced 4hrs Tuesday" |

The dashboard merges both systems. `generate.js` already scans the repo. Add Linear GraphQL API calls at build time for ticket data.

**Auth:** `LINEAR_API_KEY` environment variable. Local generation only (not in CI currently).

### D6: WAM as Process Knowledge

Weekly Accountability Meeting — 15-30 minutes, the team.

1. Each person reports: results-to-date, weekly execution score, intentions for next week
2. Breakdown diagnosis — execution vs plan content
3. Unplanned work review — what displaced planned tactics?
4. Close with commitments

The WAM is where the scorecard gets created. It's the forcing function for honest assessment. Documented at `domains/operations/processes/weekly-accountability.md`.

**Preparation:** Review plan.yaml (goals/tactics) + Linear (ticket status) before the meeting. The dashboard provides the unified view.

### D7: Operations Domain Knowledge

The operations domain holds methodology and conventions, not plan data.

| Knowledge File | Purpose |
|----------------|---------|
| `linear-conventions.md` | How we map 12WY to Linear: Project = deliverable tactic decomposition, label groups, cycle config, naming |
| `execution-methodology.md` | Scoring, breakdown diagnosis, lead vs lag, 85% target, four types of work |
| `weekly-accountability.md` | WAM process — score, diagnose, commit |
| `scorecards/week-N.yaml` | Weekly execution scores |

**What it does NOT hold:** Goals or tactics (those are in plan.yaml). Ticket details (those are in Linear). Workspace context (that's in workspace files).

The domain owns the INTERPRETATION layer. plan.yaml owns DIRECTION. Linear owns WORK EXECUTION. Scorecards own HONESTY.

### D8: Enforcement via Mix

Enforcement happens through a combination of:
- **Agonda CLI** — validation commands for workspace.json schema, plan.yaml schema, workspace lifecycle transitions
- **Rules** — `.claude/rules/operations-domain.md` for structural standards (plan.yaml schema, scorecard freshness)
- **Hooks** — lifecycle enforcement (workspace.json creation at workspace creation, SessionStart context injection)

No single enforcement mechanism. The right tool for each constraint.

### D9: Agent Priority Discovery

A SessionStart hook reads plan.yaml and injects current week's due tactics into every agent session. This gives agents priority context without requiring Linear MCP configuration.

```
SessionStart → read plan.yaml → compute current week → inject:
  "This week's due tactics:
   T1.1: Ship landing page (Thomas, due week 1) — deliverable
   T1.2: Run 2 discovery calls (Thomas, weekly) — habit
   T2.1: Deploy identity quantum (Chicote, due week 1) — deliverable"
```

This works in every worktree, offline, without MCP. It's a file read, not an API call.

### D10: Linear Mapping — Projects, Not Initiatives

Linear projects map to deliverable tactics. Initiatives are not used.

| 12WY Concept | Linear Concept | Rationale |
|---|---|---|
| Goal | **plan.yaml only** | Goals are direction. Initiatives are designed for multi-team orgs — overkill for 3 people. plan.yaml already owns this layer. No duplication. |
| Tactic (deliverable) | Project | A deliverable tactic decomposes into tickets grouped in a Linear project. |
| Tactic (habit) | Nothing | Habits are recurring behaviors scored at WAM. They never become tickets. |
| Work items | Issues | Individual tasks within a project. |

**Why not initiatives:** Agonda v4 was a project in Linear but looked like a goal. The instinct to promote it to an initiative was wrong — it adds a hierarchy layer that serves no one at this scale. plan.yaml already tracks goals; duplicating them in Linear creates drift.

**Linear projects with milestones** give the same breakdown as initiatives with projects, without the extra layer. Agonda v4's four phases become milestones within one project.

### D11: CLI Never Talks to Linear

The Agonda CLI does not integrate with the Linear API. The `linear` field in workspace.json is a typed object with exact-match semantics:

```json
{
  "type": "issue | milestone | project",
  "id": "ALA-340",
  "project": "ALA-142"
}
```

The CLI stores this metadata but never validates it against Linear.

**Agent access:** Agents interact with Linear via the Linear MCP server. They can create issues, query projects, apply labels — all through MCP, not through the CLI.

**Convention enforcement:** The operations domain documents Linear conventions (naming, labels, project structure). Agents follow conventions from domain knowledge, not from CLI enforcement.

**Rationale:** API integration adds maintenance burden (auth, rate limits, error handling, schema changes) for marginal value. The CLI's job is governing plan.yaml and workspace.json. Linear is a separate system with its own access path (MCP).

**Impact on CLI:** The CLI can match exact issue IDs, exact project IDs, and milestone links with an explicit `project` field. It still cannot resolve which issues belong to which project unless that relationship is stored in workspace.json — that requires MCP.

### D12: Workspace Transitions — Metadata Only

All CLI transition commands (`complete`, `archive`, `graduate`) are metadata-only. They write to workspace.json but never move files on the file system.

- `agonda workspace complete <name>` → sets status to `ready-for-synthesis` (or `archived` with `--skip-synthesis`)
- `agonda workspace archive <name>` → sets status to `archived`
- `agonda workspace graduate <name> --repo <url>` → writes `graduated-to` array
- `agonda workspace validate` → catches drift between metadata and file location

The physical `git mv workspace/active/foo workspace/archive/foo` stays a deliberate human action, reviewable in a PR. Auto-moving is dangerous: links from MEMORY.md, other workspaces, and domain files break silently.

### D13: Four-Status Lifecycle

The workspace lifecycle has four statuses, not five. The old `complete` status was removed — it was a waiting room between "done" and "ready for synthesis."

```
active → ready-for-synthesis → synthesizing → archived
     ↘ archived (requires skip-synthesis reasoning)
```

When you finish a workspace, you know whether it has synthesis-worthy insights. One decision point, one command (`agonda workspace complete`), one fork (`--skip-synthesis` or not).

### D14: Linear Labels — Work Type Only

One label group, four labels. Exclusive (Linear enforces one-per-group).

| Label Group | Labels | Why |
|---|---|---|
| `Work Type` | Business, Internal, Change, Unplanned | Only source of work-type data for tickets without workspaces. Answers "what's displacing our planned work?" |

**Why work type labels:** Not every Linear issue has a workspace. Quick tickets, bug fixes, unplanned work live in Linear only. workspace.json `work_type` can't cover them. Work type labels fill that gap.

**Why NOT domain labels:** The project already implies the domain. A domain label is noise — it duplicates information you can infer from context.

**Why NOT more label groups:** For 3 people, every label group is overhead. The existing Bug/Feature/Improvement labels are fine but not formalized — agents use them naturally. Only formalize what you'd actually filter by.

**The `Unplanned` label is the most important one.** Phoenix Project insight: you can't manage unplanned work until you can see it. Tagging tickets as unplanned is the cheapest way to make the invisible visible. This feeds directly into WAM — "how much of our sprint was unplanned?" becomes a Linear query, not a guess.

### D15: Deliverable Tactic Completion Lives in plan.yaml

Deliverable tactics have explicit completion state in `plan.yaml`, managed through the CLI. The system does not infer tactic completion from Linear status or workspace lifecycle.

**Commands:**
- `agonda plan tactic complete <id>`
- `agonda plan tactic reopen <id>`

**Rationale:** `plan view` and `plan tactic list --overdue` need a durable source of truth. Linear tracks execution details. workspace.json tracks context and lifecycle. Neither should be overloaded to decide whether the committed tactic is done.

### D16: Current Week Is Computed, Not Stored

`plan.yaml` stores cycle start and end dates only. The current week is computed by the CLI from those dates and the current date.

**Rationale:** `week_current` is derived data and will drift if stored manually. The plan should hold facts, not cached views.

### D17: Constraint Visibility Lives in Linear

"Blocked on Alex" is execution state, so it lives in Linear through blocked status, assignee visibility, and dependencies. It is not modeled in `workspace.json`.

**Rationale:** blockage is ticket-level coordination data, not workspace identity. Multiple tickets in one workspace can have different blockers. Keeping it in Linear avoids duplicating execution state in repo metadata.

---

## Open Decisions

### O1: The Learning Layer

**The problem:** 15+ deep architecture sessions have generated compounding insights trapped in CONTINUE.md files and MEMORY.md. No cross-workspace visibility. No team-level learning memory.

**The tension:** Domain knowledge synthesis is too heavy for operational learnings. MEMORY.md is too agent-specific and too small. The taxonomy has no concept of "cross-workbench operational memory."

**Options to explore:**
- A: Lightweight learnings file per workspace (e.g., `learnings.md`) surfaced on observatory
- B: Team-level learnings file in operations domain (curated, cross-workspace)
- C: Extend CONTINUE.md convention to include a `## Learnings` section, scannable by dashboard
- D: New taxonomy concept — "operational insight" between workspace context and domain truth

### O2: Habit Reminders (Deferred)

Worth exploring long-term. Weekly rhythm sufficient for now per 12WY methodology.

### O3: 13th Week Review (Deferred)

Design after first 12-week cycle completes.

### O4: .workbench Schema Reconciliation — RESOLVED

**Resolved by:** workspace-json-schema.md (final schema) + D13 (four-status lifecycle) + `agonda workspace migrate` command.

All inconsistencies addressed:
- Fine-grained states → settled at four statuses (D13)
- `graduated` → `graduated-to` array field, not a status (metadata write via `agonda workspace graduate`)
- `name:` vs `workbench:` → migration command maps old field names
- `mode: iteration` → folded into `deliverable` field (text makes intent obvious)
- Eval fixture pollution → `workspace validate` can exclude non-workspace directories
