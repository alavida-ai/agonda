import { relative } from "node:path";
import {
  ensureGoalCapacity,
  ensureGoalExists,
  ensureUniqueGoalId,
  ensureUniqueTacticId,
  findGoal,
  findTactic,
  getCurrentWeek,
  getMaxWeeks,
  getTodayIso,
  isDeliverableTactic,
  validatePlan,
} from "../domain/plan.js";
import { ValidationError } from "../errors.js";
import { getPlanPath } from "../infrastructure/repo.js";
import { initializePlan, loadPlan, readPlanMaybe, savePlan } from "../infrastructure/plan-store.js";
import { scanWorkspaces } from "../infrastructure/workspace-store.js";
import type { Goal, PlanDocument, Tactic } from "../types.js";

function getWorkspaceByTactic(
  plan: PlanDocument,
  workspaceLinks: Awaited<ReturnType<typeof scanWorkspaces>>,
): Map<string, string> {
  const links = new Map<string, string>();
  for (const workspace of workspaceLinks) {
    if (workspace.manifest.tactic && plan.tactics.some((item) => item.id === workspace.manifest.tactic)) {
      links.set(workspace.manifest.tactic, workspace.relativeDir);
    }
  }
  return links;
}

export async function viewPlan(repoRoot: string): Promise<Record<string, unknown>> {
  const plan = await loadPlan(repoRoot);
  const currentWeek = getCurrentWeek(plan);
  const maxWeeks = getMaxWeeks(plan);
  const workspaces = await scanWorkspaces(repoRoot);
  const workspaceByTactic = getWorkspaceByTactic(plan, workspaces);
  const today = getTodayIso();
  const dueThisWeek = plan.tactics
    .filter((tactic) => {
      if (isDeliverableTactic(tactic)) {
        return tactic.due_week === currentWeek && !tactic.completed;
      }
      return true;
    })
    .map((tactic) => attachWorkspace(tactic, workspaceByTactic));
  const overdue = plan.tactics
    .filter(
      (tactic) =>
        isDeliverableTactic(tactic) &&
        tactic.due_week < currentWeek &&
        tactic.completed !== true,
    )
    .map((tactic) => attachWorkspace(tactic, workspaceByTactic));
  const habits = plan.tactics
    .filter((tactic) => tactic.type === "habit")
    .map((tactic) => attachWorkspace(tactic, workspaceByTactic));

  return {
    cycle: {
      ...plan.cycle,
      current_week: currentWeek,
      max_weeks: maxWeeks,
      last_edited: today,
      last_edited_days_ago: 0,
      plan_path: relative(repoRoot, getPlanPath(repoRoot)).replaceAll("\\", "/"),
    },
    vision: plan.vision,
    goals: plan.goals,
    due_this_week: dueThisWeek,
    overdue,
    habits,
  };
}

function attachWorkspace(
  tactic: Tactic,
  workspaceByTactic: Map<string, string>,
): Record<string, unknown> {
  return {
    ...tactic,
    workspace_path: workspaceByTactic.get(tactic.id) ?? null,
  };
}

export async function validatePlanCommand(repoRoot: string): Promise<Record<string, unknown>> {
  const source = await readPlanMaybe(repoRoot);
  if (!source) {
    throw new ValidationError("Plan not found");
  }
  const issues = validatePlan(source);

  return {
    valid: issues.length === 0,
    goals_count: source.goals.length,
    tactics_count: source.tactics.length,
    errors: issues,
  };
}

export async function initPlan(
  repoRoot: string,
  input: { name: string; start: string; end: string; vision: string },
): Promise<Record<string, unknown>> {
  const plan = await initializePlan(repoRoot, {
    name: input.name,
    start: input.start,
    end: input.end,
  }, input.vision);

  return {
    action: "plan_initialized",
    cycle: plan.cycle,
  };
}

export async function addGoal(
  repoRoot: string,
  input: Goal,
): Promise<Record<string, unknown>> {
  const plan = await loadPlan(repoRoot);
  ensureGoalCapacity(plan);
  ensureUniqueGoalId(plan, input.id);
  plan.goals.push(input);
  await savePlan(repoRoot, plan);
  return { action: "goal_added", id: input.id };
}

export async function editGoal(
  repoRoot: string,
  goalId: string,
  updates: Partial<Goal>,
): Promise<Record<string, unknown>> {
  if (Object.keys(updates).length === 0) {
    throw new ValidationError("At least one field must be provided");
  }
  const plan = await loadPlan(repoRoot);
  const goal = findGoal(plan, goalId);
  Object.assign(goal, updates);
  await savePlan(repoRoot, plan);
  return { action: "goal_edited", id: goalId };
}

export async function removeGoal(repoRoot: string, goalId: string): Promise<Record<string, unknown>> {
  const plan = await loadPlan(repoRoot);
  const index = plan.goals.findIndex((goal) => goal.id === goalId);
  if (index < 0) {
    throw new ValidationError(`Goal not found: ${goalId}`);
  }
  plan.goals.splice(index, 1);
  await savePlan(repoRoot, plan);
  return { action: "goal_removed", id: goalId };
}

export async function listGoals(repoRoot: string): Promise<Record<string, unknown>> {
  const plan = await loadPlan(repoRoot);
  return { goals: plan.goals };
}

export async function addTactic(
  repoRoot: string,
  tactic: Tactic,
): Promise<Record<string, unknown>> {
  const plan = await loadPlan(repoRoot);
  ensureUniqueTacticId(plan, tactic.id);
  ensureGoalExists(plan, tactic.goal);
  plan.tactics.push(tactic);
  await savePlan(repoRoot, plan);
  return { action: "tactic_added", id: tactic.id };
}

export async function editTactic(
  repoRoot: string,
  tacticId: string,
  updates: Partial<Tactic>,
): Promise<Record<string, unknown>> {
  if (Object.keys(updates).length === 0) {
    throw new ValidationError("At least one field must be provided");
  }
  const plan = await loadPlan(repoRoot);
  const tactic = findTactic(plan, tacticId);
  Object.assign(tactic, updates);
  await savePlan(repoRoot, plan);
  return { action: "tactic_edited", id: tacticId };
}

export async function removeTactic(
  repoRoot: string,
  tacticId: string,
): Promise<Record<string, unknown>> {
  const plan = await loadPlan(repoRoot);
  const index = plan.tactics.findIndex((tactic) => tactic.id === tacticId);
  if (index < 0) {
    throw new ValidationError(`Tactic not found: ${tacticId}`);
  }
  plan.tactics.splice(index, 1);
  await savePlan(repoRoot, plan);
  return { action: "tactic_removed", id: tacticId };
}

export async function listTactics(
  repoRoot: string,
  filters: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const plan = await loadPlan(repoRoot);
  const currentWeek = getCurrentWeek(plan);
  const tactics = plan.tactics.filter((tactic) => {
    if (typeof filters.owner === "string" && tactic.owner !== filters.owner) {
      return false;
    }
    if (typeof filters.goal === "string" && tactic.goal !== filters.goal) {
      return false;
    }
    if (typeof filters.type === "string" && tactic.type !== filters.type) {
      return false;
    }
    if (typeof filters.dueWeek === "number") {
      if (!isDeliverableTactic(tactic) || tactic.due_week !== filters.dueWeek) {
        return false;
      }
    }
    if (filters.overdue === true) {
      if (!isDeliverableTactic(tactic) || tactic.due_week >= currentWeek || tactic.completed) {
        return false;
      }
    }
    return true;
  });

  return {
    tactics,
    filters_applied: Object.fromEntries(
      Object.entries({
        owner: filters.owner,
        goal: filters.goal,
        type: filters.type,
        due_week: filters.dueWeek,
        overdue: filters.overdue,
      }).filter(([, value]) => value !== undefined),
    ),
  };
}

export async function completeTactic(
  repoRoot: string,
  tacticId: string,
  completedBy: string,
): Promise<Record<string, unknown>> {
  const plan = await loadPlan(repoRoot);
  const tactic = findTactic(plan, tacticId);
  if (!isDeliverableTactic(tactic)) {
    throw new ValidationError(`Cannot complete habit tactic: ${tacticId}`);
  }
  tactic.completed = true;
  tactic.completed_at = getTodayIso();
  tactic.completed_by = completedBy;
  await savePlan(repoRoot, plan);
  return {
    action: "tactic_completed",
    id: tacticId,
    completed_by: completedBy,
    completed_at: tactic.completed_at,
  };
}

export async function reopenTactic(
  repoRoot: string,
  tacticId: string,
): Promise<Record<string, unknown>> {
  const plan = await loadPlan(repoRoot);
  const tactic = findTactic(plan, tacticId);
  if (!isDeliverableTactic(tactic)) {
    throw new ValidationError(`Cannot reopen habit tactic: ${tacticId}`);
  }
  if (!tactic.completed) {
    throw new ValidationError(`Tactic is not completed: ${tacticId}`);
  }
  tactic.completed = false;
  tactic.completed_at = null;
  tactic.completed_by = null;
  await savePlan(repoRoot, plan);
  return { action: "tactic_reopened", id: tacticId };
}
