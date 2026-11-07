import { callModel } from "./model.ts";
import { buildSystemPrompt } from "./prompt.ts";
import { runHooks } from "./hooks.ts";
import { authorize } from "./permissions.ts";
import { renderPlan, resetPlan } from "./plan.ts";
import { runTool } from "./tools.ts";
import { compact, contextSize, estimateTokens } from "./window.ts";

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

const MAX_STOP_BLOCKS = 2;

export function agent(
  question: string,
  maxTurns = 10,
  system = buildSystemPrompt(),
  budgetChars = 400_000,
): string {
  resetPlan();
  const transcript: string[] = [`User: ${question}`];
  let stopBlocks = 0;

  for (let turn = 1; turn <= maxTurns; turn++) {
    const cleared = compact(system, transcript, budgetChars);
    if (cleared) console.log(`[context] over budget, cleared ${cleared} old tool result(s)`);
    // Results were just thrown away and nothing was saved. Tell the model now, while it can still act on it.
    if (cleared && !renderPlan()) {
      transcript.push(
        "Harness note: old tool results were just cleared to save space, and your plan is empty. " +
          "Call todo now and write what you learned from the files you read in each note, or you will have to read them again.",
      );
    }
    const used = contextSize(system, transcript);
    console.log(`[context] ${used} chars (~${estimateTokens(used)} tokens), budget ${budgetChars}`);

    // The plan is rebuilt from the store on every call and put last, where it is read most closely.
    const plan = renderPlan();
    if (plan) console.log(`[plan]\n${plan}`);
    const prompt = transcript.join("\n\n") + (plan ? `\n\nCurrent plan:\n${plan}` : "");

    const reply = callModel(prompt, system);
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
    if (msg.answer !== undefined) {
      // A Stop hook can send the model back to work. Capped so a hook cannot loop forever.
      const hold = runHooks("Stop", { answer: msg.answer });
      if (hold && stopBlocks < MAX_STOP_BLOCKS) {
        stopBlocks++;
        console.log(`[hook] Stop blocked: ${hold}`);
        transcript.push(`Harness note: a hook says you are not done yet. ${hold}`);
        continue;
      }
      return msg.answer;
    }

    // Pre hooks run first, then permissions, then the tool, then Post hooks give feedback.
    const blocked = runHooks("PreToolUse", { tool: msg.tool, input: msg });
    let result = blocked ? `denied by hook: ${blocked}` : (authorize(msg) ?? runTool(msg));
    if (!blocked) {
      const feedback = runHooks("PostToolUse", { tool: msg.tool, input: msg, result });
      if (feedback) result += `\nhook feedback: ${feedback}`;
    }
    console.log(`[turn ${turn}] tool result:\n${result}\n`);
    transcript.push(`Tool result:\n${result}`);
  }
  return "gave up: too many turns";
}
