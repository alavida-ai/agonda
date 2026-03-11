# Plan Coverage And Workspace Scan Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `agonda plan coverage` and `agonda workspace scan` as read-only commands that expose plan-to-workspace coverage gaps and unregistered active workspace directories without introducing new persisted state.

**Architecture:** Extend the existing CLI layering rather than introducing a new state system. Add a raw workspace-directory discovery helper in infrastructure, build command projections in the application layer, wire them into the CLI, and render them through the existing human/JSON output split.

**Tech Stack:** TypeScript, Commander, Vitest, Node.js filesystem and path APIs, existing git activity helper

---

## File Structure

- Modify: `src/infrastructure/workspace-store.ts`
  Purpose: keep registered workspace scanning intact and add raw active-directory discovery for unregistered work visibility.
- Modify: `src/application/plan.ts`
  Purpose: add the `plan coverage` projection and summary/filter logic.
- Modify: `src/application/workspace.ts`
  Purpose: add the `workspace scan` projection, registered-vs-unregistered diffing, and staleness handling.
- Modify: `src/index.ts`
  Purpose: wire new commands and flags into Commander.
- Modify: `src/presentation/output.ts`
  Purpose: add human renderers for coverage and scan outputs.
- Modify: `test/helpers.ts`
  Purpose: add focused helpers for raw workspace directory fixtures if needed.
- Modify: `test/plan.test.ts`
  Purpose: add CLI-first tests for `plan coverage`.
- Modify: `test/workspace.test.ts`
  Purpose: add CLI-first tests for `workspace scan`.
- Create: `docs/plan/coverage.mdx`
  Purpose: document the new `plan coverage` command.
- Create: `docs/workspace/scan.mdx`
  Purpose: document the new `workspace scan` command.
- Modify: `docs/plan/overview.mdx`
  Purpose: add `plan coverage` to the plan command index.
- Modify: `docs/workspace/overview.mdx`
  Purpose: add `workspace scan` to the workspace command index.
- Modify: `docs/quickstart.mdx`
  Purpose: include one or two examples that expose the new visibility model.

## Chunk 1: Plan Coverage Command

### Task 1: Add failing JSON coverage test

**Files:**
- Modify: `test/plan.test.ts`

- [ ] **Step 1: Write the failing test**

Add a test that:
- creates a repo with the default plan fixture
- creates one registered workspace linked to an existing tactic
- runs `agonda plan coverage --json`
- asserts:
  - payload contains `cycle`
  - payload contains grouped `goals`
  - linked tactic has `covered: true` and `workspace_path`
  - unlinked tactic has `covered: false`
  - summary counts are correct

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- test/plan.test.ts
```

Expected:
- FAIL because `plan coverage` is not implemented.

- [ ] **Step 3: Add CLI command wiring and minimal application path**

Implement the minimum code to make the JSON command exist:
- add `plan coverage` to `src/index.ts`
- add a `planCoverage()` function in `src/application/plan.ts`
- return the simplest correct JSON payload using existing plan loading and registered workspace scanning

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- test/plan.test.ts
```

Expected:
- PASS for the new coverage JSON test.

- [ ] **Step 5: Commit**

```bash
git add test/plan.test.ts src/index.ts src/application/plan.ts
git commit -m "feat: add plan coverage json command"
```

### Task 2: Add failing filter tests for plan coverage

**Files:**
- Modify: `test/plan.test.ts`

- [ ] **Step 1: Write the failing tests**

Add tests for:
- `agonda plan coverage --goal G1 --json` returns only `G1`
- `agonda plan coverage --uncovered-only --json` excludes covered tactics

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- test/plan.test.ts
```

Expected:
- FAIL because filtering is incomplete or absent.

- [ ] **Step 3: Write minimal implementation**

Update `planCoverage()` to:
- filter selected goals
- filter tactics by covered state when `uncovered_only` is true
- recompute summary counts after filtering
- return `filters_applied`

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- test/plan.test.ts
```

Expected:
- PASS for filter tests.

- [ ] **Step 5: Commit**

```bash
git add test/plan.test.ts src/application/plan.ts
git commit -m "feat: add plan coverage filters"
```

### Task 3: Add failing human-output test for plan coverage

**Files:**
- Modify: `test/plan.test.ts`
- Modify: `src/presentation/output.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write the failing test**

Add a test that runs `agonda plan coverage` without `--json` and asserts the output includes:
- the Agonda banner
- a goal section such as `G1`
- a visible coverage marker for uncovered tactics
- the linked workspace path
- the coverage summary line

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- test/plan.test.ts
```

Expected:
- FAIL because no renderer exists yet.

- [ ] **Step 3: Write minimal implementation**

Add `renderPlanCoverage()` to `src/presentation/output.ts` and wire it in `src/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- test/plan.test.ts
```

Expected:
- PASS for human coverage output.

- [ ] **Step 5: Commit**

```bash
git add test/plan.test.ts src/presentation/output.ts src/index.ts
git commit -m "feat: add plan coverage human output"
```

## Chunk 2: Workspace Scan Command

### Task 4: Add failing JSON scan test

**Files:**
- Modify: `test/helpers.ts`
- Modify: `test/workspace.test.ts`

- [ ] **Step 1: Write the failing test**

Add a helper if needed to create a raw workspace directory without `workspace.json`.

Add a test that:
- creates one registered workspace
- creates one or more raw directories under `workspace/active/`
- runs `agonda workspace scan --json`
- asserts:
  - registered directories are excluded
  - unregistered directories are returned
  - summary includes `registered_count`, `unregistered_count`, and `stale_days`

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- test/workspace.test.ts
```

Expected:
- FAIL because `workspace scan` and raw directory discovery do not exist.

- [ ] **Step 3: Write minimal implementation**

Implement:
- `scanWorkspaceDirectories()` in `src/infrastructure/workspace-store.ts`
- `scanWorkspaceDirectoriesCommand()` in `src/application/workspace.ts`
- `workspace scan` command wiring in `src/index.ts`

Keep the first version simple:
- discover directories under `workspace/active/`
- subtract any directory that has a registered `workspace.json`
- return JSON without human formatting work

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- test/workspace.test.ts
```

Expected:
- PASS for the JSON scan behavior.

- [ ] **Step 5: Commit**

```bash
git add test/helpers.ts test/workspace.test.ts src/infrastructure/workspace-store.ts src/application/workspace.ts src/index.ts
git commit -m "feat: add workspace scan json command"
```

### Task 5: Add failing stale-days tests for workspace scan

**Files:**
- Modify: `test/workspace.test.ts`
- Modify: `src/application/workspace.ts`

- [ ] **Step 1: Write the failing tests**

Add tests for:
- default `--stale-days` behavior sets threshold to `30`
- `--stale-days 5` changes stale classification in JSON

Use assertions based on `last_activity_days_ago` being compared against the threshold. If git activity is hard to control in fixtures, assert threshold wiring using deterministic mocked or null-activity cases already supported by the helper behavior.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- test/workspace.test.ts
```

Expected:
- FAIL because stale-threshold handling is incomplete.

- [ ] **Step 3: Write minimal implementation**

Update `scanWorkspaceDirectoriesCommand()` to:
- default `staleDays` to `30`
- compute `stale` from `last_activity_days_ago`
- surface `stale_days` in summary

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- test/workspace.test.ts
```

Expected:
- PASS for stale threshold tests.

- [ ] **Step 5: Commit**

```bash
git add test/workspace.test.ts src/application/workspace.ts
git commit -m "feat: add workspace scan stale thresholds"
```

### Task 6: Add failing human-output test for workspace scan

**Files:**
- Modify: `test/workspace.test.ts`
- Modify: `src/presentation/output.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write the failing test**

Add a test that runs `agonda workspace scan` and asserts the output includes:
- the Agonda banner
- an `UNREGISTERED` section
- the raw workspace path
- a stale marker when applicable
- the summary line

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- test/workspace.test.ts
```

Expected:
- FAIL because no renderer exists yet.

- [ ] **Step 3: Write minimal implementation**

Add `renderWorkspaceScan()` and wire it to the new command in `src/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- test/workspace.test.ts
```

Expected:
- PASS for the human scan output.

- [ ] **Step 5: Commit**

```bash
git add test/workspace.test.ts src/presentation/output.ts src/index.ts
git commit -m "feat: add workspace scan human output"
```

## Chunk 3: Docs And Full Verification

### Task 7: Document the new commands

**Files:**
- Create: `docs/plan/coverage.mdx`
- Create: `docs/workspace/scan.mdx`
- Modify: `docs/plan/overview.mdx`
- Modify: `docs/workspace/overview.mdx`
- Modify: `docs/quickstart.mdx`

- [ ] **Step 1: Write the failing documentation checklist**

Before editing, verify the docs currently do not mention the new commands.

Run:

```bash
rg -n "plan coverage|workspace scan" docs README.md
```

Expected:
- No matches for the new command docs before changes.

- [ ] **Step 2: Write minimal documentation**

Document:
- purpose
- syntax
- flags
- JSON usage examples
- distinction between governed work (`workspace list`) and visible unregistered work (`workspace scan`)

- [ ] **Step 3: Run a quick grep verification**

Run:

```bash
rg -n "plan coverage|workspace scan" docs README.md
```

Expected:
- Matches in the newly added docs.

- [ ] **Step 4: Commit**

```bash
git add docs/plan/coverage.mdx docs/workspace/scan.mdx docs/plan/overview.mdx docs/workspace/overview.mdx docs/quickstart.mdx
git commit -m "docs: add plan coverage and workspace scan docs"
```

### Task 8: Run full verification before completion

**Files:**
- No code changes expected unless verification reveals issues.

- [ ] **Step 1: Run focused test suites**

Run:

```bash
npm test -- test/plan.test.ts test/workspace.test.ts
```

Expected:
- PASS.

- [ ] **Step 2: Run full test suite**

Run:

```bash
npm test
```

Expected:
- PASS.

- [ ] **Step 3: Run typecheck**

Run:

```bash
npm run lint
```

Expected:
- PASS with no TypeScript errors.

- [ ] **Step 4: Smoke-test the new commands manually**

Run:

```bash
npm run dev -- plan coverage --json
npm run dev -- workspace scan --json
```

Expected:
- Both commands execute successfully in a valid Agonda repo.

- [ ] **Step 5: Commit any verification fixes**

If verification required fixes:

```bash
git add <changed files>
git commit -m "fix: address plan coverage and workspace scan verification issues"
```

If no fixes were needed, skip this commit.
