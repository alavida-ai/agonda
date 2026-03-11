# Operations System — Implementation Phases

Phased delivery plan. Each phase delivers value independently. Ordered by impact on the four gaps (direction, visibility, coordination, learnings).

## Phase 0: Bootstrap (No Code)

**Goal:** Start the honesty layer. No CLI needed — just process and one-time setup.

**Deliverables:**

| Task | Where | Effort |
|------|-------|--------|
| Create Work Type label group in Linear (Business, Internal, Change, Unplanned) | Linear UI or MCP | 5 min |
| Run first WAM using `processes/weekly-accountability.md` | Team meeting | 30 min |
| Apply Work Type labels to existing Linear tickets | Linear UI | 30 min |

**Stories served:** S4 (unplanned work awareness), S11 (execution trend starts), S16 (weekly honest assessment), S20 (breakdown diagnosis)

**Why first:** WAM is the forcing function. Everything else (CLI, dashboard) makes WAM easier — but WAM works with just plan.yaml open in a text editor. Start the habit before building the tools.

---

## Phase 1: Plan CLI

**Goal:** Close the direction gap. The team can see goals, tactics, and weekly priorities without asking Alex.

**Deliverables:**

| Command | What It Does |
|---------|-------------|
| `agonda plan view [--json]` | Unified view — goals, tactics, due this week, overdue. Scans workspace.json for tactic matches. |
| `agonda plan validate [--json]` | Schema + integrity check on plan.yaml |
| `agonda plan init` | Set cycle metadata (name, start, end, vision) |
| `agonda plan goal add/edit/remove/list` | Goal CRUD |
| `agonda plan tactic add/edit/remove/list/complete/reopen` | Tactic CRUD plus explicit completion state with filters (--owner, --due-week, --goal, --overdue, --type) |
| SessionStart hook | Reads plan.yaml, computes current week, injects due tactics into every agent session |

**Implementation notes:**
- All commands operate on `domains/operations/knowledge/plan.yaml`
- `plan view` needs to scan `workspace/**/workspace.json` files to show workspace paths next to linked tactics
- Deliverable completion is stored explicitly in `plan.yaml`; `plan tactic complete` and `plan tactic reopen` govern overdue logic
- Current week is computed from cycle dates; no `week_current` field is stored in `plan.yaml`
- SessionStart hook is a shell script in `.claude/hooks/` — reads plan.yaml, outputs context to stderr
- plan.yaml already exists with Cycle 2 data — commands work on real data from day one

**Stories served:** S1 (Alex priorities), S2 (Thomas self-service), S5 (commitment capture), S7 (agent priority discovery), S15 (workspace to plan), S19 (plan creation)

**Dependencies:** None. plan.yaml exists. Can build immediately.

**Acceptance criteria:**
- `agonda plan view` renders the current cycle with goals, tactics, due/overdue, linked workspaces
- `agonda plan validate` catches malformed plan.yaml (missing fields, bad references, duplicate IDs)
- `agonda plan tactic complete` marks a deliverable done and removes it from overdue views
- SessionStart hook injects this week's due tactics into agent context
- All commands support `--json` for agent consumption
- Thomas can run `agonda plan tactic list --owner Thomas` and see his commitments

---

## Phase 2: Workspace CLI

**Goal:** Close the visibility gap. See across all workspaces — who owns what, what type, what's stale.

**Deliverables:**

| Command | What It Does |
|---------|-------------|
| `agonda workspace list` | List/filter workspaces by --status, --owner, --stale, --tactic, --linear-type, --linear-id, --linear-project, --workbench, --work-type, --json |
| `agonda workspace create <name>` | Scaffold workspace directory with workspace.json, CONTINUE.md, LEARNINGS.md |
| `agonda workspace link` | Connect workspace to tactic (--tactic) or Linear (--linear-type, --linear-id, optional --linear-project) |
| `agonda workspace migrate` | One-time migration: .workbench → workspace.json for all existing workspaces |

**Implementation notes:**
- `workspace list` scans `workspace/**/workspace.json` files. Staleness = no git activity 14+ days on active workspaces.
- `workspace create` writes workspace.json with all required fields from flags. Validates work_type enum, checks domain exists, and rejects duplicate workspace names.
- `workspace migrate` reads old `.workbench` files, maps fields (name→workbench, infers status from location), writes workspace.json, removes `.workbench`.
- 15 existing workspaces need migration. Run `migrate` once, verify, commit.

**Stories served:** S3 (Chicote bridging), S6 (work type balance), S8 (agent workspace purpose), S10 (stale cleanup), S13 (async coordination), S17 (WIP awareness), S18 (ticket→goal tracing)

**Dependencies:** Phase 1 (plan view needs workspace scanning, and workspace list needs to exist for plan view to show workspace paths). Can be built in parallel if workspace scanning is extracted as shared logic.

**Acceptance criteria:**
- `agonda workspace list` shows all workspaces with status, owner, work type, staleness, linked tactic
- `agonda workspace list --stale` flags workspaces with no git activity for 14+ days
- `agonda workspace list --work-type business` shows portfolio split
- `agonda workspace migrate` converts all 15 .workbench files to workspace.json without data loss
- Chicote can run `agonda workspace list --linear-type issue --linear-id ALA-340` and find the workspace for that explicitly linked ticket

---

## Phase 3: Workspace Lifecycle

**Goal:** Completion culture. Workspaces close intentionally — synthesized or explicitly skipped.

**Deliverables:**

| Command | What It Does |
|---------|-------------|
| `agonda workspace complete <name>` | active → ready-for-synthesis (default) or active → archived (with --skip-synthesis "reason") |
| `agonda workspace archive <name>` | synthesizing → archived. Metadata only. Reminds to git mv. |
| `agonda workspace graduate <name> --repo <url>` | Stamp graduated-to metadata. Any status. |
| `agonda workspace validate` | Check integrity: required fields, valid enums, tactic references exist in plan.yaml, location drift (archived in active/), staleness |

**Implementation notes:**
- All transition commands are metadata-only — write to workspace.json, never move files
- `complete` and `archive` print a reminder: "Remember to move to workspace/archive/"
- `validate` bridges the gap between metadata and file system — catches archived workspaces still in `workspace/active/`
- `graduate` appends to `graduated-to` array, doesn't change status

**Stories served:** S10 (stale cleanup + synthesis), completion culture across all workspaces

**Dependencies:** Phase 2 (workspace commands must exist before lifecycle transitions make sense)

**Acceptance criteria:**
- `agonda workspace complete foo` sets status to ready-for-synthesis
- `agonda workspace complete foo --skip-synthesis "reason"` sets status to archived with reasoning
- `agonda workspace validate` catches 3+ archived workspaces still in workspace/active/
- No command moves files — all metadata-only
- Backwards transitions are rejected with a clear error

---

## Phase 4: Dashboard

**Goal:** Unified visual layer. One page that merges plan.yaml, workspace.json, and Linear data.

**Deliverables:**

| Task | What It Does |
|------|-------------|
| Update generate.js to read workspace.json | Replace old .workbench scanner with workspace.json scanner |
| Add plan section to dashboard | Goals, tactics, due/overdue, workspace links — from plan.yaml |
| Add work type portfolio view | Visual split: business vs internal vs change |
| Add staleness indicators | Flag stale workspaces visually |
| Linear ticket data (optional) | Pull project completion % from Linear API at build time |

**Implementation notes:**
- generate.js already exists and scans the repo — needs updating, not rewriting
- Plan data section mirrors `agonda plan view` output
- Linear API integration requires `LINEAR_API_KEY` env var — optional enhancement, not blocking
- Dashboard is a static HTML file generated at build time, not a live app

**Stories served:** S1 (unified view), S6 (work type split visual), S13 (async coordination visual), S17 (WIP visual)

**Dependencies:** Phase 2 (workspace.json files must exist for scanner to read)

**Acceptance criteria:**
- Dashboard shows goals and tactics from plan.yaml
- Dashboard shows all workspaces from workspace.json with status, owner, work type
- Stale workspaces are visually flagged
- Work type portfolio split is visible at a glance
- Dashboard generates successfully with `node generate.js`

---

## Phase Summary

| Phase | What It Delivers | Key Stories | Dependencies |
|-------|-----------------|-------------|-------------|
| **0: Bootstrap** | WAM + Linear labels | S4, S11, S16, S20 | None |
| **1: Plan CLI** | Direction visibility + agent priority injection | S1, S2, S5, S7, S15, S19 | None |
| **2: Workspace CLI** | Cross-workspace visibility + migration | S3, S6, S8, S10, S13, S17, S18 | Phase 1 (shared scanning) |
| **3: Lifecycle** | Completion culture + validation | S10 (synthesis), hygiene | Phase 2 |
| **4: Dashboard** | Unified visual layer | S1, S6, S13, S17 (visual) | Phase 2 |

**Phases 1 and 2 can be built in parallel** if workspace.json scanning is extracted as shared infrastructure early. Phase 0 can start tomorrow. Phase 3 and 4 depend on Phase 2.

## What's Deferred

| Item | Why | When to Revisit |
|------|-----|----------------|
| Scorecard YAML files | Conversation-first. Score at WAM, don't file it. | After cycle 1 — if execution data has value beyond the meeting |
| Learning layer (O1) | Needs operational data to design well | After running WAM for 4+ weeks |
| Synthesis handoff command | Need an explicit owner for `ready-for-synthesis → synthesizing` if workspace.json remains CLI-managed | Before Phase 3 ships |
| Constraint visibility (S14) | Use Linear execution state and dependencies, not workspace metadata | Revisit only if Linear proves insufficient |
| 13th week review (O3) | Design after first cycle completes | Week 13 of Cycle 2 |
| Plan cycle edit command | Rare need — hand-edit plan.yaml | If it becomes a recurring annoyance |

## Implementation Context

- **CLI repo:** `/Users/alexandergirardet/alavida/agonda-cli/` (agonda-cli, existing codebase)
- **Knowledge base repo:** This repo (Alavida knowledge base)
- **plan.yaml:** Already exists at `domains/operations/knowledge/plan.yaml` with Cycle 2 data
- **Existing .workbench files:** 15 need migration
- **Dashboard:** `workspace/active/architecture/agonda-dashboard/generate.js` (reads old format)
