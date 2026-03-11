# Plan Coverage And Workspace Scan Design

## Summary

Add two read-only CLI commands:

- `agonda plan coverage`
- `agonda workspace scan`

These commands improve org-level visibility without changing the persisted data model. `workspace.json` remains the only explicit workspace state for registered workspaces. The filesystem remains the source of truth for unregistered workspace directories, and git history remains derived metadata for activity and staleness.

The design keeps `workspace` as the primary operational object in the CLI. `plan coverage` becomes a projection from plan commitments to registered workspace execution. `workspace scan` becomes an observability command for work visible on disk but outside formal workspace governance.

## Goals

- Show which plan tactics are covered by registered workspaces.
- Show which directories under `workspace/active/` exist without a `workspace.json`.
- Preserve the current meaning of `workspace list`: governed, registered work only.
- Avoid introducing a second persisted workspace state layer such as `.agonda`.
- Keep the implementation compatible with the current application, infrastructure, and presentation split.

## Non-Goals

- No new persisted metadata store.
- No retroactive registration of untracked directories.
- No change to workspace lifecycle semantics.
- No expansion of `workspace list` to include unregistered directories.
- No requirement that every directory in `workspace/active/` contain a `workspace.json`.

## Current Architecture

The CLI already has a clean separation:

- `src/application/plan.ts` orchestrates plan reads and plan-oriented projections.
- `src/application/workspace.ts` orchestrates workspace lifecycle and listing commands.
- `src/infrastructure/workspace-store.ts` discovers and loads registered workspaces from `workspace.json`.
- `src/presentation/output.ts` owns human-readable rendering while `--json` exposes structured data.

Today there are two formal read models:

- `plan.yaml` for goals and tactics
- `workspace.json` for registered workspaces

The repository also contains a third operational reality: directories under `workspace/active/` that may represent active work but are not registered. This issue adds first-class visibility for those directories without making them formal workspace records.

## First-Class Citizens

The CLI should treat the following as first-class concepts:

### Workspace

The operational unit of work in the org. A workspace may be:

- registered: has `workspace.json`
- unregistered: exists on disk under `workspace/active/` without `workspace.json`

### Workspace Lifecycle

The explicit status on registered workspaces:

- `active`
- `ready-for-synthesis`
- `synthesizing`
- `archived`

### Workspace Linkage

Metadata that connects a workspace to the rest of the operating system:

- `tactic`
- `workbench`
- `linear`
- `deliverable`

### Plan Tactic

A directional commitment that may or may not currently be covered by a registered workspace.

## Architectural Direction

Use a workspace-centered read model without adding new persisted state.

### Why not add `.agonda` state

There is no need for a separate hidden state layer because the system already has the right boundaries:

- `workspace.json` is explicit state for governed workspaces
- filesystem presence is implicit state for unregistered work
- git history provides derived freshness signals
- `plan.yaml` provides directional commitments

Adding a second persisted store would create redundant truth and make registration and lifecycle harder to reason about.

### Chosen approach

Introduce one new infrastructure capability: discover workspace directories on disk regardless of whether they contain `workspace.json`.

Then build two command projections:

- `plan coverage`: plan tactics annotated by registered workspace coverage
- `workspace scan`: unregistered workspace directories annotated by activity metadata

This keeps the existing architecture intact while moving the mental model closer to a future workspace catalog if needed.

## Data Model

No schema changes are required for `plan.yaml` or `workspace.json`.

Add one new internal read shape:

### `DiscoveredWorkspaceDir`

Represents a directory under `workspace/active/` that may or may not be registered.

Fields:

- `name: string`
- `absoluteDir: string`
- `relativeDir: string`

This object is intentionally minimal at infrastructure level. Activity enrichment belongs in the application layer because it depends on git.

Existing `StoredWorkspace` remains unchanged for registered workspaces:

- `name`
- `absoluteDir`
- `relativeDir`
- `manifest`

## Command Design

### `agonda plan coverage`

Purpose:

- Show which tactics are covered by registered workspaces.
- Make plan execution gaps visible to humans and agents.

Rules:

- Coverage is satisfied only by registered workspaces linked through `manifest.tactic`.
- Unregistered directories do not count as coverage.
- Coverage is computed against plan tactics, grouped by goal.

Flags:

- `--goal <id>` filters to one goal.
- `--uncovered-only` shows only tactics without coverage.
- `--json` returns structured output.

JSON shape:

```json
{
  "cycle": {
    "name": "Cycle 2",
    "current_week": 3,
    "max_weeks": 12
  },
  "goals": [
    {
      "id": "G1",
      "name": "Close 3 paid client engagements",
      "owner": "Alex",
      "current": 0,
      "target": 3,
      "tactics": [
        {
          "id": "T1.1",
          "text": "Schedule 3 discovery calls per week",
          "owner": "Alex",
          "type": "habit",
          "workspace_path": null,
          "covered": false
        }
      ]
    }
  ],
  "summary": {
    "total_tactics": 11,
    "covered_tactics": 2,
    "uncovered_tactics": 9,
    "coverage_percent": 18
  },
  "filters_applied": {
    "goal": "G1",
    "uncovered_only": true
  }
}
```

Human output:

- Use existing banner and section styling.
- Group by goal.
- Show each tactic with either the linked workspace path or a visible uncovered marker.
- End with a coverage summary line.

### `agonda workspace scan`

Purpose:

- Show directories under `workspace/active/` that do not contain `workspace.json`.
- Surface unseen work and stale directories to humans and agents.

Rules:

- Only directories under `workspace/active/` are eligible.
- Registered workspaces are excluded from the result.
- Staleness defaults to `30` days and is derived from git activity.
- The command is informational only; it does not mutate filesystem or registration state.

Flags:

- `--stale-days <n>` sets the staleness threshold.
- `--json` returns structured output.

JSON shape:

```json
{
  "unregistered": [
    {
      "name": "intent-adoption",
      "path": "workspace/active/architecture/intent-adoption",
      "last_activity": "2026-03-01T12:00:00.000Z",
      "last_activity_days_ago": 10,
      "stale": false
    }
  ],
  "summary": {
    "registered_count": 15,
    "unregistered_count": 31,
    "stale_count": 8,
    "stale_days": 30
  }
}
```

Human output:

- Banner with registered and unknown counts.
- One `UNREGISTERED` section listing paths and last activity.
- Add a stale marker when the threshold is met.
- End with a summary line.

## Implementation Plan By Layer

### Infrastructure

Modify `src/infrastructure/workspace-store.ts`:

- Keep `scanWorkspaces()` unchanged for registered workspace discovery.
- Add a new helper to discover candidate directories under `workspace/active/`.
- Exclude directories that are not actual workspace leaves where appropriate.
- Normalize paths to the existing forward-slash relative format.

Likely helper name:

- `scanWorkspaceDirectories(repoRoot: string): Promise<DiscoveredWorkspaceDir[]>`

The helper should not call git and should not inspect plan data.

### Application

Modify `src/application/plan.ts`:

- Add `planCoverage(repoRoot, filters)`.
- Reuse plan loading and registered workspace linking logic.
- Return a goal-grouped payload with tactic-level coverage fields and summary counts.

Modify `src/application/workspace.ts`:

- Add `scanWorkspaceDirectoriesCommand(repoRoot, { staleDays })`.
- Call both registered workspace scan and raw directory scan.
- Subtract registered paths from discovered paths.
- Enrich remaining directories with `getLastActivity()`.

### CLI Wiring

Modify `src/index.ts`:

- Add `plan coverage` under the `plan` command group.
- Add `workspace scan` under the `workspace` command group.
- Support the flags specified above.
- Route human output through dedicated renderers.

### Presentation

Modify `src/presentation/output.ts`:

- Add `renderPlanCoverage()`.
- Add `renderWorkspaceScan()`.
- Keep JSON output untouched by renderers.
- Reuse current visual helpers for consistency with the rest of the CLI.

## Error Handling

Expected behavior:

- Missing repo root continues to fail through existing global error handling.
- Missing `plan.yaml` should fail `plan coverage` the same way other plan commands fail.
- Missing `workspace/active/` should not crash `workspace scan`; it should return zero unregistered directories.
- Invalid `--stale-days` input should be rejected at the CLI parsing layer or validated in application code.

## Testing Strategy

Use TDD at the command level.

### `plan coverage`

Add tests in `test/plan.test.ts` for:

- returns grouped coverage with covered and uncovered tactics
- `--goal` filters to one goal
- `--uncovered-only` excludes covered tactics
- JSON summary counts are correct
- human output renders key coverage markers

### `workspace scan`

Add tests in `test/workspace.test.ts` for:

- returns unregistered directories under `workspace/active/`
- excludes registered workspaces
- computes staleness from git activity using the existing helper behavior
- respects `--stale-days`
- human output renders stale markers and summary counts

Fixture setup will likely need raw directories with and without `workspace.json`.

## Risks And Tradeoffs

### Directory discovery ambiguity

Some directories under `workspace/active/` may be containers rather than actual workspaces. The implementation should prefer directories that represent meaningful leaves, or explicitly document the chosen rule and test it.

### Coverage semantics

Counting only registered workspaces as coverage is stricter than “work exists on disk.” This is intentional because coverage should represent governed execution, not just activity.

### Future evolution

If the CLI later promotes all workspace discovery into a shared workspace catalog, the new scan helper and payload shapes should be reusable inputs for that catalog. This issue should not block that future direction.

## Files Expected To Change

- `src/index.ts`
- `src/application/plan.ts`
- `src/application/workspace.ts`
- `src/infrastructure/workspace-store.ts`
- `src/presentation/output.ts`
- `test/plan.test.ts`
- `test/workspace.test.ts`
- docs for new commands if implementation proceeds after planning

## Acceptance Criteria

- `agonda plan coverage` reports tactic coverage using only registered, linked workspaces.
- `agonda workspace scan` reports unregistered directories under `workspace/active/`.
- Both commands support `--json`.
- Both commands provide human-readable output consistent with the rest of the CLI.
- No new persisted state layer is introduced.
- Existing command behavior for `plan view` and `workspace list` remains unchanged.
