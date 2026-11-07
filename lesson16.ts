import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { agent } from "./agent.ts";
import { runHooks } from "./hooks.ts";
import { setAsker } from "./permissions.ts";

const VERIFY = "node --test playground/";
process.env.HARNESS_VERIFY = VERIFY; // hooks/verify.ts reads this. Unset means no verification.

const BUGGY = `// Turns a title into a URL slug.
export function slugify(title: string): string {
  return title.toLowerCase().replace(" ", "-");
}
`;
const REFERENCE = `// Turns a title into a URL slug.
export function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/^the-/, "");
}
`;

let failed = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `\n      ${detail.replace(/\n/g, "\n      ")}` : ""}`);
}
const stopHook = (): string | null => runHooks("Stop", { answer: "done" });

// Part A: the verifier on its own. No model involved.
console.log("=== Verifier ===");
writeFileSync("playground/slug.ts", BUGGY);
let reason = stopHook();
check("buggy code is stopped", !!reason && reason.includes("Verification failed"), (reason ?? "").split("\n").slice(0, 6).join("\n"));

writeFileSync("playground/slug.ts", REFERENCE);
check("correct code is let through", stopHook() === null);

check(
  "the agent cannot edit the tests to cheat",
  !!runHooks("PreToolUse", { tool: "edit", input: { tool: "edit", path: "playground/slug.test.ts" } }),
);

// Part B: the model fixes the bug, with the harness checking its work when it says done.
writeFileSync("playground/slug.ts", BUGGY);
console.log(failed ? `\n${failed} FAILED` : "\nall checks passed");
if (failed) process.exit(1);

setAsker(() => true);
console.log("\n=== Model fixes slugify ===");
console.log("FINAL:", agent("Fix slugify in playground/slug.ts so it turns any title into a clean URL slug. Then say you are done.", 16));

const final = spawnSync("bash", ["-c", VERIFY], { encoding: "utf8" });
console.log(`\nindependent check after the run: ${final.status === 0 ? "PASS, tests pass" : "FAIL, tests still fail"}`);
console.log("tests edited by the agent:", readFileSync("playground/slug.test.ts", "utf8").includes("drops a leading The") ? "no" : "YES");
