---
name: agonda-cli
description: Explain and use the Agonda CLI for plan and workspace management. Use when a user asks how to run Agonda commands, how flags or output modes behave, how to create/link/complete/validate workspaces, how to manage plan goals or tactics, or how to automate Agonda with `--json`. Also use when a user pastes Agonda CLI output and wants help interpreting it.
---

# Agonda CLI

Use the Agonda CLI as a command-first interface.

Prefer giving the exact command the user should run, then explain only the minimum needed to use it safely. When the user wants automation, prefer `--json` examples.

## Workflow

1. Identify whether the question is about `plan` commands, `workspace` commands, or CLI concepts such as output modes, lifecycle, and schemas.
2. Load only the relevant reference file:
   - For install, output modes, repo discovery, and high-level boundaries: read `references/overview.md`.
   - For methodology, terminology, lifecycle meaning, and how plan/workspace/Linear/domain knowledge connect: read `references/methodology.md`.
   - For goals, tactics, cycle setup, or interpreting `plan` output: read `references/plan.md`.
   - For workspace creation, linking, lifecycle, validation, or filtering: read `references/workspace.md`.
3. Answer with the real current CLI surface only. Do not mention commands or flags that are not implemented.
4. Prefer the human-mode command first. Add a `--json` variant when the user is scripting, using agents, or asking for machine-readable output.
5. When describing `workspace list`, mention:
   - default human output is compact and readable
   - `--verbose` adds tactic and Linear metadata
   - `last_activity` in JSON comes from git history
   - human output shows `new` when a workspace has no commit history yet

## Output Rules

- Default to concise command snippets.
- Use fenced `bash` blocks for multi-step examples.
- If the user is comparing commands, explain the decision boundary in one short paragraph, not a long taxonomy.
- If the user wants an end-to-end workflow, structure it as a short numbered sequence.

## Guardrails

- Do not claim that `workspace migrate` exists in the current CLI.
- Do not claim a `workspace list --stale` flag exists.
- Do not claim a built-in SessionStart hook ships with the current CLI.
- Treat the references in this skill as the source of truth for shipped behavior, not older design docs.
- When an agent seems confused about terms like goal, tactic, workspace, workbench, synthesis, or archived, load `references/methodology.md` before answering.
