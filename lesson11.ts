import { agent } from "./agent.ts";
import { buildSystemPrompt } from "./prompt.ts";

// Part A: why long runs get expensive. No model involved, just arithmetic.1
let sent = 0;
let stored = 0;
for (let call = 1; call <= 10; call++) {
  stored += 2000;
  sent += stored;
}
console.log(`10 turns, 2000 chars added per turn: stored ${stored}, sent in total ${sent}\n`);

// Part B: a real run with a deliberately small budget, so the harness has to clear things.
const system = buildSystemPrompt();
console.log(`system prompt alone: ${system.length} chars. Budget for this run: 9000 chars.\n`);

console.log(
  "\nFINAL:",
  agent(
    "Use the read tool on each of tools.ts, agent.ts, shape.ts and prompt.ts. Then give one line describing each file.",
    14,
    system,
    9000,
  ),
);
