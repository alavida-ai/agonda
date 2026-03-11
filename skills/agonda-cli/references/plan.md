# Agonda CLI Plan Reference

Use this reference for `agonda plan ...` commands.

## Core Commands

### View the plan

```bash
agonda plan view
agonda plan view --json
```

Use this to inspect:
- cycle name and current week
- goals
- due-this-week tactics
- overdue deliverables

### Validate the plan

```bash
agonda plan validate
agonda plan validate --json
```

Checks:
- cycle dates
- duplicate goal/tactic IDs
- tactic goal references
- deliverable/habit required fields
- due week range

### Initialize a cycle

```bash
agonda plan init \
  --name "Cycle 2" \
  --start 2026-03-10 \
  --end 2026-06-01 \
  --vision "By June, Agonda has 3 paying clients..."
```

Behavior:
- creates `plan.yaml` if missing
- preserves existing goals and tactics when updating an existing plan

## Goals

### Add

```bash
agonda plan goal add \
  --id G1 \
  --name "Close 3 paid client engagements" \
  --owner Thomas \
  --lag-measure "Number of signed contracts" \
  --target 3 \
  --current 0
```

### Edit

```bash
agonda plan goal edit G1 --current 1
```

### Remove

```bash
agonda plan goal remove G1
```

### List

```bash
agonda plan goal list
agonda plan goal list --json
```

## Tactics

### Add a deliverable

```bash
agonda plan tactic add \
  --id T1.3 \
  --goal G1 \
  --text "Complete BarryOS website build" \
  --owner Thomas \
  --type deliverable \
  --due-week 2
```

### Add a habit

```bash
agonda plan tactic add \
  --id T1.1 \
  --goal G1 \
  --text "Schedule 3 discovery calls per week" \
  --owner Thomas \
  --type habit \
  --cadence weekly
```

### Edit

```bash
agonda plan tactic edit T1.3 --due-week 3
```

### List and filter

```bash
agonda plan tactic list
agonda plan tactic list --owner Thomas
agonda plan tactic list --goal G1
agonda plan tactic list --type deliverable
agonda plan tactic list --overdue
agonda plan tactic list --json
```

Supported filters:
- `--owner`
- `--due-week`
- `--goal`
- `--overdue`
- `--type`

### Complete and reopen

```bash
agonda plan tactic complete T1.3 --by alex
agonda plan tactic reopen T1.3
```

Constraints:
- only deliverables can be completed or reopened
- reopening requires the tactic to currently be completed

