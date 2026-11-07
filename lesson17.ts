import { agent } from "./agent.ts";
import { renderPlan, resetPlan, setPlan } from "./plan.ts";
import { buildSystemPrompt } from "./prompt.ts";
import { runSubagent, SUB_TOOLS } from "./subagent.ts";

let failed = 0;
function check(name: string, ok: boolean, detail = ""): void {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `\n      ${detail}` : ""}`);
}

// Part A: setup checks. No model involved.
const parentPrompt = buildSystemPrompt();
const subPrompt = buildSystemPrompt("", SUB_TOOLS);
check("parent is told about delegate", parentPrompt.includes(`"tool":"delegate"`));
check("subagent cannot see delegate, so it cannot recurse", !subPrompt.includes(`"tool":"delegate"`));
check("subagent cannot see bash or edit", !subPrompt.includes(`"tool":"bash"`) && !subPrompt.includes(`"tool":"edit"`));
check("subagent still has read and grep", subPrompt.includes(`"tool":"read"`) && subPrompt.includes(`"tool":"grep"`));
check("empty task is rejected", runSubagent("  ").startsWith("error:"));

setPlan([{ text: "parent step", status: "in_progress", note: "mine" }]);
const mine = renderPlan();
resetPlan(); // what starting a subagent does to the shared plan
check("a subagent start wipes the plan (the bug the snapshot guards against)", renderPlan() === "");
setPlan([{ text: "parent step", status: "in_progress", note: "mine" }]);

console.log(failed ? `\n${failed} FAILED` : "\nall checks passed");
if (failed) process.exit(1);

// Part B: the parent hands the reading to a subagent. The parent's context stays small.
console.log("\n=== Parent delegates a research task ===");
console.log(
  "FINAL:",
  agent(
    "In three sentences, explain how this project decides whether a bash command is allowed, needs a yes, or is denied. " +
      "Delegate the reading of the code to a subagent. Do not read the code yourself.",
  ),
);
