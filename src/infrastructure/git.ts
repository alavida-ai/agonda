import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface GitActivity {
  date: string | null;
  daysAgo: number | null;
}

export async function getLastActivity(
  repoRoot: string,
  relativePath: string,
): Promise<GitActivity> {
  try {
    const { stdout } = await execFileAsync("git", [
      "-C",
      repoRoot,
      "log",
      "-1",
      "--format=%aI",
      "--",
      relativePath,
    ]);

    const iso = stdout.trim();
    if (!iso) {
      return { date: null, daysAgo: null };
    }

    const date = iso.slice(0, 10);
    const activityTime = Date.parse(iso);
    const today = new Date();
    const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const activityUtc = Date.UTC(
      new Date(activityTime).getUTCFullYear(),
      new Date(activityTime).getUTCMonth(),
      new Date(activityTime).getUTCDate(),
    );

    return {
      date,
      daysAgo: Math.max(0, Math.floor((todayUtc - activityUtc) / 86400000)),
    };
  } catch {
    return { date: null, daysAgo: null };
  }
}
