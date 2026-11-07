import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { agent } from "./agent.ts";
import { decide, setAsker } from "./permissions.ts";
import { runTool, setDryRun } from "./tools.ts";

let failed = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `\n      ${detail.replace(/\n/g, "\n      ")}` : ""}`);
}
const bash = (command: string): string => runTool({ tool: "bash", command });

// Part A: the sandbox, called directly. A throwaway victim folder sits outside the project.
const victim = join(homedir(), "harness_victim");
mkdirSync(victim, { recursive: true });
writeFileSync(join(victim, "precious.txt"), "do not delete me\n");

console.log("=== Sandbox ===");
let out = bash("echo hi > inside.tmp && cat inside.tmp && rm inside.tmp");
check("write inside the project works", out.includes("exit code: 0") && out.includes("hi"), out);

const outside = join(homedir(), "outside.tmp");
out = bash(`echo hi > ${outside}`);
check("write outside the project is blocked", /not permitted/i.test(out) && !existsSync(outside), out);

const attack = `find ${victim} -delete`;
check("permissions alone do not catch find -delete", decide({ tool: "bash", command: attack }).decision === "ask");
out = bash(attack);
check("sandbox stops it anyway", existsSync(join(victim, "precious.txt")), out);

out = bash(`curl -s -m 5 -o /dev/null -w "%{http_code}" https://example.com`);
check("network is blocked", !out.includes("200"), out);

out = bash("ls ~/.ssh");
check("credential folder is unreadable", /not permitted/i.test(out), out);

rmSync(victim, { recursive: true, force: true });
rmSync(outside, { force: true });

// Part B: dry run, called directly. Nothing may change on disk.
console.log("\n=== Dry run ===");
const notesBefore = readFileSync("notes.txt", "utf8");
setDryRun(true);
out = runTool({ tool: "edit", path: "notes.txt", old: "buy oat milk", new: "buy soy milk" });
check("edit previews the change", out.startsWith("dry run: would edit"), out);
out = runTool({ tool: "write", path: "hello.txt", content: "hi" });
check("write previews the file", out.startsWith("dry run: would create"), out);
out = bash("touch should_not_exist.txt");
check("bash previews the command", out.startsWith("dry run: would run"), out);
check(
  "disk is unchanged",
  readFileSync("notes.txt", "utf8") === notesBefore && !existsSync("hello.txt") && !existsSync("should_not_exist.txt"),
);

console.log(failed ? `\n${failed} FAILED` : "\nall checks passed");
if (failed) process.exit(1);

// Part C: the model in dry-run mode. Nothing changes, so every question is answered yes.
setAsker(() => true);
console.log("\n=== Model, dry run ===");
console.log("FINAL:", agent("Create a new file hello.txt containing the text: hi"));
setDryRun(false);
console.log("hello.txt exists:", existsSync("hello.txt"));
