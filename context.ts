import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

const FILE_NAME = "HARNESS.md";
const MAX_CHARS = 4_000;

export type ProjectFile = { path: string; text: string };

// Collects HARNESS.md from the working directory up to the repo root.
// Returned general first, specific last, so the closest file wins on conflicts.
export function loadProjectFiles(cwd = process.cwd()): ProjectFile[] {
  const found: ProjectFile[] = [];
  let dir = cwd;
  while (true) {
    const path = join(dir, FILE_NAME);
    if (existsSync(path)) {
      const text = readFileSync(path, "utf8");
      const capped = text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + "\n[... file cut ...]" : text;
      found.unshift({ path, text: capped });
    }
    if (existsSync(join(dir, ".git")) || dirname(dir) === dir) break;
    dir = dirname(dir);
  }
  return found;
}
