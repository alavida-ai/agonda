import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createTestRepo, createWorkspace, runCli } from "./helpers";

describe("plan commands", () => {
  it("views the plan as json with computed cycle metadata", async () => {
    const repoRoot = await createTestRepo();

    const result = await runCli(["plan", "view", "--json"], repoRoot);

    expect(result.exitCode).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.cycle.name).toBe("Cycle 2");
    expect(payload.cycle.current_week).toBeGreaterThanOrEqual(1);
    expect(payload.goals).toHaveLength(3);
    expect(payload.due_this_week.some((tactic: { id: string }) => tactic.id === "T2.1")).toBe(true);
    expect(payload.habits.some((tactic: { id: string }) => tactic.id === "T1.1")).toBe(true);
  });

  it("reports tactic coverage as json", async () => {
    const repoRoot = await createTestRepo();

    await createWorkspace(repoRoot, "workspace/active/barryos-website", {
      workbench: "website-dev",
      domain: "value",
      created: "2026-03-10",
      status: "active",
      owner: "Thomas",
      deliverable: "Landing page with lead capture",
      work_type: "business",
      tactic: "T1.3",
      linear: null,
      "graduated-to": [],
      "skip-synthesis": null,
    });

    const result = await runCli(["plan", "coverage", "--json"], repoRoot);

    expect(result.exitCode).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.cycle.name).toBe("Cycle 2");
    expect(payload.goals).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "G1",
          tactics: expect.arrayContaining([
            expect.objectContaining({
              id: "T1.3",
              covered: true,
              workspace_path: "workspace/active/barryos-website",
            }),
            expect.objectContaining({
              id: "T1.1",
              covered: false,
              workspace_path: null,
            }),
          ]),
        }),
      ]),
    );
    expect(payload.summary).toMatchObject({
      total_tactics: 14,
      covered_tactics: 1,
      uncovered_tactics: 13,
      coverage_percent: 7,
    });
  });

  it("filters coverage to a single goal", async () => {
    const repoRoot = await createTestRepo();

    const result = await runCli(["plan", "coverage", "--goal", "G1", "--json"], repoRoot);

    expect(result.exitCode).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.goals).toHaveLength(1);
    expect(payload.goals[0].id).toBe("G1");
    expect(payload.filters_applied).toMatchObject({ goal: "G1" });
    expect(payload.summary.total_tactics).toBe(payload.goals[0].tactics.length);
  });

  it("filters coverage to uncovered tactics only", async () => {
    const repoRoot = await createTestRepo();

    await createWorkspace(repoRoot, "workspace/active/barryos-website", {
      workbench: "website-dev",
      domain: "value",
      created: "2026-03-10",
      status: "active",
      owner: "Thomas",
      deliverable: "Landing page with lead capture",
      work_type: "business",
      tactic: "T1.3",
      linear: null,
      "graduated-to": [],
      "skip-synthesis": null,
    });

    const result = await runCli(["plan", "coverage", "--uncovered-only", "--json"], repoRoot);

    expect(result.exitCode).toBe(0);

    const payload = JSON.parse(result.stdout);
    const tactics = payload.goals.flatMap(
      (goal: { tactics: Array<{ id: string; covered: boolean }> }) => goal.tactics,
    );

    expect(tactics).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "T1.3" })]),
    );
    expect(tactics.every((tactic: { covered: boolean }) => tactic.covered === false)).toBe(true);
    expect(payload.summary).toMatchObject({
      total_tactics: 13,
      covered_tactics: 0,
      uncovered_tactics: 13,
      coverage_percent: 0,
    });
    expect(payload.filters_applied).toMatchObject({ uncovered_only: true });
  });

  it("validates a correct plan", async () => {
    const repoRoot = await createTestRepo();

    const result = await runCli(["plan", "validate", "--json"], repoRoot);

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      valid: true,
      goals_count: 3,
      tactics_count: 14,
      errors: [],
    });

    const humanResult = await runCli(["plan", "validate"], repoRoot);
    expect(humanResult.exitCode).toBe(0);
    expect(humanResult.stdout).toContain("Agonda");
    expect(humanResult.stdout).toContain("plan.yaml is valid");
    expect(humanResult.stdout).not.toContain('{"valid"');
  });

  it("initializes a plan when none exists", async () => {
    const repoRoot = await createTestRepo({ withPlan: false });

    const result = await runCli(
      [
        "plan",
        "init",
        "--name",
        "Cycle 9",
        "--start",
        "2026-07-01",
        "--end",
        "2026-09-01",
        "--vision",
        "Ship the next cycle",
        "--json",
      ],
      repoRoot,
    );

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      action: "plan_initialized",
      cycle: {
        name: "Cycle 9",
        start: "2026-07-01",
        end: "2026-09-01",
      },
    });

    const planContents = await readFile(
      join(repoRoot, "domains", "operations", "knowledge", "plan.yaml"),
      "utf8",
    );
    expect(planContents).toContain("Cycle 9");
    expect(planContents).toContain("goals: []");
  });

  it("adds, edits, lists, and removes goals", async () => {
    const repoRoot = await createTestRepo({ withPlan: false });

    await runCli(
      [
        "plan",
        "init",
        "--name",
        "Cycle 1",
        "--start",
        "2026-03-10",
        "--end",
        "2026-06-01",
        "--vision",
        "Vision",
      ],
      repoRoot,
    );

    let result = await runCli(
      [
        "plan",
        "goal",
        "add",
        "--id",
        "G1",
        "--name",
        "Close clients",
        "--owner",
        "Thomas",
        "--lag-measure",
        "Contracts",
        "--target",
        "3",
        "--json",
      ],
      repoRoot,
    );
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ action: "goal_added", id: "G1" });

    result = await runCli(["plan", "goal", "edit", "G1", "--current", "1", "--json"], repoRoot);
    expect(result.exitCode).toBe(0);

    result = await runCli(["plan", "goal", "list", "--json"], repoRoot);
    expect(JSON.parse(result.stdout)).toMatchObject({
      goals: [
        expect.objectContaining({
          id: "G1",
          current: 1,
        }),
      ],
    });

    result = await runCli(["plan", "goal", "remove", "G1", "--json"], repoRoot);
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ action: "goal_removed", id: "G1" });
  });

  it("adds, lists, completes, reopens, and removes tactics", async () => {
    const repoRoot = await createTestRepo({ withPlan: false });

    await runCli(
      [
        "plan",
        "init",
        "--name",
        "Cycle 1",
        "--start",
        "2026-03-10",
        "--end",
        "2026-06-01",
        "--vision",
        "Vision",
      ],
      repoRoot,
    );
    await runCli(
      [
        "plan",
        "goal",
        "add",
        "--id",
        "G1",
        "--name",
        "Close clients",
        "--owner",
        "Thomas",
        "--lag-measure",
        "Contracts",
        "--target",
        "3",
      ],
      repoRoot,
    );

    let result = await runCli(
      [
        "plan",
        "tactic",
        "add",
        "--id",
        "T1.1",
        "--goal",
        "G1",
        "--text",
        "Ship website",
        "--owner",
        "Thomas",
        "--type",
        "deliverable",
        "--due-week",
        "2",
        "--json",
      ],
      repoRoot,
    );
    expect(result.exitCode).toBe(0);

    result = await runCli(
      ["plan", "tactic", "complete", "T1.1", "--by", "alex", "--json"],
      repoRoot,
    );
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      action: "tactic_completed",
      id: "T1.1",
      completed_by: "alex",
    });

    result = await runCli(["plan", "tactic", "reopen", "T1.1", "--json"], repoRoot);
    expect(result.exitCode).toBe(0);

    result = await runCli(
      ["plan", "tactic", "list", "--goal", "G1", "--json"],
      repoRoot,
    );
    expect(JSON.parse(result.stdout)).toMatchObject({
      tactics: [expect.objectContaining({ id: "T1.1", completed: false })],
      filters_applied: { goal: "G1" },
    });

    result = await runCli(["plan", "tactic", "remove", "T1.1", "--json"], repoRoot);
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({ action: "tactic_removed", id: "T1.1" });
  });

  it("returns validation exit code when the repo is not an agonda repository", async () => {
    const outsideRepo = await mkdtemp(join(tmpdir(), "agonda-outside-"));
    const result = await runCli(["plan", "view", "--json"], outsideRepo);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("not inside an Agonda repository");
  });
});
