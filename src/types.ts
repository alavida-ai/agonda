export interface Cycle {
  name: string;
  start: string;
  end: string;
}

export interface Goal {
  id: string;
  name: string;
  owner: string;
  lag_measure: string;
  target: number;
  current: number;
}

export interface HabitTactic {
  id: string;
  goal: string;
  text: string;
  owner: string;
  type: "habit";
  cadence: string;
}

export interface DeliverableTactic {
  id: string;
  goal: string;
  text: string;
  owner: string;
  type: "deliverable";
  due_week: number;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
}

export type Tactic = HabitTactic | DeliverableTactic;

export interface PlanDocument {
  cycle: Cycle;
  vision: string;
  goals: Goal[];
  tactics: Tactic[];
}

export type WorkspaceStatus =
  | "active"
  | "ready-for-synthesis"
  | "synthesizing"
  | "archived";

export type WorkType = "business" | "internal" | "change";
export type LinearType = "issue" | "milestone" | "project";

export interface LinearLink {
  type: LinearType;
  id: string;
  project?: string;
}

export interface WorkspaceManifest {
  workbench: string;
  domain: string;
  created: string;
  status: WorkspaceStatus;
  owner: string;
  deliverable: string;
  work_type: WorkType;
  tactic?: string | null;
  linear?: LinearLink | null;
  "graduated-to"?: string[];
  "skip-synthesis"?: string | null;
}

export interface ValidationIssue {
  field: string;
  message: string;
}

export interface WorkspaceDiagnostic {
  workspace: string;
  path: string;
  check: string;
  severity: "warning" | "error";
  message: string;
}
