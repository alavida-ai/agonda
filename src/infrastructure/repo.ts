import { access } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { RepoError } from "../errors.js";

export async function findRepoRoot(start = process.cwd()): Promise<string> {
  let current = resolve(start);

  while (true) {
    try {
      await access(join(current, ".git"));
      return current;
    } catch {
      const parent = dirname(current);
      if (parent === current) {
        throw new RepoError();
      }
      current = parent;
    }
  }
}

export function getPlanPath(repoRoot: string): string {
  return join(repoRoot, "domains", "operations", "knowledge", "plan.yaml");
}

export function getWorkspaceRoot(repoRoot: string): string {
  return join(repoRoot, "workspace");
}
