# Agonda CLI

## Project

`@alavida/agonda` — CLI for managing 12 Week Year execution plans and workspace lifecycles. TypeScript, clean layered architecture (presentation → application → domain → infrastructure).

## Skills & Intent

We use `@tanstack/intent` to ship agent-readable skills alongside the npm package. Skills live in `skills/` and are validated with `npx @tanstack/intent validate`. When source docs or CLI surface changes, run `npx @tanstack/intent stale` to check for drift.

This ensures consumers of `@alavida/agonda` can run `npx @tanstack/intent install` and their AI agent immediately understands how to use the CLI — correct commands, flags, output modes, and lifecycle patterns — without relying on training data or community-maintained rules files. Skills update automatically with `npm update`.

When modifying CLI commands, flags, or behavior:
1. Update the relevant reference file in `skills/agonda-cli/references/`
2. Run `npx @tanstack/intent validate` to check skill validity
3. Run `npx @tanstack/intent stale` to catch drift between skills and source docs

## Build & Test

```bash
npm run build    # tsc
npm test         # vitest run
npm run lint     # tsc --noEmit
```

## Publishing

Releases are tag-triggered via GitHub Actions. To publish:

```bash
npm version patch|minor|major
git push origin main --tags
```

The workflow builds, tests, verifies tag matches package.json, and publishes to npm with provenance attestation. Requires `NPM_TOKEN` secret in repo settings.

## Conventions

- All commands support `--json` for machine-readable output
- Exit codes: 0 success, 1 unexpected error, 2 validation failure
- Validate on every write — no invalid state persists to disk
- Plan path is hardcoded: `domains/operations/knowledge/plan.yaml`
- Workspace scanning: recursive search for `workspace.json` in `workspace/`
