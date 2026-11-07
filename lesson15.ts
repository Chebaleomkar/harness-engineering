import { existsSync, readFileSync } from "node:fs";
import { agent } from "./agent.ts";
import { runHooks, type Hook } from "./hooks.ts";
import { setAsker } from "./permissions.ts";

let failed = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `\n      ${detail}` : ""}`);
}
const lines = (): number =>
  existsSync(".harness-audit.log") ? readFileSync(".harness-audit.log", "utf8").split("\n").filter(Boolean).length : 0;

// Part A: the real hooks.json, called directly. No model involved.
console.log("=== Pre hook: protect-files ===");
let r = runHooks("PreToolUse", { tool: "write", input: { tool: "write", path: "secret.txt" } });
check("write to a protected file is blocked", !!r && r.includes("protected"), String(r));
r = runHooks("PreToolUse", { tool: "edit", input: { tool: "edit", path: "notes.txt" } });
check("edit to a normal file passes", r === null);
r = runHooks("PreToolUse", { tool: "read", input: { tool: "read", path: "secret.txt" } });
check("read is not matched, so it passes", r === null);

console.log("\n=== Post hook: audit log ===");
const before = lines();
runHooks("PostToolUse", { tool: "bash", input: { tool: "bash", command: "ls" }, result: "x" });
check("audit hook appended a line", lines() === before + 1);

// Part B: inline hooks, to show the other exit codes and events.
console.log("\n=== Exit codes and events ===");
const feedback: Hook[] = [{ event: "PostToolUse", matcher: "write", command: "echo 'file is not valid JSON' >&2; exit 2" }];
r = runHooks("PostToolUse", { tool: "write", input: {} }, feedback);
check("Post hook exit 2 returns feedback", r === "file is not valid JSON", String(r));

const broken: Hook[] = [{ event: "PreToolUse", command: "exit 1" }];
r = runHooks("PreToolUse", { tool: "write", input: {} }, broken);
check("a crashing hook is ignored, not a block", r === null);

const stop: Hook[] = [{ event: "Stop", command: "echo 'run the tests before finishing' >&2; exit 2" }];
r = runHooks("Stop", { answer: "done" }, stop);
check("Stop hook can say not yet", r === "run the tests before finishing", String(r));

console.log(failed ? `\n${failed} FAILED` : "\nall checks passed");
if (failed) process.exit(1);

// Part C: the model tries to change a protected file.
setAsker(() => true);
const secretBefore = readFileSync("secret.txt", "utf8");
const logBefore = lines();
console.log("\n=== Model tries to edit secret.txt ===");
console.log("FINAL:", agent("In secret.txt, change the word 'vault' to 'safe'. Then tell me what happened."));
console.log("\nsecret.txt unchanged:", readFileSync("secret.txt", "utf8") === secretBefore);
console.log(`audit log gained ${lines() - logBefore} line(s):`);
console.log(readFileSync(".harness-audit.log", "utf8").trim().split("\n").slice(-3).join("\n"));
