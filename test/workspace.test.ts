import { describe, expect, it } from "vitest";
import {
  commitWorkspacePath,
  createTestRepo,
  createWorkspace,
  createWorkspaceDirectory,
  runCli,
} from "./helpers";

describe("workspace commands", () => {
  it("scans unregistered workspace directories as json", async () => {
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

    await createWorkspaceDirectory(
      repoRoot,
      "workspace/active/architecture/intent-adoption",
    );

    const result = await runCli(["workspace", "scan", "--json"], repoRoot);

    expect(result.exitCode).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.unregistered).toEqual([
      expect.objectContaining({
        name: "intent-adoption",
        path: "workspace/active/architecture/intent-adoption",
        last_activity: null,
        last_activity_days_ago: null,
        stale: false,
      }),
    ]);
    expect(payload.summary).toMatchObject({
      registered_count: 1,
      unregistered_count: 1,
      stale_days: 30,
    });
  });

  it("uses a default stale threshold of 30 days for workspace scan", async () => {
    const repoRoot = await createTestRepo();

    await createWorkspaceDirectory(
      repoRoot,
      "workspace/active/architecture/intent-adoption",
    );
    await commitWorkspacePath(
      repoRoot,
      "workspace/active/architecture/intent-adoption",
      "2026-03-01T12:00:00Z",
    );

    const result = await runCli(["workspace", "scan", "--json"], repoRoot);

    expect(result.exitCode).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.unregistered).toEqual([
      expect.objectContaining({
        path: "workspace/active/architecture/intent-adoption",
        last_activity: "2026-03-01",
        last_activity_days_ago: 10,
        stale: false,
      }),
    ]);
    expect(payload.summary).toMatchObject({
      stale_count: 0,
      stale_days: 30,
    });
  });

  it("respects a custom stale threshold for workspace scan", async () => {
    const repoRoot = await createTestRepo();

    await createWorkspaceDirectory(
      repoRoot,
      "workspace/active/architecture/intent-adoption",
    );
    await commitWorkspacePath(
      repoRoot,
      "workspace/active/architecture/intent-adoption",
      "2026-03-01T12:00:00Z",
    );

    const result = await runCli(["workspace", "scan", "--stale-days", "5", "--json"], repoRoot);

    expect(result.exitCode).toBe(0);

    const payload = JSON.parse(result.stdout);
    expect(payload.unregistered).toEqual([
      expect.objectContaining({
        path: "workspace/active/architecture/intent-adoption",
        last_activity: "2026-03-01",
        last_activity_days_ago: 10,
        stale: true,
      }),
    ]);
    expect(payload.summary).toMatchObject({
      stale_count: 1,
      stale_days: 5,
    });
  });

  it("renders workspace scan for humans", async () => {
    const repoRoot = await createTestRepo();

    await createWorkspaceDirectory(
      repoRoot,
      "workspace/active/architecture/intent-adoption",
    );
    await commitWorkspacePath(
      repoRoot,
      "workspace/active/architecture/intent-adoption",
      "2026-03-01T12:00:00Z",
    );

    const result = await runCli(["workspace", "scan", "--stale-days", "5"], repoRoot);

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Agonda");
    expect(result.stdout).toContain("Workspace scan");
    expect(result.stdout).toContain("UNREGISTERED");
    expect(result.stdout).toContain("workspace/active/architecture/intent-adoption");
    expect(result.stdout).toContain("10d ago");
    expect(result.stdout).toContain("Stale 1  |  threshold 5d");
  });

  it("does not report nested directories inside a registered workspace", async () => {
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
    await createWorkspaceDirectory(repoRoot, "workspace/active/barryos-website/research/notes");

    const result = await runCli(["workspace", "scan", "--json"], repoRoot);

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).unregistered).toEqual([]);
  });

  it("rejects an invalid stale threshold", async () => {
    const repoRoot = await createTestRepo();

    const result = await runCli(["workspace", "scan", "--stale-days", "nope"], repoRoot);

    expect(result.exitCode).toBe(2);
    expect(result.stderr).toContain("stale-days must be a non-negative number");
  });

  it("creates and lists a workspace", async () => {
    const repoRoot = await createTestRepo();

    let result = await runCli(
      [
        "workspace",
        "create",
        "barryos-website",
        "--workbench",
        "website-dev",
        "--domain",
        "value",
        "--owner",
        "Thomas",
        "--deliverable",
        "Landing page with lead capture",
        "--work-type",
        "business",
        "--tactic",
        "T1.3",
        "--linear-type",
        "project",
        "--linear-id",
        "ALA-142",
        "--json",
      ],
      repoRoot,
    );

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      action: "workspace_created",
      name: "barryos-website",
      path: "workspace/active/barryos-website",
    });

    result = await runCli(["workspace", "list", "--json"], repoRoot);
    const payload = JSON.parse(result.stdout);
    expect(payload.summary.total).toBe(1);
    expect(payload.workspaces[0]).toMatchObject({
      name: "barryos-website",
      status: "active",
      tactic: "T1.3",
      linear: { type: "project", id: "ALA-142" },
    });

    result = await runCli(["workspace", "list"], repoRoot);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("ACTIVE (1)");
    expect(result.stdout).toContain("barryos-website");
    expect(result.stdout).toContain("website-dev");
    expect(result.stdout).toContain("Landing page with lead capture");
    expect(result.stdout).not.toContain("T1.3");
    expect(result.stdout).not.toContain("project:ALA-142");

    result = await runCli(["workspace", "list", "--verbose"], repoRoot);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("T1.3");
    expect(result.stdout).toContain("project:ALA-142");
  });

  it("links, completes, archives, and graduates a workspace", async () => {
    const repoRoot = await createTestRepo();

    await createWorkspace(repoRoot, "workspace/active/demo", {
      workbench: "website-dev",
      domain: "value",
      created: "2026-03-10",
      status: "active",
      owner: "Thomas",
      deliverable: "Build site",
      work_type: "business",
      tactic: null,
      linear: null,
      "graduated-to": [],
      "skip-synthesis": null,
    });

    let result = await runCli(
      [
        "workspace",
        "link",
        "--path",
        "workspace/active/demo",
        "--tactic",
        "T1.3",
        "--linear-type",
        "project",
        "--linear-id",
        "ALA-142",
        "--json",
      ],
      repoRoot,
    );
    expect(result.exitCode).toBe(0);

    result = await runCli(["workspace", "complete", "demo", "--json"], repoRoot);
    expect(JSON.parse(result.stdout)).toMatchObject({
      action: "workspace_completed",
      name: "demo",
      new_status: "ready-for-synthesis",
    });

    await runCli(
      [
        "workspace",
        "link",
        "--path",
        "workspace/active/demo",
        "--tactic",
        "T1.3",
      ],
      repoRoot,
    );

    result = await runCli(["workspace", "graduate", "demo", "--repo", "alavida-ai/website", "--json"], repoRoot);
    expect(JSON.parse(result.stdout)).toMatchObject({
      action: "workspace_graduated",
      graduated_to: ["alavida-ai/website"],
    });
  });

  it("archives a synthesizing workspace", async () => {
    const repoRoot = await createTestRepo();

    await createWorkspace(repoRoot, "workspace/active/synthesis-evals", {
      workbench: "website-dev",
      domain: "value",
      created: "2026-03-10",
      status: "synthesizing",
      owner: "Alex",
      deliverable: "Capture learnings",
      work_type: "internal",
      tactic: "T2.1",
      linear: null,
      "graduated-to": [],
      "skip-synthesis": null,
    });

    const result = await runCli(["workspace", "archive", "synthesis-evals", "--json"], repoRoot);
    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      action: "workspace_archived",
      name: "synthesis-evals",
      new_status: "archived",
    });
  });

  it("validates workspaces and reports drift as warnings", async () => {
    const repoRoot = await createTestRepo();

    await createWorkspace(repoRoot, "workspace/active/archived-here", {
      workbench: "website-dev",
      domain: "value",
      created: "2026-03-10",
      status: "archived",
      owner: "Alex",
      deliverable: "Done",
      work_type: "internal",
      tactic: null,
      linear: null,
      "graduated-to": [],
      "skip-synthesis": "No reusable insights",
    });

    let result = await runCli(["workspace", "validate", "--json"], repoRoot);

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      valid: true,
      warnings: [
        expect.objectContaining({
          workspace: "archived-here",
          check: "location_drift",
          severity: "warning",
        }),
      ],
    });

    result = await runCli(["workspace", "validate"], repoRoot);
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Agonda");
    expect(result.stdout).toContain("1 workspaces valid");
    expect(result.stdout).toContain("Warnings");
  });
});
