#!/usr/bin/env node
import { Command } from "commander";
import { ValidationError, isAgondaError } from "./errors.js";
import { findRepoRoot } from "./infrastructure/repo.js";
import {
  printError,
  printSuccess,
  renderAction,
  renderGoalList,
  renderPlanCoverage,
  renderPlanView,
  renderPlanValidate,
  renderTacticList,
  renderWorkspaceList,
  renderWorkspaceScan,
  renderWorkspaceValidate,
} from "./presentation/output.js";
import {
  addGoal,
  addTactic,
  completeTactic,
  editGoal,
  editTactic,
  initPlan,
  listGoals,
  planCoverage,
  listTactics,
  removeGoal,
  removeTactic,
  reopenTactic,
  validatePlanCommand,
  viewPlan,
} from "./application/plan.js";
import {
  archiveWorkspaceCommand,
  completeWorkspaceCommand,
  createWorkspaceCommand,
  graduateWorkspaceCommand,
  linkWorkspaceCommand,
  listWorkspacesCommand,
  scanWorkspaceDirectoriesCommand,
  validateWorkspacesCommand,
} from "./application/workspace.js";
import type { Tactic } from "./types.js";

const program = new Command();
program.name("agonda");

function withJsonOption(command: Command): Command {
  return command.option("--json", "Output JSON");
}

function run(
  action: (repoRoot: string, options: Record<string, unknown>, args: string[]) => Promise<unknown>,
  renderHuman?: (payload: unknown) => string,
) {
  return async (...args: unknown[]) => {
    const commandIndex = [...args]
      .map((value, index) => ({ value, index }))
      .reverse()
      .find((entry) => entry.value instanceof Command)?.index;

    const command = (commandIndex === undefined ? undefined : args[commandIndex]) as
      | Command
      | undefined;
    const positional = args
      .slice(0, commandIndex ?? args.length)
      .filter((value) => typeof value === "string")
      .map((value) => String(value));
    const options = command?.opts<Record<string, unknown>>() ?? {};
    const asJson = process.argv.includes("--json");
    const repoRoot = await findRepoRoot();
    const payload = await action(repoRoot, options, positional);
    printSuccess(payload, asJson, renderHuman);
  };
}

withJsonOption(program.command("plan").description("Manage plan data"));
const plan = program.commands.at(-1)!;

withJsonOption(plan.command("view")).action(
  run(async (repoRoot) => viewPlan(repoRoot), renderPlanView),
);

withJsonOption(
  plan.command("coverage").option("--goal <id>").option("--uncovered-only"),
).action(
  run(async (repoRoot, options) =>
    planCoverage(repoRoot, {
      goal: options.goal ? String(options.goal) : undefined,
      uncoveredOnly: Boolean(options.uncoveredOnly) || undefined,
    }), renderPlanCoverage),
);

withJsonOption(plan.command("validate")).action(
  run(async (repoRoot, options) => {
    const payload = await validatePlanCommand(repoRoot);
    if (!payload.valid) {
      throw new ValidationError(
        "plan.yaml has validation errors",
        (payload.errors as Array<{ message: string }>).map((item) => item.message),
      );
    }
    return payload;
  }, renderPlanValidate),
);

withJsonOption(
  plan
    .command("init")
    .requiredOption("--name <name>")
    .requiredOption("--start <date>")
    .requiredOption("--end <date>")
    .requiredOption("--vision <vision>"),
).action(
  run(async (repoRoot, options) =>
    initPlan(repoRoot, {
      name: String(options.name),
      start: String(options.start),
      end: String(options.end),
      vision: String(options.vision),
    }), renderAction),
);

const goal = withJsonOption(plan.command("goal"));

withJsonOption(
  goal
    .command("add")
    .requiredOption("--id <id>")
    .requiredOption("--name <name>")
    .requiredOption("--owner <owner>")
    .requiredOption("--lag-measure <measure>")
    .requiredOption("--target <number>")
    .option("--current <number>"),
).action(
  run(async (repoRoot, options) =>
    addGoal(repoRoot, {
      id: String(options.id),
      name: String(options.name),
      owner: String(options.owner),
      lag_measure: String(options.lagMeasure),
      target: Number(options.target),
      current: options.current ? Number(options.current) : 0,
    }), renderAction),
);

withJsonOption(
  goal
    .command("edit")
    .argument("<id>")
    .option("--name <name>")
    .option("--owner <owner>")
    .option("--lag-measure <measure>")
    .option("--target <number>")
    .option("--current <number>"),
).action(
  run(async (repoRoot, options, args) =>
    editGoal(repoRoot, args[0], {
      ...(options.name ? { name: String(options.name) } : {}),
      ...(options.owner ? { owner: String(options.owner) } : {}),
      ...(options.lagMeasure ? { lag_measure: String(options.lagMeasure) } : {}),
      ...(options.target ? { target: Number(options.target) } : {}),
      ...(options.current ? { current: Number(options.current) } : {}),
    }), renderAction),
);

withJsonOption(goal.command("remove").argument("<id>")).action(
  run(async (repoRoot, _options, args) => removeGoal(repoRoot, args[0]), renderAction),
);

withJsonOption(goal.command("list")).action(
  run(async (repoRoot) => listGoals(repoRoot), renderGoalList),
);

const tactic = withJsonOption(plan.command("tactic"));

withJsonOption(
  tactic
    .command("add")
    .requiredOption("--id <id>")
    .requiredOption("--goal <goal>")
    .requiredOption("--text <text>")
    .requiredOption("--owner <owner>")
    .requiredOption("--type <type>")
    .option("--due-week <number>")
    .option("--cadence <cadence>"),
).action(
  run(async (repoRoot, options) =>
    addTactic(repoRoot, buildTacticFromOptions(options)), renderAction),
);

withJsonOption(
  tactic
    .command("edit")
    .argument("<id>")
    .option("--goal <goal>")
    .option("--text <text>")
    .option("--owner <owner>")
    .option("--type <type>")
    .option("--due-week <number>")
    .option("--cadence <cadence>"),
).action(
  run(async (repoRoot, options, args) => {
    const updates: Record<string, unknown> = {};
    if (options.goal) updates.goal = String(options.goal);
    if (options.text) updates.text = String(options.text);
    if (options.owner) updates.owner = String(options.owner);
    if (options.type) updates.type = String(options.type);
    if (options.dueWeek) updates.due_week = Number(options.dueWeek);
    if (options.cadence) updates.cadence = String(options.cadence);
    return editTactic(repoRoot, args[0], updates as Partial<Tactic>);
  }, renderAction),
);

withJsonOption(tactic.command("remove").argument("<id>")).action(
  run(async (repoRoot, _options, args) => removeTactic(repoRoot, args[0]), renderAction),
);

withJsonOption(
  tactic
    .command("list")
    .option("--owner <owner>")
    .option("--due-week <number>")
    .option("--goal <goal>")
    .option("--overdue")
    .option("--type <type>"),
).action(
  run(async (repoRoot, options) =>
    listTactics(repoRoot, {
      owner: options.owner ? String(options.owner) : undefined,
      dueWeek: options.dueWeek ? Number(options.dueWeek) : undefined,
      goal: options.goal ? String(options.goal) : undefined,
      overdue: Boolean(options.overdue) || undefined,
      type: options.type ? String(options.type) : undefined,
    }), renderTacticList),
);

withJsonOption(
  tactic.command("complete").argument("<id>").option("--by <name>"),
).action(
  run(async (repoRoot, options, args) =>
    completeTactic(repoRoot, args[0], options.by ? String(options.by) : "cli"), renderAction),
);

withJsonOption(tactic.command("reopen").argument("<id>")).action(
  run(async (repoRoot, _options, args) => reopenTactic(repoRoot, args[0]), renderAction),
);

const workspace = withJsonOption(program.command("workspace"));

withJsonOption(
  workspace
    .command("create")
    .argument("<name>")
    .requiredOption("--workbench <name>")
    .requiredOption("--domain <domain>")
    .requiredOption("--owner <owner>")
    .requiredOption("--deliverable <deliverable>")
    .requiredOption("--work-type <type>")
    .option("--tactic <id>")
    .option("--linear-type <type>")
    .option("--linear-id <id>")
    .option("--linear-project <id>"),
).action(
  run(async (repoRoot, options, args) =>
    createWorkspaceCommand(repoRoot, {
      name: args[0],
      workbench: String(options.workbench),
      domain: String(options.domain),
      owner: String(options.owner),
      deliverable: String(options.deliverable),
      workType: String(options.workType) as never,
      tactic: options.tactic ? String(options.tactic) : undefined,
      linearType: options.linearType ? String(options.linearType) : undefined,
      linearId: options.linearId ? String(options.linearId) : undefined,
      linearProject: options.linearProject ? String(options.linearProject) : undefined,
    }), renderAction),
);

withJsonOption(
  workspace
    .command("list")
    .option("--status <status>")
    .option("--owner <owner>")
    .option("--tactic <id>")
    .option("--workbench <name>")
    .option("--work-type <type>")
    .option("--linear-type <type>")
    .option("--linear-id <id>")
    .option("--linear-project <id>")
    .option("--verbose"),
).action(
  run(async (repoRoot, options) =>
    listWorkspacesCommand(repoRoot, {
      status: options.status ? String(options.status) : undefined,
      owner: options.owner ? String(options.owner) : undefined,
      tactic: options.tactic ? String(options.tactic) : undefined,
      workbench: options.workbench ? String(options.workbench) : undefined,
      workType: options.workType ? String(options.workType) : undefined,
      linearType: options.linearType ? String(options.linearType) : undefined,
      linearId: options.linearId ? String(options.linearId) : undefined,
      linearProject: options.linearProject ? String(options.linearProject) : undefined,
    }),
    (payload) => renderWorkspaceList(payload, { verbose: process.argv.includes("--verbose") }),
  ),
);

withJsonOption(
  workspace.command("scan").option("--stale-days <days>"),
).action(
  run(async (repoRoot, options) =>
    scanWorkspaceDirectoriesCommand(repoRoot, {
      staleDays: options.staleDays ? Number(options.staleDays) : undefined,
    }), renderWorkspaceScan),
);

withJsonOption(
  workspace
    .command("link")
    .option("--path <path>")
    .option("--tactic <id>")
    .option("--linear-type <type>")
    .option("--linear-id <id>")
    .option("--linear-project <id>"),
).action(
  run(async (repoRoot, options) =>
    linkWorkspaceCommand(repoRoot, {
      path: options.path ? String(options.path) : undefined,
      tactic: options.tactic ? String(options.tactic) : undefined,
      linearType: options.linearType ? String(options.linearType) : undefined,
      linearId: options.linearId ? String(options.linearId) : undefined,
      linearProject: options.linearProject ? String(options.linearProject) : undefined,
    }), renderAction),
);

withJsonOption(
  workspace.command("complete").argument("<name>").option("--skip-synthesis <reason>"),
).action(
  run(async (repoRoot, options, args) =>
    completeWorkspaceCommand(
      repoRoot,
      args[0],
      options.skipSynthesis ? String(options.skipSynthesis) : undefined,
    ), renderAction),
);

withJsonOption(workspace.command("archive").argument("<name>")).action(
  run(async (repoRoot, _options, args) => archiveWorkspaceCommand(repoRoot, args[0]), renderAction),
);

withJsonOption(
  workspace.command("graduate").argument("<name>").requiredOption("--repo <repo>"),
).action(
  run(async (repoRoot, options, args) =>
    graduateWorkspaceCommand(repoRoot, args[0], String(options.repo)), renderAction),
);

withJsonOption(workspace.command("validate")).action(
  run(async (repoRoot) => {
    const payload = await validateWorkspacesCommand(repoRoot);
    if (!payload.valid) {
      throw new ValidationError(
        "workspace validation failed",
        (payload.errors as Array<{ message: string }>).map((item) => item.message),
      );
    }
    return payload;
  }, renderWorkspaceValidate),
);

function buildTacticFromOptions(options: Record<string, unknown>): Tactic {
  if (options.type === "deliverable") {
    if (!options.dueWeek) {
      throw new ValidationError("Deliverable tactics require --due-week");
    }
    return {
      id: String(options.id),
      goal: String(options.goal),
      text: String(options.text),
      owner: String(options.owner),
      type: "deliverable",
      due_week: Number(options.dueWeek),
      completed: false,
      completed_at: null,
      completed_by: null,
    };
  }

  if (!options.cadence) {
    throw new ValidationError("Habit tactics require --cadence");
  }

  return {
    id: String(options.id),
    goal: String(options.goal),
    text: String(options.text),
    owner: String(options.owner),
    type: "habit",
    cadence: String(options.cadence),
  };
}

program.parseAsync(process.argv).catch((error: unknown) => {
  if (isAgondaError(error)) {
    printError(
      error.details?.length
        ? `${error.message}\n${error.details.map((item) => `- ${item}`).join("\n")}`
        : error.message,
    );
    process.exit(error.exitCode);
  }

  const message = error instanceof Error ? error.message : String(error);
  printError(message);
  process.exit(1);
});
