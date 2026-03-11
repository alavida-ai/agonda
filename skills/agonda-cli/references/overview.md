# Agonda CLI Overview

Use this reference for install, output modes, repo discovery, lifecycle boundaries, and high-level command routing.

## Install

```bash
npm install -g agonda
```

Requires Node.js 20+.

## What the CLI Manages

- `domains/operations/knowledge/plan.yaml`
- `workspace/**/workspace.json`

The CLI is the single writer for those files. It does not talk to Linear and does not manage domain knowledge files.

## Repo Discovery

The CLI walks up from the current working directory to the nearest ancestor containing `.git`.

- If no repo root is found: exit code `1`
- Error message: `Error: not inside an Agonda repository`

## Output Modes

- Default: human-readable terminal output
- `--json`: machine-readable JSON to stdout

Use `--json` whenever:
- an agent or script is consuming the output
- the user wants stable structured data
- the user wants to pipe into `jq`

## Exit Codes

- `0`: success
- `1`: unexpected error
- `2`: validation failure

## Current Command Surface

### Plan

- `agonda plan view`
- `agonda plan validate`
- `agonda plan init`
- `agonda plan goal add|edit|remove|list`
- `agonda plan tactic add|edit|remove|list|complete|reopen`

### Workspace

- `agonda workspace create`
- `agonda workspace list`
- `agonda workspace link`
- `agonda workspace complete`
- `agonda workspace archive`
- `agonda workspace graduate`
- `agonda workspace validate`

## Not Implemented

Do not tell users to run these as if they exist:

- `agonda workspace migrate`
- `agonda workspace list --stale`
- any built-in SessionStart hook shipped by this CLI

## Human Output Notes

- `workspace list` shows a compact stacked layout by default
- `workspace list --verbose` adds tactic and Linear lines
- workspaces with no git history show `new` in human output

