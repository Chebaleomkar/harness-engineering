import { agent } from "./agent.ts";
import { restorePlan, snapshotPlan } from "./plan.ts";
import { buildSystemPrompt } from "./prompt.ts";
import { shape } from "./shape.ts";

// No bash, no edits, and no delegate, so a subagent cannot change anything or start more subagents.
export const SUB_TOOLS = ["ls", "grep", "read"];
const MAX_TURNS = 8;
const MAX_RETURN_CHARS = 2_000;

const RULE = `## Subagent
You were started by another agent to do one task. You know nothing about its conversation.
Do the task, then answer in under 150 words. Give file names and facts, not a description of your process.`;

// Runs a task in a fresh agent and returns only its final answer.
// Everything the subagent reads stays in its own context and is dropped when it finishes.
export function runSubagent(task: string): string {
  if (!task.trim()) return "error: task is empty. Say exactly what the subagent should find out.";

  const saved = snapshotPlan(); // the subagent resets the plan, so keep the parent's
  let peak = 0;
  const log = (message: string): void => {
    const hit = /\[context\] (\d+) chars/.exec(message);
    if (hit) peak = Math.max(peak, Number(hit[1]));
    console.log(message.split("\n").map((line) => `    | ${line}`).join("\n"));
  };

  try {
    const answer = agent(task, MAX_TURNS, buildSystemPrompt(RULE, SUB_TOOLS), 400_000, { log, tools: SUB_TOOLS });
    const out = shape(answer, MAX_RETURN_CHARS);
    console.log(`[subagent] finished. Its context peaked at ${peak} chars. The parent receives ${out.length}.`);
    return out;
  } finally {
    restorePlan(saved);
  }
}
