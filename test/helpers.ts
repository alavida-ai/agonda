import { mkdtemp, cp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface TestRepoOptions {
  withPlan?: boolean;
}

export async function createTestRepo(options: TestRepoOptions = {}): Promise<string> {
  const repoRoot = await mkdtemp(join(tmpdir(), "agonda-"));

  await execFileAsync("git", ["init"], { cwd: repoRoot });
  await mkdir(join(repoRoot, "workspace", "active"), { recursive: true });
  await mkdir(join(repoRoot, "workspace", "archive"), { recursive: true });

  if (options.withPlan !== false) {
    const fixturePath = resolve("test/fixtures/domains/operations/knowledge/plan.yaml");
    const targetPath = join(repoRoot, "domains", "operations", "knowledge", "plan.yaml");
    await mkdir(dirname(targetPath), { recursive: true });
    await cp(fixturePath, targetPath);
  }

  return repoRoot;
}

export async function createWorkspace(
  repoRoot: string,
  relativePath: string,
  workspaceJson: Record<string, unknown>,
): Promise<void> {
  const workspaceDir = join(repoRoot, relativePath);
  await mkdir(workspaceDir, { recursive: true });
  await writeFile(
    join(workspaceDir, "workspace.json"),
    `${JSON.stringify(workspaceJson, null, 2)}\n`,
    "utf8",
  );
}

export async function createWorkspaceDirectory(
  repoRoot: string,
  relativePath: string,
): Promise<void> {
  await mkdir(join(repoRoot, relativePath), { recursive: true });
}

export async function commitWorkspacePath(
  repoRoot: string,
  relativePath: string,
  isoDate: string,
): Promise<void> {
  const markerPath = join(repoRoot, relativePath, "NOTES.md");
  await writeFile(markerPath, `Committed at ${isoDate}\n`, "utf8");
  await execFileAsync("git", ["add", relativePath], { cwd: repoRoot });
  await execFileAsync(
    "git",
    [
      "-c",
      "user.name=Agonda Tests",
      "-c",
      "user.email=tests@example.com",
      "commit",
      "-m",
      `Track ${relativePath}`,
    ],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: isoDate,
        GIT_COMMITTER_DATE: isoDate,
      },
    },
  );
}

export async function runCli(args: string[], cwd: string): Promise<CliResult> {
  const entrypoint = resolve("src/index.ts");
  const tsxCli = resolve("node_modules/tsx/dist/cli.mjs");

  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [tsxCli, entrypoint, ...args],
      {
        cwd,
        env: {
          ...process.env,
          FORCE_COLOR: "0",
          TZ: "UTC",
        },
      },
    );

    return { stdout, stderr, exitCode: 0 };
  } catch (error) {
    const failure = error as {
      stdout?: string;
      stderr?: string;
      code?: number;
    };

    return {
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
      exitCode: failure.code ?? 1,
    };
  }
}
