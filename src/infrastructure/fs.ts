import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export async function readTextFile(path: string): Promise<string> {
  return readFile(path, "utf8");
}

export async function writeTextFile(path: string, contents: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents, "utf8");
}

export async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await writeTextFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function scanForFile(
  root: string,
  fileName: string,
  results: string[] = [],
): Promise<string[]> {
  let entries: Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;

  try {
    entries = (await readdir(root, {
      withFileTypes: true,
      encoding: "utf8",
    })) as Array<{ name: string; isDirectory(): boolean; isFile(): boolean }>;
  } catch {
    return results;
  }

  for (const entry of entries) {
    const entryPath = join(root, entry.name);

    if (entry.isDirectory()) {
      await scanForFile(entryPath, fileName, results);
      continue;
    }

    if (entry.isFile() && entry.name === fileName) {
      results.push(entryPath);
    }
  }

  return results;
}
