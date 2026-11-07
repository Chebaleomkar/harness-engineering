const TOOL_RESULT = "Tool result:\n";
const CLEARED = "Tool result:\n[old result cleared to save space. Run the tool again if you still need it.]";

// Rough estimate: about 4 characters per token. Good enough to decide when to act.
export const estimateTokens = (chars: number): number => Math.ceil(chars / 4);

export function contextSize(system: string, transcript: string[]): number {
  return system.length + transcript.reduce((n, entry) => n + entry.length + 2, 0);
}

// Replaces the oldest tool results with a short stub until the context fits the budget.
// Keeps the question, the model's own replies, and the newest `keepRecent` tool results.
// Changes the transcript in place. Returns how many results it cleared.
export function compact(system: string, transcript: string[], budgetChars: number, keepRecent = 2): number {
  const results = transcript
    .map((entry, i) => (entry.startsWith(TOOL_RESULT) && entry !== CLEARED ? i : -1))
    .filter((i) => i !== -1);
  const clearable = results.slice(0, Math.max(0, results.length - keepRecent));

  let cleared = 0;
  for (const i of clearable) {
    if (contextSize(system, transcript) <= budgetChars) break;
    transcript[i] = CLEARED;
    cleared++;
  }
  return cleared;
}
