import { readdirSync } from "node:fs";
import { callModel } from "./model.ts";

const SYSTEM = `You are an agent. Reply with ONLY one JSON object, nothing else.
To use a tool: {"tool":"ls","path":"<directory>"}
To finish:     {"answer":"<your final answer>"}
Tools available: ls (lists a directory).
After a tool call you will see its result and can call another tool or answer.`;

function runTool(req: { tool: string; path?: string }): string {
  if (req.tool === "ls") return readdirSync(req.path ?? ".").join("\n");
  return `error: unknown tool ${req.tool}`;
}

function parse(text: string): any {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return JSON.parse(text.slice(start, end + 1));
}

export function agent(question: string, maxTurns = 8): string {
  const transcript: string[] = [`User: ${question}`];

  for (let turn = 1; turn <= maxTurns; turn++) {
    const reply = callModel(transcript.join("\n\n"), SYSTEM);
    console.log(`[turn ${turn}] model: ${reply}`);
    transcript.push(`Assistant: ${reply}`);

    const msg = parse(reply);
    if (msg.answer !== undefined) return msg.answer;

    const result = runTool(msg);
    console.log(`[turn ${turn}] tool result:\n${result}\n`);
    transcript.push(`Tool result:\n${result}`);
  }
  return "gave up: too many turns";
}

console.log("\nFINAL:", agent("List the files in the current directory. What is in them?"));
