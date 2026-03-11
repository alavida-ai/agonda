# Agonda CLI Workspace Reference

Use this reference for `agonda workspace ...` commands.

## Create a workspace

```bash
agonda workspace create barryos-website \
  --workbench website-dev \
  --domain value \
  --owner Thomas \
  --deliverable "Landing page with lead capture live on agonda.ai" \
  --work-type business \
  --tactic T1.3 \
  --linear-type project \
  --linear-id ALA-142
```

Creates:
- `workspace/active/<name>/workspace.json`
- `workspace/active/<name>/CONTINUE.md`
- `workspace/active/<name>/LEARNINGS.md`

Validation rules:
- name must be lowercase kebab-case
- workspace directory must not already exist
- if `--tactic` is provided, it must exist in `plan.yaml`
- `--linear-type` and `--linear-id` must be provided together

## List workspaces

```bash
agonda workspace list
agonda workspace list --verbose
agonda workspace list --json
```

Default human output shows:
- name
- owner
- work type
- last activity (`today`, `1d ago`, `12d ago`, or `new`)
- workbench
- deliverable

`--verbose` adds:
- tactic
- Linear metadata

JSON output includes:
- `last_activity`
- `last_activity_days_ago`
- `stale`
- summary counts

Supported filters:
- `--status`
- `--owner`
- `--tactic`
- `--workbench`
- `--work-type`
- `--linear-type`
- `--linear-id`
- `--linear-project`

There is no `--stale` filter in the current CLI.

## Link a workspace

```bash
agonda workspace link --path workspace/active/barryos-website --tactic T1.3
agonda workspace link --path workspace/active/barryos-website --linear-type project --linear-id ALA-142
```

Behavior:
- merges only the provided fields
- does not clear unspecified link fields

## Complete a workspace

```bash
agonda workspace complete barryos-website
agonda workspace complete barryos-website --skip-synthesis "pure build, no new domain insights"
```

Behavior:
- `active` -> `ready-for-synthesis`
- `active` -> `archived` when `--skip-synthesis` is provided

## Archive a workspace

```bash
agonda workspace archive barryos-website
```

Only valid from `synthesizing`.

## Graduate a workspace

```bash
agonda workspace graduate barryos-website --repo alavida-ai/website
```

Appends to `graduated-to`. Does not change status.

## Validate workspaces

```bash
agonda workspace validate
agonda workspace validate --json
```

Checks:
- required fields
- enums
- milestone/project link consistency
- skip-synthesis consistency
- location drift between status and filesystem path

Current implementation does not emit stale warnings in `workspace validate`.

## Lifecycle Rules

- `complete` only works from `active`
- `archive` only works from `synthesizing`
- transitions are metadata-only
- the CLI never moves directories on disk

