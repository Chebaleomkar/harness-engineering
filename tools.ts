import { spawnSync } from "node:child_process";
import { setPlan } from "./plan.ts";
import { sandboxCommand } from "./sandbox.ts";
import { shape } from "./shape.ts";
import { getSkill } from "./skills.ts";
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Args = Record<string, any>;

// In dry-run mode, edit, write and bash report what they would do and change nothing.
let dryRun = false;
export function setDryRun(on: boolean): void {
  dryRun = on;
}

const SKIP = new Set(["node_modules", ".git"]);
const MAX_MATCHES = 50;
const MAX_LINES = 200;

function ls(a: Args): string {
  return readdirSync(a.path ?? ".").join("\n");
}

// Returns a slice of a file with line numbers, so the model can cite and re-read exact spots.
function read(a: Args): string {
  const lines = readFileSync(a.path, "utf8").split("\n");
  const start = Math.max(1, a.start ?? 1);
  const limit = Math.min(a.limit ?? MAX_LINES, MAX_LINES);
  const slice = lines.slice(start - 1, start - 1 + limit);
  const out = slice.map((l, i) => `${start + i}\t${l}`).join("\n");
  const more = start - 1 + limit < lines.length ? `\n... ${lines.length} lines total, pass start to read more` : "";
  return out + more;
}

function* walk(dir: string): Generator<string> {
  if (!statSync(dir).isDirectory()) {
    yield dir;
    return;
  }
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

// Finds lines matching a regex across a directory tree.
function grep(a: Args): string {
  const re = new RegExp(a.pattern);
  const hits: string[] = [];
  for (const file of walk(a.path ?? ".")) {
    let text: string;
    try { text = readFileSync(file, "utf8"); } catch { continue; }
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) hits.push(`${file}:${i + 1}:${lines[i]}`);
      if (hits.length >= MAX_MATCHES) return hits.join("\n") + `\n... stopped at ${MAX_MATCHES} matches`;
    }
  }
  return hits.length ? hits.join("\n") : "no matches";
}

// Replaces one exact piece of text. Refuses unless it matches exactly once.
function edit(a: Args): string {
  const text = readFileSync(a.path, "utf8");
  const count = text.split(a.old).length - 1;
  if (count === 0) return `error: old text not found in ${a.path}. Read the file again and copy the text exactly.`;
  if (count > 1) return `error: old text appears ${count} times in ${a.path}. Include more surrounding text so it matches once.`;
  if (dryRun) return `dry run: would edit ${a.path}\n- ${a.old}\n+ ${a.new}`;
  writeFileSync(a.path, text.replace(a.old, () => a.new));
  return `edited ${a.path}`;
}

// Creates a new file. Refuses to overwrite so a full rewrite can't happen by accident.
function write(a: Args): string {
  if (existsSync(a.path)) return `error: ${a.path} already exists. Use edit to change it.`;
  if (dryRun) return `dry run: would create ${a.path} (${String(a.content).length} chars)`;
  writeFileSync(a.path, a.content);
  return `created ${a.path}`;
}

const TIMEOUT_MS = 10_000;

// Runs a shell command. The harness owns the timeout and output cap, not the model.
function bash(a: Args): string {
  if (dryRun) return `dry run: would run: ${a.command}`;
  const { cmd, args } = sandboxCommand(a.command);
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    timeout: TIMEOUT_MS,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (r.error && (r.error as NodeJS.ErrnoException).code === "ETIMEDOUT") {
    return `error: command timed out after ${TIMEOUT_MS / 1000}s and was killed. Do not run commands that wait or never exit.`;
  }
  if (r.error) return `error: ${r.error.message}`;
  return `exit code: ${r.status}\n${shape((r.stdout + r.stderr).trim())}`;
}

// Each tool carries its own usage line. The system prompt is built from these,
// so the prompt can never list a tool that does not exist or miss one that does.
const tools: Record<string, { usage: string; run: (a: Args) => string }> = {
  ls: { usage: `{"tool":"ls","path":"<directory>"}`, run: ls },
  grep: {
    usage: `{"tool":"grep","pattern":"<regex>","path":"<file or directory, optional>"}   finds matching lines as file:line:text`,
    run: grep,
  },
  read: {
    usage: `{"tool":"read","path":"<file>","start":<first line, optional>,"limit":<line count, optional>}`,
    run: read,
  },
  edit: {
    usage: `{"tool":"edit","path":"<file>","old":"<exact existing text>","new":"<replacement>"}   old must match exactly once`,
    run: edit,
  },
  write: {
    usage: `{"tool":"write","path":"<new file>","content":"<text>"}   only for files that do not exist yet`,
    run: write,
  },
  bash: {
    usage: `{"tool":"bash","command":"<shell command>"}   returns exit code (0 = success) and output`,
    run: bash,
  },
  todo: {
    usage:
      `{"tool":"todo","items":[{"text":"<step>","status":"pending|in_progress|done","note":"<what you learned, optional>"}]}` +
      `   replaces the whole plan. Put findings in note, because old tool results get cleared but the plan stays.`,
    run: (a) => setPlan(a.items),
  },
  load_skill: {
    usage: `{"tool":"load_skill","name":"<skill name>"}   loads the full instructions for a skill from the Skills list`,
    run: (a) => getSkill(a.name),
  },
};

export function toolUsage(): string {
  return Object.values(tools).map((t) => t.usage).join("\n");
}

export function runTool(req: Args): string {
  const tool = tools[req.tool];
  if (!tool) return `error: unknown tool ${req.tool}. Available: ${Object.keys(tools).join(", ")}`;
  try {
    return tool.run(req);
  } catch (e) {
    return `error: ${(e as Error).message}`;
  }
}
