import { agent } from "./agent.ts";
import { buildSystemPrompt } from "./prompt.ts";
import { setPlan } from "./plan.ts";

// Part A: the harness enforces plan rules. No model involved.
console.log("empty list      ->", setPlan([]));
console.log("bad status      ->", setPlan([{ text: "x", status: "finished" }]));
console.log("two in progress ->", setPlan([{ text: "a", status: "in_progress" }, { text: "b", status: "in_progress" }]));
console.log("valid           ->", setPlan([{ text: "a", status: "done" }, { text: "b", status: "pending" }]));

// Part B: the same task that thrashed in lesson 11, with the same tight 9000 character budget.
console.log(
  "\nFINAL:",
  agent(
    "Use the read tool on each of tools.ts, agent.ts, shape.ts and prompt.ts. Then give one line describing each file.",
    16,
    buildSystemPrompt(),
    9000,
  ),
);
