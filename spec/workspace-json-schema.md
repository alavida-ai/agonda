# workspace.json Schema

The manifest file at every workspace root. Managed exclusively by the Agonda CLI — never hand-edited. Agents and dashboards are read-only consumers.

## Schema

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
  }
}
```

## Fields

### Set at creation

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `workbench` | string | Yes | Which workbench created this workspace. Maps to a plugin name in the marketplace. |
| `domain` | string | Yes | Which domain the workbench belongs to. |
| `created` | string (ISO date) | Yes | When the workspace was created. |
| `owner` | string | Yes | Who is accountable for this workspace. A person name, not a role. |
| `deliverable` | string | Yes | What this workspace is producing or exploring. Works for both builds and explorations — the text makes it obvious. |
| `work_type` | string | Yes | One of: `business`, `internal`, `change`. Categorizes the work for portfolio visibility. Unplanned work is tracked at WAM, not as a workspace type. |

### Set at transitions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | Yes | Current lifecycle state. See Status Lifecycle below. Set by CLI during transitions. |
| `skip-synthesis` | string | When archiving without synthesis | Reasoning for skipping synthesis. Required by CLI when transitioning directly from `active` to `archived`. |

### Set when linking

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tactic` | string | No | Tactic ID from plan.yaml (e.g. `T1.3`). Connects this workspace to the plan. |
| `linear` | object | No | Typed Linear link. Exact-match only. The CLI stores it but never resolves relationships from Linear. |
| `graduated-to` | string[] | No | Repository identifiers (e.g. `alavida-ai/website`). Present when this workspace produced independent codebases. |

### `linear` object

```json
{
  "type": "issue | milestone | project",
  "id": "ALA-340",
  "project": "ALA-142"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `type` | Yes | One of `issue`, `milestone`, `project` |
| `id` | Yes | The exact Linear object ID or key used for lookup |
| `project` | For milestone links | Parent project identifier when the workspace links to a milestone inside a project |

**Design rule:** A workspace links to one primary Linear object. No inference. If a workspace links to an issue, look it up by that issue ID. If it links to a project, look it up by that project ID.

## Status Lifecycle

Four statuses, one path with an optional shortcut:

```
active → ready-for-synthesis → synthesizing → archived
     ↘ archived (requires skip-synthesis reasoning)
```

| Status | Meaning |
|--------|---------|
| `active` | Work in progress |
| `ready-for-synthesis` | Done — learnings need extracting into domain knowledge |
| `synthesizing` | Synthesis pipeline is actively processing |
| `archived` | Value captured (or explicitly skipped), workspace moved to `workspace/archive/` |

### Transition Rules

- `active → ready-for-synthesis`: Default close. CLI command: `agonda workspace complete <name>`.
- `active → archived`: Allowed only with `skip-synthesis` reasoning. CLI command: `agonda workspace complete <name> --skip-synthesis "reason"`.
- `ready-for-synthesis → synthesizing`: Set by the synthesis pipeline when it picks up the workspace.
- `synthesizing → archived`: Set when synthesis completes. CLI command: `agonda workspace archive <name>`.
- No backwards transitions. If an archived workspace needs more work, create a new workspace.

**Design rationale:** The old `complete` status was removed — it was a waiting room between "done" and "ready for synthesis." When you finish a workspace, you know whether it has synthesis-worthy insights. One decision, one command.

## Work Types

From Phoenix Project — the four types of work. Three are valid workspace types; the fourth is tracked differently.

| Type | On workspace.json? | Description |
|------|-------------------|-------------|
| `business` | Yes | Work that delivers value to customers |
| `internal` | Yes | Work that improves your own capability |
| `change` | Yes | Modifications to existing systems |
| Unplanned | No | Tracked narratively at WAM — not a workspace type because unplanned work displaces planned work, it doesn't get its own workspace |

## Examples

### Deliverable workspace — linked to plan and Linear

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
  }
}
```

### Issue-scoped workspace

```json
{
  "workbench": "website-dev",
  "domain": "value",
  "created": "2026-03-10",
  "status": "active",
  "owner": "Thomas",
  "deliverable": "Implement lead form validation for BarryOS landing page",
  "work_type": "business",
  "tactic": "T1.3",
  "linear": {
    "type": "issue",
    "id": "ALA-340"
  }
}
```

### Milestone-scoped workspace

```json
{
  "workbench": "website-dev",
  "domain": "value",
  "created": "2026-03-10",
  "status": "active",
  "owner": "Thomas",
  "deliverable": "Launch-readiness phase for BarryOS website",
  "work_type": "business",
  "tactic": "T1.3",
  "linear": {
    "type": "milestone",
    "id": "launch-readiness",
    "project": "ALA-142"
  }
}
```

### Exploration workspace — unlinked

```json
{
  "workbench": "agonda-architect",
  "domain": "platform",
  "created": "2026-03-02",
  "status": "active",
  "owner": "Alex",
  "deliverable": "Understand how Agonda should adopt TanStack Intent",
  "work_type": "internal"
}
```

### Completed workspace — graduated to repo

```json
{
  "workbench": "website-planning",
  "domain": "value",
  "created": "2026-02-20",
  "status": "ready-for-synthesis",
  "owner": "Thomas",
  "deliverable": "Website architecture and initial build",
  "work_type": "business",
  "tactic": "T2.1",
  "graduated-to": ["alavida-ai/website"]
}
```

### Archived without synthesis

```json
{
  "workbench": "agonda-architect",
  "domain": "platform",
  "created": "2026-03-01",
  "status": "archived",
  "owner": "Alex",
  "deliverable": "Evaluate GraphQL for data endpoints",
  "work_type": "internal",
  "skip-synthesis": "Dead-end exploration — concluded REST is sufficient, decision already captured in D8 of agentic-mesh architecture"
}
```

## Migration

15 existing `.workbench` files need migration to `workspace.json`. The CLI should provide a migration command that:

1. Reads the `.workbench` file
2. Maps `name:` → `workbench` (3 files use the old convention)
3. Requires flags or a mapping file for missing required fields (`owner`, `deliverable`, `work_type`) rather than prompting
4. Infers `status` from location (`workspace/archive/` → `archived`, otherwise `active`)
5. Writes `workspace.json`
6. Removes `.workbench`
