import { describe, expect, it } from "vitest";
import { createTestRepo, createWorkspace, runCli } from "./helpers";

describe("workspace commands", () => {
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
