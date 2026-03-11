# Agonda CLI

Command-line tool for managing execution plans and workspace lifecycles in Agonda-structured repositories.

The CLI manages two file-based data stores:

- **plan.yaml** — your 12-week execution plan (goals, tactics, cycle metadata)
- **workspace.json** — per-workspace manifests (owner, deliverable, status, links)

It is the single writer for both. Humans read the formatted output. Agents consume `--json`.

## Install

```bash
npm install -g agonda
```

Requires Node.js 20+.

## Quick Start

```bash
# See your plan — goals, what's due, what's overdue
agonda plan view

# See all workspaces — who owns what, what's stale
agonda workspace list

# Create a workspace for a new piece of work
agonda workspace create barryos-website \
  --workbench website-dev \
  --domain value \
  --owner Thomas \
  --deliverable "Landing page with lead capture" \
  --work-type business

# Done with a workspace — queue it for synthesis
agonda workspace complete barryos-website
```

## How It Works

The CLI governs the **direction** and **context** layers of your operations system:

```
DIRECTION     plan.yaml          Goals, tactics, cycle
CONTEXT       workspace.json     Per-workspace: who, what, why, status
EXECUTION     Linear             Tickets, assignments (not managed by CLI)
KNOWLEDGE     domains/           Synthesized insights (not managed by CLI)
```

Direction flows down (plan → workspaces → tickets). Status flows up (tickets done → workspace complete → synthesis → domain knowledge).

The CLI never touches Linear. Agents interact with Linear via MCP. Humans use the Linear UI.

## Commands

### Plan

| Command | What it does |
|---------|-------------|
| `agonda plan view` | Goals, tactics, due this week, overdue — one unified view |
| `agonda plan validate` | Check plan.yaml for schema errors |
| `agonda plan init` | Set cycle metadata (name, dates, vision) |
| `agonda plan goal add` | Add a goal to the plan |
| `agonda plan goal edit <id>` | Edit a goal |
| `agonda plan goal remove <id>` | Remove a goal |
| `agonda plan goal list` | List all goals |
| `agonda plan tactic add` | Add a tactic (deliverable or habit) |
| `agonda plan tactic edit <id>` | Edit a tactic |
| `agonda plan tactic remove <id>` | Remove a tactic |
| `agonda plan tactic list` | List/filter tactics |
| `agonda plan tactic complete <id>` | Mark a deliverable done |
| `agonda plan tactic reopen <id>` | Reopen a completed deliverable |

### Workspace

| Command | What it does |
|---------|-------------|
| `agonda workspace create <name>` | Scaffold a new workspace with manifest |
| `agonda workspace list` | List/filter all workspaces |
| `agonda workspace link` | Connect workspace to a plan tactic or Linear object |
| `agonda workspace complete <name>` | Close workspace — queue for synthesis or archive |
| `agonda workspace archive <name>` | Terminal transition after synthesis completes |
| `agonda workspace graduate <name>` | Record that this workspace spawned a repo |
| `agonda workspace validate` | Check all workspace.json files for integrity |

Every command supports `--json` for agent consumption.

## Documentation

| Doc | What it covers |
|-----|---------------|
| [Introduction](docs/introduction.mdx) | Core concepts, output modes, and design principles |
| [Quick Start](docs/quickstart.mdx) | Install, first commands, and common flows |
| [Plan Commands](docs/plan/overview.mdx) | Full plan command reference |
| [Workspace Commands](docs/workspace/overview.mdx) | Full workspace command reference |
| [Workspace Lifecycle](docs/concepts/lifecycle.mdx) | The four statuses, transitions, and archival rules |
| [Schemas](docs/concepts/schemas.mdx) | plan.yaml and workspace.json field-level specifications |

## For the Building Agent

The `spec/` directory contains the implementation specification and all design context:

| File | Purpose |
|------|---------|
| [spec/implementation.md](spec/implementation.md) | Complete implementation spec — conventions, schemas, commands, JSON output shapes, testing strategy |
| [spec/decisions.md](spec/decisions.md) | 17 locked design decisions with rationale |
| [spec/domain-model.md](spec/domain-model.md) | Four-layer architecture, core objects, terminology |
| [spec/user-stories.md](spec/user-stories.md) | 20 user/agent stories with coverage matrices |
| [spec/phases.md](spec/phases.md) | Build phases with dependencies and acceptance criteria |
| [spec/HANDOFF.md](spec/HANDOFF.md) | Start here — what to build first, key constraints, gotchas |

## License

Private — Alavida AI Ltd.
