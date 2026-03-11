# Agonda CLI — Implementation Specification

> **Scope:** This document is the complete implementation spec for the Agonda CLI v1. It covers the `plan` and `workspace` command groups — the operations layer of the Agonda framework. No other commands exist in v1.
>
> **Source:** Synthesized from the project-tracking design workspace: [decisions.md](decisions.md), [cli-design.md](cli-design.md), [workspace-json-schema.md](workspace-json-schema.md), [domain-model.md](domain-model.md), [phases.md](phases.md), [user-stories.md](user-stories.md).

---

## 1. What This CLI Does

The Agonda CLI manages two file-based data stores in a git repository:

- **plan.yaml** — the 12-week execution plan (goals, tactics, cycle metadata)
- **workspace.json** — per-workspace manifests (who, what, why, status, links)

It is the **single writer** for both. Humans and agents are read-only consumers. The CLI validates on every write, enforces lifecycle transitions, and provides structured queries.

### What it does NOT do

- Talk to the Linear API (agents use Linear MCP; humans use the Linear UI)
- Manage workbench plugins, marketplace, or primitives (out of scope for v1)
- Run health checks on domains or skills
- Move files on the filesystem (all transitions are metadata-only)
- Prompt interactively (all mutations are flag-based)

---

## 2. Conventions

### 2.1 Repo Discovery

The CLI operates inside a git repository structured with the Agonda framework. On every invocation, walk up from `cwd` to find the repo root (the nearest ancestor containing a `.git` directory). All paths are resolved relative to this root.

**Fixed paths from repo root:**

| File | Path |
|------|------|
| plan.yaml | `domains/operations/knowledge/plan.yaml` |
| workspace.json (per workspace) | `workspace/{active,archive}/**/{name}/workspace.json` |

If the repo root cannot be found, exit with code 1 and the message: `Error: not inside an Agonda repository`.

### 2.2 Output Modes

Every read command supports two output modes:

| Mode | Flag | Format | Audience |
|------|------|--------|----------|
| Human | (default) | Formatted text with alignment, colors (when TTY), and unicode indicators | Humans in terminal |
| JSON | `--json` | Structured JSON to stdout, one top-level object | Agents, scripts, dashboards |

Write commands output a confirmation line to stdout (human mode) or a JSON result object (with `--json`).

### 2.3 Exit Codes

| Code | Meaning | When |
|------|---------|------|
| `0` | Success | Command completed |
| `1` | Error | Unexpected failure (IO error, missing repo, malformed YAML) |
| `2` | Validation failure | Schema violation, invalid transition, missing required field |

Errors go to **stderr**. Data goes to **stdout**. This allows `agonda plan view --json | jq .tactics` to work even when warnings are present.

### 2.4 Flags

- All flags use `--kebab-case` (e.g., `--due-week`, `--work-type`, `--skip-synthesis`)
- Required flags that are missing produce exit code 2 with a message listing the missing flags
- Boolean flags are `--flag` (true) or omitted (false) — no `--no-flag` negation
- Multiple filter flags on query commands are AND-combined

### 2.5 Timestamps

- All dates in plan.yaml and workspace.json are ISO-8601 date strings: `YYYY-MM-DD`
- The CLI computes "today" from the system clock. There is no `--date` override flag in v1.

---

## 3. Data Schemas

### 3.1 plan.yaml

Located at `domains/operations/knowledge/plan.yaml`. One file per repo. Contains cycle metadata, goals, and tactics.

```yaml
cycle:
  name: "Cycle 2"           # string, required
  start: "2026-03-10"       # ISO date, required
  end: "2026-06-01"         # ISO date, required

vision: >                    # string, required — multi-line allowed
  By June, Agonda has 3 paying clients...

goals:                       # array, required, 1-3 items
  - id: G1                   # string, required, unique across goals, format: G{n}
    name: "Close 3 paid client engagements"  # string, required
    owner: Thomas            # string, required
    lag_measure: "Number of signed contracts" # string, required
    target: 3                # number, required
    current: 0               # number, required

tactics:                     # array, required
  - id: T1.1                 # string, required, unique across tactics, format: T{goal}.{n}
    goal: G1                 # string, required, must reference existing goal id
    text: "Schedule 3 discovery calls per week" # string, required
    owner: Thomas            # string, required
    type: habit              # enum: "habit" | "deliverable", required
    cadence: weekly          # string, required for habits — free text (weekly, daily, per-event, ongoing)
    # --- deliverable-only fields ---
    # due_week: 2            # number, required for deliverables, must be within cycle week range
    # completed: false       # boolean, required for deliverables
    # completed_at:          # ISO date or null, required for deliverables (set when completed: true)
    # completed_by:          # string or null, required for deliverables (set when completed: true)
```

**Validation rules:**

| Rule | Error |
|------|-------|
| `cycle.start` < `cycle.end` | "Cycle start must be before end" |
| `cycle.start` and `cycle.end` are valid ISO dates | "Invalid date: {value}" |
| Goals array has 1-3 items | "Plan must have 1-3 goals, found {n}" |
| Goal IDs are unique | "Duplicate goal ID: {id}" |
| Tactic IDs are unique | "Duplicate tactic ID: {id}" |
| Tactic `goal` references an existing goal ID | "Tactic {id} references non-existent goal: {goal}" |
| Deliverable tactics have `due_week` | "Deliverable tactic {id} missing due_week" |
| Deliverable tactics have `completed` (boolean) | "Deliverable tactic {id} missing completed field" |
| If `completed: true`, `completed_at` and `completed_by` must be set | "Completed tactic {id} missing completed_at/completed_by" |
| Habit tactics have `cadence` | "Habit tactic {id} missing cadence" |
| `due_week` is within cycle range (1 to ceil(cycle duration / 7)) | "Tactic {id} due_week {n} outside cycle range 1-{max}" |

**Computed values (not stored):**

| Value | Computation |
|-------|-------------|
| Current week | `floor((today - cycle.start) / 7) + 1` — clamped to 1..max_weeks |
| Max weeks | `ceil((cycle.end - cycle.start) / 7)` |
| Last edited | `git log -1 --format=%aI -- {plan.yaml path}` |
| Overdue | Deliverable where `due_week < current_week` AND `completed !== true` |

### 3.2 workspace.json

Located at `{workspace_dir}/workspace.json` within each workspace directory. One file per workspace.

```json
{
  "workbench": "website-dev",
  "domain": "value",
  "created": "2026-03-10",
  "status": "active",
  "owner": "Thomas",
  "deliverable": "Landing page with lead capture live on agonda.ai",
  "work_type": "business",
  "tactic": "T1.3",
  "linear": {
    "type": "project",
    "id": "ALA-142"
  },
  "graduated-to": ["alavida-ai/website"],
  "skip-synthesis": null
}
```

**Fields:**

| Field | Type | Required | Set By | Description |
|-------|------|----------|--------|-------------|
| `workbench` | string | Yes | `create` | Plugin name that created this workspace |
| `domain` | string | Yes | `create` | Domain the workbench belongs to |
| `created` | string (ISO date) | Yes | `create` | Creation date |
| `status` | enum | Yes | `create`, `complete`, `archive` | Lifecycle state (see 4.1) |
| `owner` | string | Yes | `create` | Accountable person |
| `deliverable` | string | Yes | `create` | What this workspace produces or explores |
| `work_type` | enum | Yes | `create` | `"business"` \| `"internal"` \| `"change"` |
| `tactic` | string \| null | No | `create`, `link` | Tactic ID from plan.yaml |
| `linear` | object \| null | No | `create`, `link` | Typed Linear reference |
| `linear.type` | enum | Yes (if linear) | — | `"issue"` \| `"milestone"` \| `"project"` |
| `linear.id` | string | Yes (if linear) | — | Linear object identifier |
| `linear.project` | string | No | — | Parent project (required for milestone type) |
| `graduated-to` | string[] | No | `graduate` | Repos spawned from this workspace |
| `skip-synthesis` | string \| null | No | `complete --skip-synthesis` | Reason for skipping synthesis |

**Validation rules:**

| Rule | Error |
|------|-------|
| All required fields present | "workspace.json missing required field: {field}" |
| `status` is valid enum | "Invalid status: {value}. Must be one of: active, ready-for-synthesis, synthesizing, archived" |
| `work_type` is valid enum | "Invalid work_type: {value}. Must be one of: business, internal, change" |
| `linear.type` is valid enum (if present) | "Invalid linear.type: {value}" |
| `linear.project` present when `linear.type` is `milestone` | "Milestone links require a project field" |
| `tactic` references an existing tactic in plan.yaml (if set) | Warning only — tactic may be from a previous cycle |
| `skip-synthesis` only set when status is `archived` | "skip-synthesis set but status is not archived" |

---

## 4. Workspace Lifecycle

### 4.1 Status States

```
active ──→ ready-for-synthesis ──→ synthesizing ──→ archived
  │                                                     ▲
  └──────────────── (--skip-synthesis "reason") ────────┘
```

| Status | Meaning | Entry Condition |
|--------|---------|-----------------|
| `active` | Work in progress | Created via `workspace create` |
| `ready-for-synthesis` | Done — insights waiting for promotion to domain knowledge | Via `workspace complete` (without `--skip-synthesis`) |
| `synthesizing` | Synthesis pipeline is actively processing | Set externally (synthesis agent writes directly or future CLI command) |
| `archived` | Terminal. Value captured or explicitly skipped. | Via `workspace archive` (from synthesizing) or `workspace complete --skip-synthesis` (from active) |

### 4.2 Transition Rules

| From | To | Command | Conditions |
|------|----|---------|------------|
| `active` | `ready-for-synthesis` | `workspace complete <name>` | — |
| `active` | `archived` | `workspace complete <name> --skip-synthesis "reason"` | Reason string required |
| `ready-for-synthesis` | `synthesizing` | Direct write to workspace.json (synthesis agent) | Not CLI-managed in v1 |
| `synthesizing` | `archived` | `workspace archive <name>` | — |

**Rejected transitions:**

- Any backwards transition (e.g., `archived` → `active`) → exit 2: `"Cannot transition from {current} to {target}. No backwards transitions — create a new workspace."`
- `archive` from any status other than `synthesizing` → exit 2: `"Cannot archive from {status}. Archive is only valid from synthesizing. Use 'workspace complete' to close an active workspace."`
- `complete` from any status other than `active` → exit 2: `"Cannot complete from {status}. Only active workspaces can be completed."`

### 4.3 Metadata-Only Principle

All CLI transition commands write to `workspace.json` only. They **never** move, rename, or delete files or directories. After `complete` or `archive`, the CLI prints a reminder:

```
Remember: move to workspace/archive/ when ready — git mv workspace/active/{name} workspace/archive/{name}
```

The `workspace validate` command detects drift between status and filesystem location (see 5.2.7).

### 4.4 Staleness

A workspace is **stale** when:
- Status is `active`
- No git activity in the workspace directory for 14+ days

Staleness is computed by: `git log -1 --format=%aI -- {workspace_dir}`. If the most recent commit touching any file in that directory is older than 14 days, the workspace is stale.

---

## 5. Commands

### 5.1 Plan Commands

#### 5.1.1 `agonda plan view`

Display the current cycle: goals, tactics, due/overdue, linked workspaces.

**Flags:** `--json`

**Human output:**
```
Week 3 of 12 — Cycle 2
Last edited: 2026-03-15 (4 days ago)

GOALS
  G1  Close 3 paid client engagements              Thomas  0/3
  G2  Ship 5 public workbenches to GitHub           Alex    0/5
  G3  Produce 60 pieces of short-form content       Thomas  0/60

DUE THIS WEEK
  T1.3  Complete BarryOS website build              Thomas  deliverable  wk 2  → workspace/active/barryos-website
  T2.2  Ship content-creator workbench              Chicote deliverable  wk 3
  T1.1  Schedule 3 discovery calls per week         Thomas  habit        weekly

OVERDUE
  T2.1  Ship website-dev workbench                  Alex    deliverable  wk 1  → workspace/active/website
  T1.4  Run rehearsal sales call                    Thomas  deliverable  wk 1
```

**JSON output:**
```json
{
  "cycle": {
    "name": "Cycle 2",
    "start": "2026-03-10",
    "end": "2026-06-01",
    "current_week": 3,
    "max_weeks": 12,
    "last_edited": "2026-03-15",
    "last_edited_days_ago": 4
  },
  "vision": "By June, Agonda has 3 paying clients...",
  "goals": [
    {
      "id": "G1",
      "name": "Close 3 paid client engagements",
      "owner": "Thomas",
      "lag_measure": "Number of signed contracts",
      "target": 3,
      "current": 0
    }
  ],
  "due_this_week": [
    {
      "id": "T1.3",
      "goal": "G1",
      "text": "Complete BarryOS website build",
      "owner": "Thomas",
      "type": "deliverable",
      "due_week": 2,
      "completed": false,
      "workspace_path": "workspace/active/barryos-website"
    }
  ],
  "overdue": [
    {
      "id": "T2.1",
      "goal": "G2",
      "text": "Ship website-dev workbench",
      "owner": "Alex",
      "type": "deliverable",
      "due_week": 1,
      "completed": false,
      "workspace_path": "workspace/active/website"
    }
  ],
  "habits": [
    {
      "id": "T1.1",
      "goal": "G1",
      "text": "Schedule 3 discovery calls per week",
      "owner": "Thomas",
      "cadence": "weekly"
    }
  ]
}
```

**Workspace path resolution:** Scan all `workspace/**/workspace.json` files. For each tactic in plan.yaml, if any workspace has a matching `tactic` field, include the workspace path in the output.

#### 5.1.2 `agonda plan validate`

Validate plan.yaml schema and integrity.

**Flags:** `--json`

**Human output (valid):**
```
✓ plan.yaml is valid (3 goals, 14 tactics, cycle: Mar 10 - Jun 1)
```

**Human output (invalid):**
```
✗ plan.yaml has 2 errors:
  - Tactic T1.3 missing due_week (deliverable requires due_week)
  - Tactic T2.5 references non-existent goal: G4
```

**JSON output:**
```json
{
  "valid": false,
  "goals_count": 3,
  "tactics_count": 14,
  "errors": [
    { "field": "tactics[4].due_week", "message": "Deliverable tactic T1.3 missing due_week" },
    { "field": "tactics[12].goal", "message": "Tactic T2.5 references non-existent goal: G4" }
  ]
}
```

**Exit code:** 0 if valid, 2 if validation errors.

#### 5.1.3 `agonda plan init`

Set cycle metadata. Creates or overwrites the cycle section. Preserves existing goals and tactics if present.

**Flags (all required):**
- `--name` — cycle name (string)
- `--start` — cycle start date (ISO date)
- `--end` — cycle end date (ISO date)
- `--vision` — cycle vision statement (string)

**Example:**
```bash
agonda plan init \
  --name "Cycle 2" \
  --start 2026-03-10 \
  --end 2026-06-01 \
  --vision "By June, Agonda has 3 paying clients..."
```

**Behavior:**
- If plan.yaml does not exist, create it with the cycle section and empty goals/tactics arrays
- If plan.yaml exists, overwrite cycle and vision fields only
- Validate after write

#### 5.1.4 `agonda plan goal add`

**Required flags:** `--id`, `--name`, `--owner`, `--lag-measure`, `--target`

**Optional flags:** `--current` (defaults to 0)

**Validation:** Reject duplicate IDs. Reject if goals count would exceed 3.

**JSON output:**
```json
{ "action": "goal_added", "id": "G1" }
```

#### 5.1.5 `agonda plan goal edit`

**Positional:** goal ID

**Optional flags:** `--name`, `--owner`, `--lag-measure`, `--target`, `--current`

Only provided flags are updated. At least one flag must be provided.

**Example:** `agonda plan goal edit G1 --current 1`

#### 5.1.6 `agonda plan goal remove`

**Positional:** goal ID

**Behavior:** Remove the goal. Warn (to stderr) if tactics reference this goal, but proceed. The referencing tactics are NOT auto-deleted — they become orphaned and will fail validation.

#### 5.1.7 `agonda plan goal list`

**Flags:** `--json`

Lists all goals. No filtering (there are at most 3).

#### 5.1.8 `agonda plan tactic add`

**Required flags:** `--id`, `--goal`, `--text`, `--owner`, `--type`

**Conditional flags:**
- If `--type deliverable`: `--due-week` required. CLI auto-sets `completed: false`, `completed_at: null`, `completed_by: null`.
- If `--type habit`: `--cadence` required.

**Validation:** Reject duplicate IDs. Reject if goal reference doesn't exist.

#### 5.1.9 `agonda plan tactic edit`

**Positional:** tactic ID

**Optional flags:** `--goal`, `--text`, `--owner`, `--type`, `--due-week`, `--cadence`

Type changes (habit ↔ deliverable) require the new type's required fields.

#### 5.1.10 `agonda plan tactic remove`

**Positional:** tactic ID

Removes the tactic from plan.yaml. No cascading effects.

#### 5.1.11 `agonda plan tactic list`

**Filter flags (all optional, AND-combined):**
- `--owner <name>`
- `--due-week <n>`
- `--goal <id>`
- `--overdue` — deliverables where `due_week < current_week` and `completed !== true`
- `--type <habit|deliverable>`
- `--json`

**JSON output:**
```json
{
  "tactics": [
    {
      "id": "T1.1",
      "goal": "G1",
      "text": "Schedule 3 discovery calls per week",
      "owner": "Thomas",
      "type": "habit",
      "cadence": "weekly"
    }
  ],
  "filters_applied": { "owner": "Thomas" }
}
```

#### 5.1.12 `agonda plan tactic complete`

**Positional:** tactic ID

Marks a deliverable tactic as completed. Rejects if tactic is a habit.

**Writes to plan.yaml:**
- `completed: true`
- `completed_at: {today}`
- `completed_by: {--by flag or "cli"}`

**Optional flags:** `--by <name>` (defaults to `"cli"`)

#### 5.1.13 `agonda plan tactic reopen`

**Positional:** tactic ID

Clears completion state. Rejects if tactic is a habit or not currently completed.

**Writes:**
- `completed: false`
- `completed_at: null`
- `completed_by: null`

---

### 5.2 Workspace Commands

#### 5.2.1 `agonda workspace create`

**Positional:** workspace name (used as directory name, must be lowercase kebab-case)

**Required flags:**
- `--workbench <name>`
- `--domain <name>`
- `--owner <name>`
- `--deliverable <text>`
- `--work-type <business|internal|change>`

**Optional flags:**
- `--tactic <id>` — link to plan.yaml tactic
- `--linear-type <issue|milestone|project>` — requires `--linear-id`
- `--linear-id <id>` — Linear object identifier
- `--linear-project <id>` — parent project (required if `--linear-type milestone`)

**Creates:**
```
workspace/active/{name}/
├── workspace.json     # all fields from flags, status: active, created: today
├── CONTINUE.md        # template with deliverable as heading
└── LEARNINGS.md       # empty file
```

**CONTINUE.md template:**
```markdown
# {name}

## Status: IN PROGRESS

## Deliverable
{deliverable}

## Next Step
{blank — to be filled by the user or agent}
```

**Validation:**
- Rejects if `workspace/active/{name}/` already exists
- Rejects if name is not lowercase kebab-case (regex: `^[a-z0-9]+(-[a-z0-9]+)*$`)
- Validates workspace.json after write (full schema check)
- If `--tactic` is provided, warns (does not block) if tactic not found in plan.yaml

**JSON output:**
```json
{
  "action": "workspace_created",
  "name": "barryos-website",
  "path": "workspace/active/barryos-website",
  "workspace_json": { ... }
}
```

#### 5.2.2 `agonda workspace list`

**Filter flags (all optional, AND-combined):**
- `--status <active|ready-for-synthesis|synthesizing|archived>`
- `--owner <name>`
- `--stale` — active workspaces with no git activity for 14+ days
- `--tactic <id>`
- `--linear-type <issue|milestone|project>` — requires `--linear-id`
- `--linear-id <id>`
- `--linear-project <id>` — matches `linear.id` for project-type links, or `linear.project` for milestone-type links
- `--workbench <name>`
- `--work-type <business|internal|change>`
- `--json`

**Scanning:** Recursively find all `workspace.json` files under `workspace/` (both `active/` and `archive/`). Parse each. Apply filters.

**Human output:**
```
ACTIVE (12)  [3 business, 7 internal, 2 change]
  barryos-website          Thomas   business   1d ago   T1.3  project:ALA-142
  project-tracking         Alex     internal   3d ago
  intent-adoption          Alex     internal   21d ago  ⚠ stale

READY FOR SYNTHESIS (1)
  synthesis-evals          Alex     internal   5d ago

ARCHIVED (4)
  data-mesh                Alex     internal   45d ago
  ...
```

**JSON output:**
```json
{
  "workspaces": [
    {
      "name": "barryos-website",
      "path": "workspace/active/barryos-website",
      "workbench": "website-dev",
      "domain": "value",
      "status": "active",
      "owner": "Thomas",
      "deliverable": "Landing page with lead capture live on agonda.ai",
      "work_type": "business",
      "tactic": "T1.3",
      "linear": { "type": "project", "id": "ALA-142" },
      "last_activity": "2026-03-09",
      "last_activity_days_ago": 1,
      "stale": false
    }
  ],
  "summary": {
    "total": 17,
    "by_status": { "active": 12, "ready-for-synthesis": 1, "synthesizing": 0, "archived": 4 },
    "by_work_type": { "business": 3, "internal": 12, "change": 2 },
    "stale_count": 2
  },
  "filters_applied": {}
}
```

**Last activity:** Computed via `git log -1 --format=%aI -- {workspace_dir}` for each workspace.

#### 5.2.3 `agonda workspace link`

Connect a workspace to a plan tactic or Linear object.

**Workspace resolution:** Uses `--path <relative_path>` to identify the workspace. If omitted, looks for `workspace.json` in cwd.

**Optional flags (at least one required):**
- `--tactic <id>`
- `--linear-type <issue|milestone|project>` — requires `--linear-id`
- `--linear-id <id>`
- `--linear-project <id>`
- `--path <relative_path>` — workspace directory relative to repo root

**Behavior:** Merges provided fields into the existing workspace.json. Does not clear fields that aren't provided. If `--tactic` is given, overwrites the existing tactic. If `--linear-type` and `--linear-id` are given, overwrites the existing linear object.

#### 5.2.4 `agonda workspace complete`

Close an active workspace.

**Positional:** workspace name (matched against `workspace/**/workspace.json` by scanning — the `name` is the directory name, not a field in workspace.json)

**Optional flags:**
- `--skip-synthesis <reason>` — archive directly with reasoning

**Without `--skip-synthesis`:**
- Validates status is `active` (exit 2 otherwise)
- Sets `status: "ready-for-synthesis"`
- Prints: `"{name} queued for synthesis."`

**With `--skip-synthesis "reason"`:**
- Validates status is `active`
- Sets `status: "archived"`, `skip-synthesis: "{reason}"`
- Prints: `"{name} archived. Remember: move to workspace/archive/ when ready."`

**JSON output:**
```json
{
  "action": "workspace_completed",
  "name": "project-tracking",
  "new_status": "ready-for-synthesis",
  "reminder": "move to workspace/archive/ when ready"
}
```

#### 5.2.5 `agonda workspace archive`

Terminal transition from synthesizing.

**Positional:** workspace name

**Behavior:**
- Validates status is `synthesizing` (exit 2 otherwise)
- Sets `status: "archived"`
- Prints: `"{name} archived. Remember: move to workspace/archive/ when ready."`

#### 5.2.6 `agonda workspace graduate`

Stamp metadata recording that this workspace produced an independent codebase.

**Positional:** workspace name

**Required flags:** `--repo <identifier>` (e.g., `alavida-ai/website` or a full URL)

**Behavior:**
- Appends to the `graduated-to` array (creates it if missing)
- Does NOT change status
- Works from any status

**JSON output:**
```json
{
  "action": "workspace_graduated",
  "name": "website-planning",
  "repo": "alavida-ai/website",
  "graduated_to": ["alavida-ai/website"]
}
```

#### 5.2.7 `agonda workspace validate`

Check workspace.json integrity across all workspaces and detect filesystem drift.

**Flags:** `--json`

**Checks:**

| Check | Severity | Description |
|-------|----------|-------------|
| Required fields | Error | All required workspace.json fields present |
| Valid enums | Error | `status`, `work_type`, `linear.type` are valid values |
| Tactic exists | Warning | `tactic` field references an ID in plan.yaml |
| Milestone has project | Error | `linear.type: "milestone"` has `linear.project` set |
| Location drift (archived in active/) | Warning | Status is `archived` but directory is under `workspace/active/` |
| Location drift (active in archive/) | Error | Status is `active` or `ready-for-synthesis` but directory is under `workspace/archive/` |
| Stale detection | Warning | Status is `active` with no git activity for 14+ days |
| Skip-synthesis consistency | Error | `skip-synthesis` is set but status is not `archived` |

**Human output:**
```
✓ 12 active workspaces valid
⚠ 3 archived workspaces still in workspace/active/:
    synthesis-evals → move to workspace/archive/
    development-environment → move to workspace/archive/
    data-mesh → move to workspace/archive/
⚠ 2 active workspaces stale (14+ days):
    intent-adoption (21 days)
    agentic-mesh (18 days)
✗ 1 error:
    event-driven: active workspace in workspace/archive/ — should be in workspace/active/
```

**JSON output:**
```json
{
  "valid": false,
  "workspaces_checked": 17,
  "errors": [
    {
      "workspace": "event-driven",
      "path": "workspace/archive/event-driven",
      "check": "location_drift",
      "severity": "error",
      "message": "Active workspace in workspace/archive/"
    }
  ],
  "warnings": [
    {
      "workspace": "synthesis-evals",
      "path": "workspace/active/architecture/synthesis-evals",
      "check": "location_drift",
      "severity": "warning",
      "message": "Archived workspace still in workspace/active/"
    },
    {
      "workspace": "intent-adoption",
      "path": "workspace/active/architecture/intent-adoption",
      "check": "stale",
      "severity": "warning",
      "message": "No git activity for 21 days"
    }
  ]
}
```

**Exit code:** 0 if no errors (warnings are OK), 2 if any errors.

#### 5.2.8 `agonda workspace migrate`

One-time migration from old `.workbench` format to `workspace.json`.

**Optional flags:**
- `--path <relative_path>` — migrate a single workspace (defaults to all)
- `--mapping <file>` — JSON file mapping workspace names to missing required fields
- `--dry-run` — show what would change without writing

**Mapping file format:**
```json
{
  "barryos-website": {
    "owner": "Thomas",
    "deliverable": "Landing page with lead capture",
    "work_type": "business"
  },
  "intent-adoption": {
    "owner": "Alex",
    "deliverable": "Evaluate TanStack Intent for Agonda",
    "work_type": "internal"
  }
}
```

**Behavior per workspace:**
1. Read `.workbench` file (YAML or JSON — handle both)
2. Map fields: `name` → `workbench` (old convention), `workbench` → `workbench` (new convention)
3. Infer `status` from location: under `workspace/archive/` → `"archived"`, otherwise `"active"`
4. Pull `owner`, `deliverable`, `work_type` from mapping file (error if missing and no mapping)
5. Carry forward any existing fields that match the new schema (`domain`, `tactic`, `linear`)
6. Write `workspace.json`
7. Delete `.workbench`

**Dry run output:** List each workspace with old → new field mapping, highlighting missing fields.

---

## 6. SessionStart Hook

A shell script that injects plan context into every agent session. Designed as a Claude Code hook on the `SessionStart` event.

**Location:** `.claude/hooks/plan-context.sh`

**Behavior:**
1. Find repo root
2. Read `domains/operations/knowledge/plan.yaml`
3. Compute current week from cycle dates
4. Extract tactics due this week + overdue
5. Output to stderr (hooks communicate via stderr)

**Output format:**
```
📋 Week 3 of 12 — Cycle 2

Due this week:
  T1.3  Complete BarryOS website build         Thomas  deliverable
  T2.2  Ship content-creator workbench         Chicote deliverable
  T1.1  Schedule 3 discovery calls/week        Thomas  habit

Overdue:
  T2.1  Ship website-dev workbench             Alex    wk 1
  T1.4  Run rehearsal sales call               Thomas  wk 1
```

**Implementation option:** The hook can either:
- Call `agonda plan view` and pipe the output (requires CLI to be installed)
- Be a standalone script that parses plan.yaml directly (no CLI dependency)

The standalone option is recommended for v1 — it removes the circular dependency of needing the CLI installed before the hook works.

**Hook registration** (in `.claude/hooks/hooks.json` or equivalent):
```json
{
  "hooks": {
    "SessionStart": [{
      "type": "command",
      "command": ".claude/hooks/plan-context.sh",
      "rationale": "Agents lose priority context without per-session plan injection",
      "timeout": 5
    }]
  }
}
```

---

## 7. Workspace Name Resolution

Several commands take a workspace name as a positional argument. Resolution works as follows:

1. Scan all `workspace/**/workspace.json` files
2. The **workspace name** is the immediate parent directory name of `workspace.json`
3. Match the positional argument against workspace names
4. If exactly one match → use it
5. If zero matches → exit 2: `"Workspace not found: {name}"`
6. If multiple matches → exit 2: `"Ambiguous workspace name: {name}. Found at: {path1}, {path2}. Use --path to disambiguate."`

**Example:** `workspace/active/architecture/project-tracking/workspace.json` → name is `project-tracking`.

---

## 8. Implementation Phases

### Phase 1: Plan CLI
- `plan view`, `plan validate`, `plan init`
- `plan goal add/edit/remove/list`
- `plan tactic add/edit/remove/list/complete/reopen`
- SessionStart hook (standalone script)
- **Dependencies:** None. plan.yaml exists with real data.

### Phase 2: Workspace CLI
- `workspace list`, `workspace create`, `workspace link`
- `workspace migrate`
- **Dependencies:** Shares workspace scanning logic with `plan view` (for workspace-tactic linking).

### Phase 3: Workspace Lifecycle
- `workspace complete`, `workspace archive`, `workspace graduate`, `workspace validate`
- **Dependencies:** Phase 2 (workspace commands must exist).

### Phase 4: Dashboard
- Update `generate.js` to read workspace.json instead of `.workbench`
- Add plan.yaml data to dashboard
- **Dependencies:** Phase 2 (workspace.json files must exist).

---

## 9. Tech Stack

| Choice | Rationale |
|--------|-----------|
| **TypeScript** | Type safety for schema validation, good CLI ecosystem |
| **Node.js** | Same runtime as dashboard generate.js, npm distribution |
| **Commander.js** | Mature CLI framework, supports subcommands, auto-help |
| **js-yaml** | Parse and write plan.yaml |
| **chalk** | Terminal colors (when TTY) |
| **vitest** | Fast test runner, TypeScript-native |

**Distribution:** npm package (`@alavida/agonda-cli` or `agonda`). Install globally via `npm install -g`.

**Minimum Node version:** 20 (LTS).

---

## 10. Testing Strategy

### Unit tests
- plan.yaml parser + validator (happy path + every validation rule)
- workspace.json parser + validator
- Lifecycle transition logic (valid transitions + every rejection)
- Current week computation (edge cases: before cycle, after cycle, mid-cycle)
- Workspace name resolution (unique, ambiguous, not found)

### Integration tests
- `plan view` with real plan.yaml fixture
- `workspace list` scanning a fixture directory tree
- `workspace create` scaffolding + validation roundtrip
- `workspace complete` → `archive` lifecycle flow
- `migrate` from `.workbench` fixtures
- `--json` output matches documented schemas

### Fixture approach
- `test/fixtures/` directory with sample plan.yaml and workspace trees
- Each test copies fixtures to a temp directory for isolation
- Git-initialized temp repos for staleness / last-activity tests
