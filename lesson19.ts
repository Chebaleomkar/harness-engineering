import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { agent } from "./agent.ts";
import { summarize } from "./report.ts";
import { finishTrace, latestTrace, record, startTrace } from "./trace.ts";

// Usage: node lesson19.ts check | run
const mode = process.argv[2] ?? "check";

if (mode === "check") {
  let failed = 0;
  const check = (name: string, ok: boolean, detail = ""): void => {
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `\n      ${detail}` : ""}`);
  };

  record({ type: "model_call" }); // no trace is running, so this must do nothing and not throw
  check("record before startTrace does nothing", true);

  process.env.HARNESS_TRACE_DIR = mkdtempSync(join(tmpdir(), "harness-trace-"));
  startTrace("made-up run");
  const call = (agent: string, turn: number, inTok: number, outTok: number, ms: number) =>
    record({ type: "model_call", agent, turn, inputTokens: inTok, outputTokens: outTok, costUsd: 0.01, ms });
  const tool = (agent: string, name: string, ms: number, chars: number, outcome = "ok") =>
    record({ type: "tool_call", agent, turn: 1, tool: name, ms, resultChars: chars, outcome });

  call("main", 1, 1000, 50, 2000);
  tool("main", "grep", 20, 4000);
  call("main", 2, 1500, 60, 2500);
  tool("main", "delegate", 1600, 800); // contains the sub calls below
  call("sub", 1, 500, 40, 1500);
  tool("sub", "read", 10, 3000);
  tool("main", "bash", 1, 60, "denied_by_permissions");
  finishTrace("answered");

  const path = latestTrace()!;
  const lines = readFileSync(path, "utf8").split("\n").filter(Boolean);
  check("the trace file is one valid JSON object per line", lines.every((l) => JSON.parse(l).type));
  check("it starts with run_start and ends with run_end", JSON.parse(lines[0]).type === "run_start" && JSON.parse(lines.at(-1)!).type === "run_end");

  const report = summarize(path);
  const has = (name: string, text: string): void => check(name, report.includes(text), `looking for: ${text}`);
  has("cost adds up across main and sub", "Cost: $0.0300");
  has("counts calls by agent", "Model calls: 3 (2 main, 1 sub)");
  has("model time is the sum of all calls", "model 6.0s");
  has("delegate time is not counted twice", "tools 0.0s (1%)");
  has("delegate row says it includes the subagent", "includes the subagent's time");
  has("denied calls are counted", "denied 1");
  has("shows input growth across main calls", "1,000 -> 1,500");

  console.log(failed ? `\n${failed} FAILED` : "\nall checks passed");
  process.exit(failed ? 1 : 0);
}

if (mode === "run") {
  console.log(
    "FINAL:",
    agent(
      "In two sentences, explain how this project decides whether a bash command is allowed, needs a yes, or is denied. " +
        "Delegate the reading of the code to a subagent. Do not read the code yourself.",
    ),
  );
  const path = latestTrace();
  console.log(`\n=== Report for ${path} ===\n`);
  console.log(summarize(path!));
}
