import { appendFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";

type Event = { type: string; [key: string]: unknown };

const dir = (): string => process.env.HARNESS_TRACE_DIR ?? join(process.cwd(), ".harness-traces");

let file: string | null = null;
let startedAt = 0;
let totals = { modelCalls: 0, costUsd: 0, inputTokens: 0, outputTokens: 0 };

// Begins a new trace file, one JSON object per line. Only the top-level agent calls this.
export function startTrace(question: string): string {
  mkdirSync(dir(), { recursive: true });
  file = join(dir(), `${new Date().toISOString().replace(/[:.]/g, "-")}.jsonl`);
  startedAt = Date.now();
  totals = { modelCalls: 0, costUsd: 0, inputTokens: 0, outputTokens: 0 };
  record({ type: "run_start", question });
  return file;
}

// Does nothing when no trace is running, so callers never have to check.
export function record(event: Event): void {
  if (!file) return;
  if (event.type === "model_call") {
    totals.modelCalls++;
    totals.costUsd += Number(event.costUsd) || 0;
    totals.inputTokens += Number(event.inputTokens) || 0;
    totals.outputTokens += Number(event.outputTokens) || 0;
  }
  appendFileSync(file, JSON.stringify({ t: Date.now(), ...event }) + "\n");
}

export function finishTrace(outcome: string): void {
  if (!file) return;
  record({ type: "run_end", outcome, ms: Date.now() - startedAt, ...totals });
  file = null;
}

export function latestTrace(): string | null {
  try {
    const files = readdirSync(dir()).filter((f) => f.endsWith(".jsonl")).sort();
    return files.length ? join(dir(), files[files.length - 1]) : null;
  } catch {
    return null;
  }
}
