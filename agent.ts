import { callModel } from "./model.ts";
import { runTool } from "./tools.ts";

const SYSTEM = `You are an agent. Reply with ONLY one JSON object, nothing else.
To use a tool, reply with one of:
{"tool":"ls","path":"<directory>"}
{"tool":"grep","pattern":"<regex>","path":"<directory, optional>"}   finds matching lines as file:line:text
{"tool":"read","path":"<file>","start":<first line, optional>,"limit":<line count, optional>}
{"tool":"edit","path":"<file>","old":"<exact existing text>","new":"<replacement>"}   old must match exactly once
{"tool":"write","path":"<new file>","content":"<text>"}   only for files that do not exist yet
{"tool":"bash","command":"<shell command>"}   runs in the project folder, returns exit code (0 = success) and output
To finish: {"answer":"<your final answer>"}
Search with grep first, then read the exact file you need. Read a file before editing it. After a tool call you see its result.`;

// Returns the first valid JSON object in the text, or null if there is none.
export function parse(text: string): any | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  for (let end = text.indexOf("}", start); end !== -1; end = text.indexOf("}", end + 1)) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {}
  }
  return null;
}

export function agent(question: string, maxTurns = 10): string {
  const transcript: string[] = [`User: ${question}`];

  for (let turn = 1; turn <= maxTurns; turn++) {
    const reply = callModel(transcript.join("\n\n"), SYSTEM);
    console.log(`[turn ${turn}] model: ${reply}`);

    const msg = parse(reply);
    // Record only the JSON we acted on. Anything else in the reply, like an invented tool result, is dropped.
    transcript.push(`Assistant: ${msg ? JSON.stringify(msg) : reply}`);
    if (!msg) {
      const err = "error: your reply was not a valid JSON object. Reply with only one JSON object.";
      console.log(`[turn ${turn}] ${err}\n`);
      transcript.push(`Tool result:\n${err}`);
      continue;
    }
    if (msg.answer !== undefined) return msg.answer;

    const result = runTool(msg);
    console.log(`[turn ${turn}] tool result:\n${result}\n`);
    transcript.push(`Tool result:\n${result}`);
  }
  return "gave up: too many turns";
}
