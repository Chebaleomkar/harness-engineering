import { spawn, type SpawnOptions } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compare, type Result, type Run } from "./compare.ts";
import { runTool, toolUsage } from "./tools.ts";

// Usage:
//   node lesson21.ts check
//   node lesson21.ts run <label> [--features edit-replace-all] [--trials 3] [--only a,b]
//   node lesson21.ts compare <labelA> <labelB> [--noise <labelA2>]
const here = dirname(fileURLToPath(import.meta.url));
const [mode = "check", ...rest] = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = rest.indexOf(name);
  return i === -1 ? undefined : rest[i + 1];
};
const labelFile = (label: string): string => join(here, ".harness-results", "labels", `${label}.json`);

// Runs a command, printing its output live while also keeping a copy to read afterwards.
function runStreaming(cmd: string, args: string[], options: SpawnOptions): Promise<{ status: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout!.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stdout += text;
      process.stdout.write(text);
    });
    child.stderr!.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stderr += text;
      process.stderr.write(text);
    });
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

if (mode === "check") {
  let failed = 0;
  const check = (name: string, ok: boolean, detail = ""): void => {
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `\n      ${detail}` : ""}`);
  };

  // Part A: the feature flag changes behavior and the prompt only when it is on.
  const file = join(mkdtempSync(join(tmpdir(), "harness-edit-")), "f.txt");
  const twice = "x = 1\ny = 1\n";
  const edit = (extra: object) => runTool({ tool: "edit", path: file, old: "1", new: "2", ...extra });

  delete process.env.HARNESS_FEATURES;
  check("flag off: prompt shows the original edit line", !toolUsage().includes(`"all"`));
  writeFileSync(file, twice);
  check("flag off: two matches is still an error", edit({}).startsWith("error:"));
  check("flag off: all:true is ignored", edit({ all: true }).startsWith("error:") && readFileSync(file, "utf8") === twice);

  process.env.HARNESS_FEATURES = "edit-replace-all";
  check("flag on: prompt shows the all option", toolUsage().includes(`"all":<true`));
  check("flag on: two matches without all is still an error", edit({}).startsWith("error:") && readFileSync(file, "utf8") === twice);
  check("flag on: all:true replaces every match", edit({ all: true }) === `edited ${file} (2 replacements)` && readFileSync(file, "utf8") === "x = 2\ny = 2\n");
  writeFileSync(file, "x = 1\n");
  check("flag on: all:true on a single match works", edit({ all: true }).includes("edited") && readFileSync(file, "utf8") === "x = 2\n");
  delete process.env.HARNESS_FEATURES;

  // Part B: the comparison logic, on made-up numbers with known answers.
  const mk = (task: string, turns: number[], passes: boolean[], cost = 0.01): Result[] =>
    turns.map((t, i) => ({ task, trial: i + 1, passed: passes[i], reason: null, turns: t, costUsd: cost, ms: 1000 }));
  const run = (label: string, features: string, results: Result[]): Run => ({ label, features, results });
  const yes3 = [true, true, true];

  const A = run("base", "", [...mk("clear-win", [12, 11, 13], yes3), ...mk("noisy", [3, 3, 4], yes3), ...mk("broken", [5, 5, 5], yes3), ...mk("worse", [2, 2, 3], yes3)]);
  const B = run("variant", "f", [...mk("clear-win", [5, 4, 6], yes3), ...mk("noisy", [3, 4, 3], yes3), ...mk("broken", [5, 5, 5], [true, false, false]), ...mk("worse", [6, 7, 6], yes3)]);
  const A2 = run("base2", "", [...mk("clear-win", [11, 12, 12], yes3, 0.011)]);
  const report = compare(A, B, A2);
  const line = (task: string): string => report.split("\n").find((l) => l.startsWith(task)) ?? "";
  check("non-overlapping fewer calls is a clear win", line("clear-win").includes("FEWER CALLS, clear"), line("clear-win").slice(-30));
  check("overlapping ranges are called noise", line("noisy").includes("within noise"), line("noisy").slice(-30));
  check("a drop in passes is a regression", line("broken").includes("REGRESSION"), line("broken").slice(-30));
  check("non-overlapping more calls is flagged", line("worse").includes("MORE CALLS, clear"), line("worse").slice(-30));
  check("the noise note is present", report.includes("Noise check: base vs base2"));
  check("without a noise run it warns you", compare(A, B).includes("No noise run given"));

  console.log(failed ? `\n${failed} FAILED` : "\nall checks passed");
  process.exit(failed ? 1 : 0);
}

if (mode === "run") {
  const label = rest[0];
  if (!label || label.startsWith("--")) throw new Error("usage: node lesson21.ts run <label> [--features f] [--trials N] [--only a,b]");
  const features = flag("--features") ?? "";
  const args = ["lesson20.ts", "run", "--trials", flag("--trials") ?? "3", ...(flag("--only") ? ["--only", flag("--only")!] : [])];

  // Streams the suite's output as it happens, so a long run shows progress instead of sitting silent.
  const r = await runStreaming("node", args, {
    cwd: here,
    env: { ...process.env, HARNESS_FEATURES: features },
    timeout: 40 * 60_000,
  });
  const dir = /^results: (.*)$/m.exec(r.stdout)?.[1];
  if (!dir) throw new Error(`the suite did not finish: ${r.stderr.slice(-300)}`);

  const results = JSON.parse(readFileSync(join(dir, "results.json"), "utf8"));
  mkdirSync(dirname(labelFile(label)), { recursive: true });
  writeFileSync(labelFile(label), JSON.stringify({ label, features, results }, null, 2));
  console.log(`saved as "${label}" [${features || "baseline"}]`);
}

if (mode === "compare") {
  const [a, b] = rest;
  if (!a || !b) throw new Error("usage: node lesson21.ts compare <labelA> <labelB> [--noise <labelA2>]");
  const load = (label: string): Run => JSON.parse(readFileSync(labelFile(label), "utf8"));
  const noise = flag("--noise");
  console.log(compare(load(a), load(b), noise ? load(noise) : undefined));
}
