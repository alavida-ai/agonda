import { brandBanner, padText, sectionTitle, subtle, symbol, truncateText } from "./visual-aid.js";

type HumanRenderer = (payload: unknown) => string;

interface WorkspaceListPayload {
  workspaces: Array<{
    name: string;
    owner: string;
    work_type: string;
    workbench: string;
    deliverable: string;
    last_activity?: string | null;
    last_activity_days_ago?: number | null;
    status: string;
    tactic?: string | null;
    linear?: { type: string; id: string } | null;
    stale?: boolean;
  }>;
  summary: {
    total: number;
    by_status: Record<string, number>;
    by_work_type: Record<string, number>;
    stale_count: number;
  };
}

interface WorkspaceListRenderOptions {
  verbose?: boolean;
}

interface WorkspaceValidatePayload {
  valid: boolean;
  workspaces_checked: number;
  errors: Array<{ workspace: string; message: string }>;
  warnings: Array<{ workspace: string; message: string }>;
}

interface WorkspaceScanPayload {
  unregistered: Array<{
    name: string;
    path: string;
    last_activity?: string | null;
    last_activity_days_ago?: number | null;
    stale: boolean;
  }>;
  summary: {
    registered_count: number;
    unregistered_count: number;
    stale_count: number;
    stale_days: number;
  };
}

interface PlanValidatePayload {
  valid: boolean;
  goals_count: number;
  tactics_count: number;
  errors: Array<{ message: string }>;
}

interface GoalListPayload {
  goals: Array<{
    id: string;
    name: string;
    owner: string;
    current: number;
    target: number;
  }>;
}

interface TacticListPayload {
  tactics: Array<{
    id: string;
    goal: string;
    text: string;
    owner: string;
    type: string;
    cadence?: string;
    due_week?: number;
    completed?: boolean;
  }>;
  filters_applied: Record<string, unknown>;
}

interface PlanViewPayload {
  cycle: {
    name: string;
    current_week: number;
    max_weeks: number;
  };
  goals: Array<{
    id: string;
    name: string;
    owner: string;
    current: number;
    target: number;
  }>;
  due_this_week: Array<{
    id: string;
    text: string;
    owner: string;
    type: string;
    due_week?: number;
    cadence?: string;
    workspace_path?: string | null;
  }>;
  overdue: Array<{
    id: string;
    text: string;
    owner: string;
    due_week?: number;
    workspace_path?: string | null;
  }>;
}

interface PlanCoveragePayload {
  cycle: {
    name: string;
    current_week: number;
    max_weeks: number;
  };
  goals: Array<{
    id: string;
    name: string;
    owner: string;
    current: number;
    target: number;
    tactics: Array<{
      id: string;
      text: string;
      owner: string;
      type: string;
      cadence?: string;
      due_week?: number;
      workspace_path?: string | null;
      covered: boolean;
    }>;
  }>;
  summary: {
    total_tactics: number;
    covered_tactics: number;
    uncovered_tactics: number;
    coverage_percent: number;
  };
  filters_applied: Record<string, unknown>;
}

export function printSuccess(
  payload: unknown,
  asJson: boolean,
  renderHuman?: HumanRenderer,
): void {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  process.stdout.write(`${renderHuman ? renderHuman(payload) : renderDefaultHuman(payload)}\n`);
}

export function printError(message: string): void {
  process.stderr.write(`${message}\n`);
}

export function renderWorkspaceList(
  payload: unknown,
  options: WorkspaceListRenderOptions = {},
): string {
  const data = payload as WorkspaceListPayload;
  if (data.workspaces.length === 0) {
    return `${brandBanner("Agonda", "Workspace list")}${symbol("info")} No workspaces found.`;
  }

  const sections = groupByStatus(data.workspaces);
  const lines: string[] = [
    brandBanner(
      "Agonda",
      `${data.summary.total} workspace${data.summary.total === 1 ? "" : "s"}`,
    ),
  ];

  for (const [status, workspaces] of sections) {
    lines.push(sectionTitle(status.toUpperCase(), `(${workspaces.length})`));
    lines.push("");

    for (const workspace of workspaces) {
      const summary = [
        padText(truncateText(workspace.name, 24), 24),
        padText(workspace.owner, 8),
        padText(workspace.work_type, 8),
      ];

      const activity = formatLastActivity(workspace.last_activity_days_ago);
      if (activity) {
        summary.push(activity);
      }

      if (workspace.stale) {
        summary.push(symbol("warning"));
      }

      lines.push(`  ${summary.join("  ")}`);
      lines.push(`    ${subtle("workbench:")} ${workspace.workbench}`);
      lines.push(`    ${subtle("deliverable:")} ${truncateText(workspace.deliverable, 88)}`);

      if (options.verbose) {
        if (workspace.tactic) {
          lines.push(`    ${subtle("tactic:")} ${workspace.tactic}`);
        }

        if (workspace.linear) {
          lines.push(`    ${subtle("linear:")} ${workspace.linear.type}:${workspace.linear.id}`);
        }
      }

      lines.push("");
    }
  }

  lines.push(
    subtle(
      `Total ${data.summary.total}  |  stale ${data.summary.stale_count}  |  ${formatSummary(data.summary.by_work_type)}`,
    ),
  );
  return lines.join("\n").trimEnd();
}

export function renderWorkspaceValidate(payload: unknown): string {
  const data = payload as WorkspaceValidatePayload;
  const lines = [
    brandBanner("Agonda", "Workspace validation"),
    data.valid
      ? `${symbol("success")} ${data.workspaces_checked} workspaces valid`
      : `${symbol("error")} ${data.errors.length} validation errors`,
  ];

  if (data.warnings.length > 0) {
    lines.push("");
    lines.push(sectionTitle("Warnings", `(${data.warnings.length})`));
    for (const warning of data.warnings) {
      lines.push(`  ${symbol("warning")} ${warning.workspace}: ${warning.message}`);
    }
  }

  if (data.errors.length > 0) {
    lines.push("");
    lines.push(sectionTitle("Errors", `(${data.errors.length})`));
    for (const error of data.errors) {
      lines.push(`  ${symbol("error")} ${error.workspace}: ${error.message}`);
    }
  }

  return lines.join("\n");
}

export function renderWorkspaceScan(payload: unknown): string {
  const data = payload as WorkspaceScanPayload;
  const lines = [
    brandBanner(
      "Agonda",
      `Workspace scan • ${data.summary.registered_count} registered • ${data.summary.unregistered_count} unknown`,
    ),
    sectionTitle("UNREGISTERED", `(${data.unregistered.length})`),
  ];

  if (data.unregistered.length === 0) {
    lines.push(`  ${subtle("No unregistered workspace directories found.")}`);
  } else {
    lines.push("");

    for (const directory of data.unregistered) {
      const meta = [formatLastActivity(directory.last_activity_days_ago)];
      if (directory.stale) {
        meta.push(symbol("warning"));
      }

      lines.push(`  ${directory.path}  ${meta.filter(Boolean).join("  ")}`);
    }
  }

  lines.push("");
  lines.push(
    subtle(
      `Stale ${data.summary.stale_count}  |  threshold ${data.summary.stale_days}d`,
    ),
  );

  return lines.join("\n").trimEnd();
}

export function renderPlanValidate(payload: unknown): string {
  const data = payload as PlanValidatePayload;
  if (data.valid) {
    return [
      brandBanner("Agonda", "Plan validation"),
      `${symbol("success")} plan.yaml is valid`,
      subtle(`${data.goals_count} goals  |  ${data.tactics_count} tactics`),
    ].join("\n");
  }

  return [
    brandBanner("Agonda", "Plan validation"),
    `${symbol("error")} plan.yaml has ${data.errors.length} errors`,
    ...data.errors.map((error) => `  ${symbol("error")} ${error.message}`),
  ].join("\n");
}

export function renderAction(payload: unknown): string {
  const data = payload as Record<string, unknown>;
  const label = String(data.action ?? "completed")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

  const primary =
    (typeof data.name === "string" && data.name) ||
    (typeof data.id === "string" && data.id) ||
    null;

  const lines = [brandBanner("Agonda", label)];

  if (primary) {
    lines.push(`${symbol("success")} ${primary}`);
  }

  if (typeof data.path === "string") {
    lines.push(`${subtle("path:")} ${data.path}`);
  }

  if (typeof data.new_status === "string") {
    lines.push(`${subtle("status:")} ${data.new_status}`);
  }

  if (typeof data.repo === "string") {
    lines.push(`${subtle("repo:")} ${data.repo}`);
  }

  if (typeof data.reminder === "string") {
    lines.push(`${subtle("next:")} ${data.reminder}`);
  }

  return lines.join("\n");
}

export function renderGoalList(payload: unknown): string {
  const data = payload as GoalListPayload;
  const lines = [brandBanner("Agonda", "Goals")];

  for (const goal of data.goals) {
    lines.push(
      `${padText(goal.id, 4)} ${truncateText(goal.name, 52)}  ${padText(goal.owner, 8)} ${goal.current}/${goal.target}`,
    );
  }

  return lines.join("\n");
}

export function renderTacticList(payload: unknown): string {
  const data = payload as TacticListPayload;
  const lines = [brandBanner("Agonda", "Tactics")];

  if (Object.keys(data.filters_applied).length > 0) {
    lines.push(subtle(`filters: ${formatFilters(data.filters_applied)}`));
  }

  lines.push("");

  for (const tactic of data.tactics) {
    const meta = [
      tactic.owner,
      tactic.type,
      tactic.type === "deliverable"
        ? `wk ${tactic.due_week}`
        : tactic.cadence ?? "",
    ]
      .filter(Boolean)
      .join("  ");

    lines.push(`${padText(tactic.id, 6)} ${truncateText(tactic.text, 72)}`);
    lines.push(`       ${subtle(meta)}`);
  }

  return lines.join("\n").trimEnd();
}

export function renderPlanView(payload: unknown): string {
  const data = payload as PlanViewPayload;
  const lines = [
    brandBanner(
      "Agonda",
      `Week ${data.cycle.current_week} of ${data.cycle.max_weeks} • ${data.cycle.name}`,
    ),
    sectionTitle("Goals"),
  ];

  for (const goal of data.goals) {
    lines.push(
      `  ${padText(goal.id, 4)} ${truncateText(goal.name, 52)}  ${padText(goal.owner, 8)} ${goal.current}/${goal.target}`,
    );
  }

  lines.push("");
  lines.push(sectionTitle("Due This Week", `(${data.due_this_week.length})`));
  if (data.due_this_week.length === 0) {
    lines.push(`  ${subtle("Nothing due this week.")}`);
  } else {
    for (const tactic of data.due_this_week) {
      lines.push(renderPlanTacticLine(tactic));
    }
  }

  lines.push("");
  lines.push(sectionTitle("Overdue", `(${data.overdue.length})`));
  if (data.overdue.length === 0) {
    lines.push(`  ${subtle("Nothing overdue.")}`);
  } else {
    for (const tactic of data.overdue) {
      lines.push(renderPlanTacticLine(tactic));
    }
  }

  return lines.join("\n");
}

export function renderPlanCoverage(payload: unknown): string {
  const data = payload as PlanCoveragePayload;
  const lines = [
    brandBanner(
      "Agonda",
      `Plan coverage • Week ${data.cycle.current_week} of ${data.cycle.max_weeks} • ${data.cycle.name}`,
    ),
  ];

  if (Object.keys(data.filters_applied).length > 0) {
    lines.push(subtle(`filters: ${formatFilters(data.filters_applied)}`));
    lines.push("");
  }

  for (const goal of data.goals) {
    lines.push(sectionTitle(goal.id, `${goal.current}/${goal.target}`));
    lines.push(`  ${goal.name}`);

    if (goal.tactics.length === 0) {
      lines.push(`  ${subtle("No tactics match the current filters.")}`);
      lines.push("");
      continue;
    }

    for (const tactic of goal.tactics) {
      const coverage = tactic.covered
        ? `${symbol("success")} ${tactic.workspace_path}`
        : `${symbol("warning")} no workspace`;
      const meta = [
        tactic.owner,
        tactic.type === "deliverable" ? `wk ${tactic.due_week}` : tactic.cadence,
        coverage,
      ]
        .filter(Boolean)
        .join("  ");

      lines.push(`  ${padText(tactic.id, 6)} ${truncateText(tactic.text, 72)}`);
      lines.push(`       ${subtle(meta)}`);
    }

    lines.push("");
  }

  lines.push(
    subtle(
      `Coverage: ${data.summary.covered_tactics}/${data.summary.total_tactics} tactics linked (${data.summary.coverage_percent}%)`,
    ),
  );

  return lines.join("\n").trimEnd();
}

function renderDefaultHuman(payload: unknown): string {
  if (typeof payload === "string") {
    return payload;
  }

  if (payload && typeof payload === "object" && "action" in payload) {
    return renderAction(payload);
  }

  return JSON.stringify(payload, null, 2);
}

function groupByStatus(
  workspaces: WorkspaceListPayload["workspaces"],
): Array<[string, WorkspaceListPayload["workspaces"]]> {
  const groups = new Map<string, WorkspaceListPayload["workspaces"]>();

  for (const workspace of workspaces) {
    const current = groups.get(workspace.status) ?? [];
    current.push(workspace);
    groups.set(workspace.status, current);
  }

  return [...groups.entries()];
}

function formatLastActivity(daysAgo: number | null | undefined): string | null {
  if (daysAgo === null || daysAgo === undefined) {
    return "new";
  }

  if (daysAgo === 0) {
    return "today";
  }

  if (daysAgo === 1) {
    return "1d ago";
  }

  return `${daysAgo}d ago`;
}

function formatSummary(summary: Record<string, number>): string {
  return Object.entries(summary)
    .map(([key, value]) => `${key}:${value}`)
    .join("  ");
}

function formatFilters(filters: Record<string, unknown>): string {
  return Object.entries(filters)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(", ");
}

function renderPlanTacticLine(tactic: {
  id: string;
  text: string;
  owner: string;
  type?: string;
  due_week?: number;
  cadence?: string;
  workspace_path?: string | null;
}): string {
  const meta = [
    tactic.owner,
    tactic.type === "deliverable" ? `wk ${tactic.due_week}` : tactic.cadence,
    tactic.workspace_path ? tactic.workspace_path : null,
  ]
    .filter(Boolean)
    .join("  ");

  return `  ${padText(tactic.id, 6)} ${truncateText(tactic.text, 68)}\n       ${subtle(meta)}`;
}
