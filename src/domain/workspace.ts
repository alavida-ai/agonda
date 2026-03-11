import { relative } from "node:path";
import { ValidationError } from "../errors.js";
import type {
  LinearLink,
  WorkspaceDiagnostic,
  WorkspaceManifest,
  WorkspaceStatus,
} from "../types.js";

const statuses = new Set<WorkspaceStatus>([
  "active",
  "ready-for-synthesis",
  "synthesizing",
  "archived",
]);
const workTypes = new Set(["business", "internal", "change"]);
const linearTypes = new Set(["issue", "milestone", "project"]);

export interface WorkspaceRecord {
  name: string;
  absolutePath: string;
  relativePath: string;
  manifest: WorkspaceManifest;
}

export function validateWorkspace(
  manifest: WorkspaceManifest,
  record?: WorkspaceRecord,
): WorkspaceDiagnostic[] {
  const diagnostics: WorkspaceDiagnostic[] = [];
  const requiredFields: Array<keyof WorkspaceManifest> = [
    "workbench",
    "domain",
    "created",
    "status",
    "owner",
    "deliverable",
    "work_type",
  ];

  for (const field of requiredFields) {
    if (manifest[field] === undefined || manifest[field] === null || manifest[field] === "") {
      diagnostics.push({
        workspace: record?.name ?? "unknown",
        path: record?.relativePath ?? "",
        check: "required_field",
        severity: "error",
        message: `workspace.json missing required field: ${field}`,
      });
    }
  }

  if (!statuses.has(manifest.status)) {
    diagnostics.push({
      workspace: record?.name ?? "unknown",
      path: record?.relativePath ?? "",
      check: "enum",
      severity: "error",
      message: `Invalid status: ${manifest.status}. Must be one of: active, ready-for-synthesis, synthesizing, archived`,
    });
  }

  if (!workTypes.has(manifest.work_type)) {
    diagnostics.push({
      workspace: record?.name ?? "unknown",
      path: record?.relativePath ?? "",
      check: "enum",
      severity: "error",
      message: `Invalid work_type: ${manifest.work_type}. Must be one of: business, internal, change`,
    });
  }

  if (manifest.linear) {
    if (!linearTypes.has(manifest.linear.type)) {
      diagnostics.push({
        workspace: record?.name ?? "unknown",
        path: record?.relativePath ?? "",
        check: "enum",
        severity: "error",
        message: `Invalid linear.type: ${manifest.linear.type}`,
      });
    }

    if (manifest.linear.type === "milestone" && !manifest.linear.project) {
      diagnostics.push({
        workspace: record?.name ?? "unknown",
        path: record?.relativePath ?? "",
        check: "linear_project",
        severity: "error",
        message: "Milestone links require a project field",
      });
    }
  }

  if (manifest["skip-synthesis"] && manifest.status !== "archived") {
    diagnostics.push({
      workspace: record?.name ?? "unknown",
      path: record?.relativePath ?? "",
      check: "skip_synthesis",
      severity: "error",
      message: "skip-synthesis set but status is not archived",
    });
  }

  if (record) {
    const inArchive = record.relativePath.startsWith("workspace/archive/");

    if (manifest.status === "archived" && !inArchive) {
      diagnostics.push({
        workspace: record.name,
        path: record.relativePath,
        check: "location_drift",
        severity: "warning",
        message: "Archived workspace still in workspace/active/",
      });
    }

    if (
      inArchive &&
      (manifest.status === "active" || manifest.status === "ready-for-synthesis")
    ) {
      diagnostics.push({
        workspace: record.name,
        path: record.relativePath,
        check: "location_drift",
        severity: "error",
        message: "Active workspace in workspace/archive/",
      });
    }
  }

  return diagnostics;
}

export function assertWorkspaceValid(manifest: WorkspaceManifest): void {
  const errors = validateWorkspace(manifest).filter((item) => item.severity === "error");
  if (errors.length > 0) {
    throw new ValidationError(errors[0].message, errors.map((item) => item.message));
  }
}

export function ensureWorkspaceName(name: string): void {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) {
    throw new ValidationError(
      `Invalid workspace name: ${name}. Must be lowercase kebab-case`,
    );
  }
}

export function ensureTransition(current: WorkspaceStatus, target: WorkspaceStatus): void {
  const allowed = new Set([
    "active:ready-for-synthesis",
    "active:archived",
    "synthesizing:archived",
  ]);

  if (!allowed.has(`${current}:${target}`)) {
    if (target === "ready-for-synthesis" || target === "archived") {
      if (current !== "active" && target !== "archived") {
        throw new ValidationError(
          `Cannot complete from ${current}. Only active workspaces can be completed.`,
        );
      }

      if (target === "archived" && current !== "active" && current !== "synthesizing") {
        throw new ValidationError(
          `Cannot transition from ${current} to ${target}. No backwards transitions — create a new workspace.`,
        );
      }
    }

    throw new ValidationError(
      `Cannot transition from ${current} to ${target}. No backwards transitions — create a new workspace.`,
    );
  }
}

export function toWorkspaceRecord(
  repoRoot: string,
  absolutePath: string,
  manifest: WorkspaceManifest,
): WorkspaceRecord {
  const relativePath = relative(repoRoot, absolutePath).replaceAll("\\", "/");
  return {
    name: absolutePath.split("/").at(-2) ?? "unknown",
    absolutePath,
    relativePath,
    manifest,
  };
}

export function buildLinearLink(input: {
  linearType?: string;
  linearId?: string;
  linearProject?: string;
}): LinearLink | null {
  if (!input.linearType && !input.linearId) {
    return null;
  }

  if (!input.linearType || !input.linearId) {
    throw new ValidationError("Both --linear-type and --linear-id are required together");
  }

  const link: LinearLink = {
    type: input.linearType as LinearLink["type"],
    id: input.linearId,
  };

  if (input.linearProject) {
    link.project = input.linearProject;
  }

  return link;
}
