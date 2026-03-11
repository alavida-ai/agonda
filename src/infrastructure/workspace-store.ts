import { readdir } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { ensureDir, readTextFile, scanForFile, writeJsonFile, writeTextFile } from "./fs.js";
import { getWorkspaceRoot } from "./repo.js";
import { validateWorkspace } from "../domain/workspace.js";
import { ValidationError } from "../errors.js";
import type { WorkspaceManifest } from "../types.js";

export interface StoredWorkspace {
  name: string;
  absoluteDir: string;
  relativeDir: string;
  manifest: WorkspaceManifest;
}

export interface DiscoveredWorkspaceDir {
  name: string;
  absoluteDir: string;
  relativeDir: string;
}

export async function scanWorkspaces(repoRoot: string): Promise<StoredWorkspace[]> {
  const files = await scanForFile(getWorkspaceRoot(repoRoot), "workspace.json");
  const workspaces: StoredWorkspace[] = [];

  for (const file of files) {
    const manifest = JSON.parse(await readTextFile(file)) as WorkspaceManifest;
    const absoluteDir = file.replace(/\/workspace\.json$/, "");
    const relativeDir = relative(repoRoot, absoluteDir).replaceAll("\\", "/");

    workspaces.push({
      name: basename(absoluteDir),
      absoluteDir,
      relativeDir,
      manifest,
    });
  }

  return workspaces.sort((left, right) => left.relativeDir.localeCompare(right.relativeDir));
}

export async function saveWorkspace(
  absoluteDir: string,
  manifest: WorkspaceManifest,
): Promise<void> {
  const diagnostics = validateWorkspace(manifest);
  const errors = diagnostics.filter((item) => item.severity === "error");
  if (errors.length > 0) {
    throw new ValidationError(errors[0].message, errors.map((item) => item.message));
  }

  await ensureDir(absoluteDir);
  await writeJsonFile(join(absoluteDir, "workspace.json"), manifest);
}

export async function createWorkspaceFiles(
  absoluteDir: string,
  name: string,
  deliverable: string,
): Promise<void> {
  await ensureDir(absoluteDir);
  await writeTextFile(
    join(absoluteDir, "CONTINUE.md"),
    `# ${name}\n\n## Status: IN PROGRESS\n\n## Deliverable\n${deliverable}\n\n## Next Step\n\n`,
  );
  await writeTextFile(join(absoluteDir, "LEARNINGS.md"), "");
}

export async function scanWorkspaceDirectories(repoRoot: string): Promise<DiscoveredWorkspaceDir[]> {
  const activeRoot = join(getWorkspaceRoot(repoRoot), "active");
  const directories: DiscoveredWorkspaceDir[] = [];

  async function visit(currentDir: string, depth: number): Promise<void> {
    let entries: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;

    try {
      entries = (await readdir(currentDir, {
        withFileTypes: true,
        encoding: "utf8",
      })) as Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
    } catch {
      return;
    }

    const childDirectories = entries.filter((entry) => entry.isDirectory());

    if (childDirectories.length === 0 || depth >= 2) {
      directories.push({
        name: basename(currentDir),
        absoluteDir: currentDir,
        relativeDir: relative(repoRoot, currentDir).replaceAll("\\", "/"),
      });
      return;
    }

    for (const entry of childDirectories) {
      await visit(join(currentDir, entry.name), depth + 1);
    }
  }

  let entries: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;

  try {
    entries = (await readdir(activeRoot, {
      withFileTypes: true,
      encoding: "utf8",
    })) as Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
  } catch {
    return [];
  }

  for (const entry of entries.filter((item) => item.isDirectory())) {
    await visit(join(activeRoot, entry.name), 1);
  }

  return directories.sort((left, right) => left.relativeDir.localeCompare(right.relativeDir));
}
