import { agent } from "./agent.ts";
import { buildSystemPrompt } from "./prompt.ts";

const question = "How many .ts files are in this folder?";

console.log("=== THE SYSTEM PROMPT ===\n" + buildSystemPrompt() + "\n");

console.log("=== RUN 1: default prompt ===");
console.log("FINAL:", agent(question), "\n");

console.log("=== RUN 2: same question, one extra rule ===");
console.log("FINAL:", agent(question, 10, buildSystemPrompt("## Style\nAlways write your final answer in French.")));
