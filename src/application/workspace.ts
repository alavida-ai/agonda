import { access } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { buildLinearLink, ensureTransition, ensureWorkspaceName, validateWorkspace } from "../domain/workspace.js";
import { ValidationError } from "../errors.js";
import { getTodayIso } from "../domain/plan.js";
import { getLastActivity } from "../infrastructure/git.js";
import { getWorkspaceRoot } from "../infrastructure/repo.js";
import {
  createWorkspaceFiles,
  saveWorkspace,
  scanWorkspaceDirectories,
  scanWorkspaces,
} from "../infrastructure/workspace-store.js";
import { loadPlan } from "../infrastructure/plan-store.js";
import type { WorkspaceManifest, WorkspaceStatus } from "../types.js";

async function resolveWorkspaceByName(repoRoot: string, name: string) {
  const workspaces = await scanWorkspaces(repoRoot);
  const matches = workspaces.filter((workspace) => workspace.name === name);
  if (matches.length === 0) {
    throw new ValidationError(`Workspace not found: ${name}`);
  }
  if (matches.length > 1) {
    throw new ValidationError(`Workspace name is ambiguous: ${name}. Use --path.`);
  }
  return matches[0];
}

async function resolveWorkspaceByPath(repoRoot: string, workspacePath: string) {
  const absoluteDir = resolve(repoRoot, workspacePath);
  const workspaces = await scanWorkspaces(repoRoot);
  const match = workspaces.find((workspace) => workspace.absoluteDir === absoluteDir);
  if (!match) {
    throw new ValidationError(`Workspace not found at path: ${workspacePath}`);
  }
  return match;
}

export async function createWorkspaceCommand(
  repoRoot: string,
  input: {
    name: string;
    workbench: string;
    domain: string;
    owner: string;
    deliverable: string;
    workType: WorkspaceManifest["work_type"];
    tactic?: string;
    linearType?: string;
    linearId?: string;
    linearProject?: string;
  },
): Promise<Record<string, unknown>> {
  ensureWorkspaceName(input.name);

  const absoluteDir = join(getWorkspaceRoot(repoRoot), "active", input.name);
  try {
    await access(absoluteDir);
    throw new ValidationError(`Workspace already exists: ${input.name}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  if (input.tactic) {
    try {
      const plan = await loadPlan(repoRoot);
      if (!plan.tactics.some((tactic) => tactic.id === input.tactic)) {
        throw new ValidationError(`Unknown tactic: ${input.tactic}`);
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
    }
  }

  const manifest: WorkspaceManifest = {
    workbench: input.workbench,
    domain: input.domain,
    created: getTodayIso(),
    status: "active",
    owner: input.owner,
    deliverable: input.deliverable,
    work_type: input.workType,
    tactic: input.tactic ?? null,
    linear: buildLinearLink(input),
    "graduated-to": [],
    "skip-synthesis": null,
  };

  await saveWorkspace(absoluteDir, manifest);
  await createWorkspaceFiles(absoluteDir, input.name, input.deliverable);

  return {
    action: "workspace_created",
    name: input.name,
    path: relative(repoRoot, absoluteDir).replaceAll("\\", "/"),
    workspace_json: manifest,
  };
}

export async function listWorkspacesCommand(
  repoRoot: string,
  filters: {
    status?: string;
    owner?: string;
    tactic?: string;
    workbench?: string;
    workType?: string;
    linearType?: string;
    linearId?: string;
    linearProject?: string;
  },
): Promise<Record<string, unknown>> {
  const workspaces = await scanWorkspaces(repoRoot);
  const filtered = workspaces.filter((workspace) => {
    const { manifest } = workspace;
    if (filters.status && manifest.status !== filters.status) {
      return false;
    }
    if (filters.owner && manifest.owner !== filters.owner) {
      return false;
    }
    if (filters.tactic && manifest.tactic !== filters.tactic) {
      return false;
    }
    if (filters.workbench && manifest.workbench !== filters.workbench) {
      return false;
    }
    if (filters.workType && manifest.work_type !== filters.workType) {
      return false;
    }
    if (filters.linearType && manifest.linear?.type !== filters.linearType) {
      return false;
    }
    if (filters.linearId && manifest.linear?.id !== filters.linearId) {
      return false;
    }
    if (
      filters.linearProject &&
      manifest.linear?.project !== filters.linearProject &&
      !(manifest.linear?.type === "project" && manifest.linear.id === filters.linearProject)
    ) {
      return false;
    }
    return true;
  });

  const hydrated = await Promise.all(
    filtered.map(async (workspace) => {
      const activity = await getLastActivity(repoRoot, workspace.relativeDir);
      const stale =
        workspace.manifest.status === "active" &&
        activity.daysAgo !== null &&
        activity.daysAgo >= 14;

      return {
        name: workspace.name,
        path: workspace.relativeDir,
        ...workspace.manifest,
        last_activity: activity.date,
        last_activity_days_ago: activity.daysAgo,
        stale,
      };
    }),
  );

  return {
    workspaces: hydrated,
    summary: {
      total: hydrated.length,
      by_status: summarize(filtered, (workspace) => workspace.manifest.status),
      by_work_type: summarize(filtered, (workspace) => workspace.manifest.work_type),
      stale_count: hydrated.filter((workspace) => workspace.stale).length,
    },
    filters_applied: Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined),
    ),
  };
}

export async function scanWorkspaceDirectoriesCommand(
  repoRoot: string,
  input: { staleDays?: number } = {},
): Promise<Record<string, unknown>> {
  const staleDays = input.staleDays ?? 30;
  const registered = await scanWorkspaces(repoRoot);
  const discovered = await scanWorkspaceDirectories(repoRoot);
  const registeredDirs = new Set(registered.map((workspace) => workspace.relativeDir));
  const unregistered = discovered.filter((directory) => !registeredDirs.has(directory.relativeDir));

  const hydrated = await Promise.all(
    unregistered.map(async (directory) => {
      const activity = await getLastActivity(repoRoot, directory.relativeDir);

      return {
        name: directory.name,
        path: directory.relativeDir,
        last_activity: activity.date,
        last_activity_days_ago: activity.daysAgo,
        stale: activity.daysAgo !== null && activity.daysAgo >= staleDays,
      };
    }),
  );

  return {
    unregistered: hydrated,
    summary: {
      registered_count: registered.length,
      unregistered_count: hydrated.length,
      stale_count: hydrated.filter((directory) => directory.stale).length,
      stale_days: staleDays,
    },
  };
}

function summarize<T extends string>(
  workspaces: Awaited<ReturnType<typeof scanWorkspaces>>,
  selector: (workspace: Awaited<ReturnType<typeof scanWorkspaces>>[number]) => T,
): Record<T, number> {
  return workspaces.reduce(
    (summary, workspace) => {
      const key = selector(workspace);
      summary[key] = (summary[key] ?? 0) + 1;
      return summary;
    },
    {} as Record<T, number>,
  );
}

export async function linkWorkspaceCommand(
  repoRoot: string,
  input: {
    path?: string;
    tactic?: string;
    linearType?: string;
    linearId?: string;
    linearProject?: string;
  },
): Promise<Record<string, unknown>> {
  const workspace = input.path
    ? await resolveWorkspaceByPath(repoRoot, input.path)
    : await resolveWorkspaceByPath(repoRoot, ".");
  const manifest = workspace.manifest;

  if (!input.tactic && !input.linearType && !input.linearId) {
    throw new ValidationError("At least one link field must be provided");
  }

  if (input.tactic) {
    manifest.tactic = input.tactic;
  }

  if (input.linearType || input.linearId) {
    manifest.linear = buildLinearLink(input);
  }

  await saveWorkspace(workspace.absoluteDir, manifest);
  return {
    action: "workspace_linked",
    name: workspace.name,
    path: workspace.relativeDir,
  };
}

async function transitionWorkspace(
  repoRoot: string,
  name: string,
  targetStatus: WorkspaceStatus,
  skipReason?: string,
): Promise<Record<string, unknown>> {
  const workspace = await resolveWorkspaceByName(repoRoot, name);
  const { manifest } = workspace;
  ensureTransition(manifest.status, targetStatus);

  manifest.status = targetStatus;
  manifest["skip-synthesis"] = skipReason ?? (targetStatus === "archived" ? null : null);
  await saveWorkspace(workspace.absoluteDir, manifest);

  return {
    name,
    path: workspace.relativeDir,
    new_status: targetStatus,
    reminder: "move to workspace/archive/ when ready",
  };
}

export async function completeWorkspaceCommand(
  repoRoot: string,
  name: string,
  skipReason?: string,
): Promise<Record<string, unknown>> {
  const targetStatus = skipReason ? "archived" : "ready-for-synthesis";
  const result = await transitionWorkspace(repoRoot, name, targetStatus, skipReason);
  return {
    action: "workspace_completed",
    ...result,
  };
}

export async function archiveWorkspaceCommand(
  repoRoot: string,
  name: string,
): Promise<Record<string, unknown>> {
  const workspace = await resolveWorkspaceByName(repoRoot, name);
  if (workspace.manifest.status !== "synthesizing") {
    throw new ValidationError(
      `Cannot archive from ${workspace.manifest.status}. Archive is only valid from synthesizing. Use 'workspace complete' to close an active workspace.`,
    );
  }
  workspace.manifest.status = "archived";
  await saveWorkspace(workspace.absoluteDir, workspace.manifest);
  return {
    action: "workspace_archived",
    name,
    new_status: "archived",
    reminder: "move to workspace/archive/ when ready",
  };
}

export async function graduateWorkspaceCommand(
  repoRoot: string,
  name: string,
  repoIdentifier: string,
): Promise<Record<string, unknown>> {
  const workspace = await resolveWorkspaceByName(repoRoot, name);
  const graduated = workspace.manifest["graduated-to"] ?? [];
  if (!graduated.includes(repoIdentifier)) {
    graduated.push(repoIdentifier);
  }
  workspace.manifest["graduated-to"] = graduated;
  await saveWorkspace(workspace.absoluteDir, workspace.manifest);
  return {
    action: "workspace_graduated",
    name,
    repo: repoIdentifier,
    graduated_to: graduated,
  };
}

export async function validateWorkspacesCommand(
  repoRoot: string,
): Promise<Record<string, unknown>> {
  const workspaces = await scanWorkspaces(repoRoot);
  const diagnostics = workspaces.flatMap((workspace) =>
    validateWorkspace(workspace.manifest, {
      name: workspace.name,
      absolutePath: workspace.absoluteDir,
      relativePath: workspace.relativeDir,
      manifest: workspace.manifest,
    }),
  );

  return {
    valid: diagnostics.every((item) => item.severity !== "error"),
    workspaces_checked: workspaces.length,
    errors: diagnostics.filter((item) => item.severity === "error"),
    warnings: diagnostics.filter((item) => item.severity === "warning"),
  };
}
