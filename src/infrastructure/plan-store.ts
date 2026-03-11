import { readTextFile, writeTextFile } from "./fs.js";
import { parseYaml, stringifyYaml } from "./yaml.js";
import { getPlanPath } from "./repo.js";
import { createEmptyPlan, validatePlan } from "../domain/plan.js";
import { ValidationError } from "../errors.js";
import type { PlanDocument } from "../types.js";

export async function loadPlan(repoRoot: string): Promise<PlanDocument> {
  const path = getPlanPath(repoRoot);
  const source = await readTextFile(path);
  const plan = parseYaml<PlanDocument>(source);
  const issues = validatePlan(plan);

  if (issues.length > 0) {
    throw new ValidationError("Plan validation failed", issues.map((issue) => issue.message));
  }

  return plan;
}

export async function readPlanMaybe(repoRoot: string): Promise<PlanDocument | null> {
  try {
    return await loadPlan(repoRoot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function savePlan(repoRoot: string, plan: PlanDocument): Promise<void> {
  const issues = validatePlan(plan);
  if (issues.length > 0) {
    throw new ValidationError("Plan validation failed", issues.map((issue) => issue.message));
  }

  await writeTextFile(getPlanPath(repoRoot), stringifyYaml(plan));
}

export async function initializePlan(
  repoRoot: string,
  cycle: PlanDocument["cycle"],
  vision: string,
): Promise<PlanDocument> {
  const existing = await readPlanMaybe(repoRoot);
  const plan = existing ?? createEmptyPlan(cycle, vision);
  plan.cycle = cycle;
  plan.vision = vision;

  if (!existing) {
    plan.goals = [];
    plan.tactics = [];
  }

  await savePlan(repoRoot, plan);
  return plan;
}
