import { ValidationError } from "../errors.js";
import type {
  DeliverableTactic,
  Goal,
  PlanDocument,
  Tactic,
  ValidationIssue,
} from "../types.js";

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function diffDays(fromIso: string, toIso: string): number {
  const from = Date.parse(`${fromIso}T00:00:00Z`);
  const to = Date.parse(`${toIso}T00:00:00Z`);
  return Math.floor((to - from) / 86400000);
}

export function getMaxWeeks(plan: PlanDocument): number {
  return Math.ceil((diffDays(plan.cycle.start, plan.cycle.end) + 1) / 7);
}

export function getCurrentWeek(plan: PlanDocument, today = getTodayIso()): number {
  const maxWeeks = getMaxWeeks(plan);
  const raw = Math.floor(diffDays(plan.cycle.start, today) / 7) + 1;
  return Math.max(1, Math.min(maxWeeks, raw));
}

export function isDeliverableTactic(tactic: Tactic): tactic is DeliverableTactic {
  return tactic.type === "deliverable";
}

export function validatePlan(plan: PlanDocument): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isIsoDate(plan.cycle.start)) {
    issues.push({ field: "cycle.start", message: `Invalid date: ${plan.cycle.start}` });
  }

  if (!isIsoDate(plan.cycle.end)) {
    issues.push({ field: "cycle.end", message: `Invalid date: ${plan.cycle.end}` });
  }

  if (issues.length === 0 && Date.parse(plan.cycle.start) >= Date.parse(plan.cycle.end)) {
    issues.push({ field: "cycle", message: "Cycle start must be before end" });
  }

  if (plan.goals.length > 3) {
    issues.push({
      field: "goals",
      message: `Plan must have 1-3 goals, found ${plan.goals.length}`,
    });
  }

  const goalIds = new Set<string>();
  for (const [index, goal] of plan.goals.entries()) {
    if (goalIds.has(goal.id)) {
      issues.push({ field: `goals[${index}].id`, message: `Duplicate goal ID: ${goal.id}` });
    }
    goalIds.add(goal.id);
  }

  const tacticIds = new Set<string>();
  const maxWeeks = issues.length === 0 ? getMaxWeeks(plan) : undefined;

  for (const [index, tactic] of plan.tactics.entries()) {
    if (tacticIds.has(tactic.id)) {
      issues.push({
        field: `tactics[${index}].id`,
        message: `Duplicate tactic ID: ${tactic.id}`,
      });
    }
    tacticIds.add(tactic.id);

    if (!goalIds.has(tactic.goal)) {
      issues.push({
        field: `tactics[${index}].goal`,
        message: `Tactic ${tactic.id} references non-existent goal: ${tactic.goal}`,
      });
    }

    if (isDeliverableTactic(tactic)) {
      if (typeof tactic.due_week !== "number") {
        issues.push({
          field: `tactics[${index}].due_week`,
          message: `Deliverable tactic ${tactic.id} missing due_week`,
        });
      }

      if (typeof tactic.completed !== "boolean") {
        issues.push({
          field: `tactics[${index}].completed`,
          message: `Deliverable tactic ${tactic.id} missing completed field`,
        });
      }

      if (tactic.completed && (!tactic.completed_at || !tactic.completed_by)) {
        issues.push({
          field: `tactics[${index}].completed`,
          message: `Completed tactic ${tactic.id} missing completed_at/completed_by`,
        });
      }

      if (maxWeeks && tactic.due_week > maxWeeks) {
        issues.push({
          field: `tactics[${index}].due_week`,
          message: `Tactic ${tactic.id} due_week ${tactic.due_week} outside cycle range 1-${maxWeeks}`,
        });
      }
    } else if (!tactic.cadence) {
      issues.push({
        field: `tactics[${index}].cadence`,
        message: `Habit tactic ${tactic.id} missing cadence`,
      });
    }
  }

  return issues;
}

export function assertValidPlan(plan: PlanDocument): void {
  const issues = validatePlan(plan);
  if (issues.length > 0) {
    throw new ValidationError("Plan validation failed", issues.map((issue) => issue.message));
  }
}

export function createEmptyPlan(
  cycle: PlanDocument["cycle"],
  vision: string,
): PlanDocument {
  return {
    cycle,
    vision,
    goals: [],
    tactics: [],
  };
}

export function findGoal(plan: PlanDocument, goalId: string): Goal {
  const goal = plan.goals.find((entry) => entry.id === goalId);
  if (!goal) {
    throw new ValidationError(`Goal not found: ${goalId}`);
  }
  return goal;
}

export function findTactic(plan: PlanDocument, tacticId: string): Tactic {
  const tactic = plan.tactics.find((entry) => entry.id === tacticId);
  if (!tactic) {
    throw new ValidationError(`Tactic not found: ${tacticId}`);
  }
  return tactic;
}

export function ensureGoalCapacity(plan: PlanDocument): void {
  if (plan.goals.length >= 3) {
    throw new ValidationError("Plan cannot exceed 3 goals");
  }
}

export function ensureUniqueGoalId(plan: PlanDocument, id: string): void {
  if (plan.goals.some((goal) => goal.id === id)) {
    throw new ValidationError(`Duplicate goal ID: ${id}`);
  }
}

export function ensureUniqueTacticId(plan: PlanDocument, id: string): void {
  if (plan.tactics.some((tactic) => tactic.id === id)) {
    throw new ValidationError(`Duplicate tactic ID: ${id}`);
  }
}

export function ensureGoalExists(plan: PlanDocument, goalId: string): void {
  findGoal(plan, goalId);
}
