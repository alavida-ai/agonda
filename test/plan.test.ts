import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createTestRepo, runCli } from "./helpers";

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
