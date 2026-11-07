import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { TASKS, type Task } from "./suite-tasks.ts";

// Usage:
//   node lesson20.ts check                         test the graders, no model
//   node lesson20.ts run [--trials 3] [--only a,b] run the suite against the harness
const here = dirname(fileURLToPath(import.meta.url));
const [mode = "check", ...rest] = process.argv.slice(2);
const flag = (name: string): string | undefined => {
  const i = rest.indexOf(name);
  return i === -1 ? undefined : rest[i + 1];
};

const freshWorkspace = (task: Task, label: string): string => {
  const dir = mkdtempSync(join(tmpdir(), `suite-${task.id}-${label}-`));
  task.setup(dir);
  return dir;
};

if (mode === "check") {
  // A grader is only useful if it can fail and can pass. Test each one with a known good and a known bad outcome.
  let failed = 0;
  const check = (name: string, ok: boolean, detail = ""): void => {
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `\n      ${detail}` : ""}`);
  };
  for (const task of TASKS) {
    const untouched = task.check(freshWorkspace(task, "u"), "");
    check(
      `${task.id}: untouched workspace ${task.passesUntouched ? "passes" : "fails"}`,
      task.passesUntouched ? untouched === null : untouched !== null,
      untouched ? `reason: ${untouched}` : "",
    );
    const goodDir = freshWorkspace(task, "g");
    const good = task.check(goodDir, task.good(goodDir));
    check(`${task.id}: a correct outcome passes`, good === null, good ? `reason: ${good}` : "");
    const badDir = freshWorkspace(task, "b");
    const bad = task.check(badDir, task.bad(badDir));
    check(`${task.id}: a wrong outcome fails`, bad !== null, bad ? `reason: ${bad}` : "");
  }
  console.log(failed ? `\n${failed} FAILED` : "\nall graders can fail and can pass");
  process.exit(failed ? 1 : 0);
}

if (mode === "run") {
  const trials = Number(flag("--trials") ?? 1);
  const only = flag("--only")?.split(",");
  const selected = TASKS.filter((t) => !only || only.includes(t.id));
  const outDir = join(here, ".harness-results", new Date().toISOString().replace(/[:.]/g, "-"));
  mkdirSync(outDir, { recursive: true });

  type Result = { task: string; trial: number; passed: boolean; reason: string | null; turns: number; costUsd: number; ms: number; workspace: string };
  const results: Result[] = [];

  for (const task of selected) {
    for (let trial = 1; trial <= trials; trial++) {
      const workspace = freshWorkspace(task, String(trial));
      const traceDir = join(outDir, "traces", `${task.id}-${trial}`);
      const answerFile = join(outDir, `${task.id}-${trial}.answer.txt`);
      process.stdout.write(`${task.id} trial ${trial}/${trials} ... `);

      const r = spawnSync("node", [join(here, "suite-child.ts"), task.id], {
        cwd: workspace,
        env: { ...process.env, HARNESS_TRACE_DIR: traceDir, SUITE_ANSWER_FILE: answerFile },
        encoding: "utf8",
        timeout: 300_000,
        maxBuffer: 50 * 1024 * 1024,
      });
      writeFileSync(join(outDir, `${task.id}-${trial}.log`), r.stdout + r.stderr);

      const answer = existsSync(answerFile) ? readFileSync(answerFile, "utf8") : "";
      const reason =
        (r.error as NodeJS.ErrnoException | undefined)?.code === "ETIMEDOUT" ? "timed out after 5 minutes"
        : r.status !== 0 ? `agent process crashed: ${r.stderr.trim().split("\n").pop()}`
        : task.check(workspace, answer);

      // Turns, cost and time come from the lesson 19 trace.
      let turns = 0, costUsd = 0, ms = 0;
      if (existsSync(traceDir)) {
        const file = readdirSync(traceDir).filter((f) => f.endsWith(".jsonl")).sort().pop();
        const end = file && readFileSync(join(traceDir, file), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).find((e) => e.type === "run_end");
        if (end) ({ modelCalls: turns, costUsd, ms } = end);
      }
      results.push({ task: task.id, trial, passed: reason === null, reason, turns, costUsd, ms, workspace });
      console.log(reason === null ? "PASS" : `FAIL (${reason})`);
    }
  }

  writeFileSync(join(outDir, "results.json"), JSON.stringify(results, null, 2));

  console.log("\ntask                  passed  avg calls   avg cost   avg time");
  for (const task of selected) {
    const rs = results.filter((r) => r.task === task.id);
    const avg = (f: (r: Result) => number): number => rs.reduce((n, r) => n + f(r), 0) / rs.length;
    console.log(
      `${task.id.padEnd(21)} ${`${rs.filter((r) => r.passed).length}/${rs.length}`.padStart(6)} ${avg((r) => r.turns).toFixed(1).padStart(10)}` +
        `   $${avg((r) => r.costUsd).toFixed(4)}   ${(avg((r) => r.ms) / 1000).toFixed(1)}s`,
    );
  }
  const passed = results.filter((r) => r.passed).length;
  console.log(`\nOverall: ${passed}/${results.length} passed (${Math.round((passed / results.length) * 100)}%)   total cost $${results.reduce((n, r) => n + r.costUsd, 0).toFixed(4)}`);
  if (trials < 3) console.log(`Only ${trials} trial(s) per task. Treat this as a smoke test, not a measurement. Use --trials 3 or more to compare harness changes.`);
  for (const r of results.filter((x) => !x.passed)) console.log(`\nFAILED ${r.task} trial ${r.trial}: ${r.reason}\n  workspace: ${r.workspace}\n  log: ${join(outDir, `${r.task}-${r.trial}.log`)}`);
  console.log(`\nresults: ${outDir}`);
}
