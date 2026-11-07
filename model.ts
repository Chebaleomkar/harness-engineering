import { spawnSync } from "node:child_process";

export type ModelCall = { text: string; inputTokens: number; outputTokens: number; costUsd: number; ms: number };

// Text in, text out, plus what the call cost. No tools, no memory, no project files.
// inputTokens counts everything the model read, including cached parts.
// ms is wall time around the whole process, so it includes the CLI's startup.
export function callModelDetailed(prompt: string, system = "You are a helpful assistant."): ModelCall {
  const start = Date.now();
  const r = spawnSync(
    "claude",
    [
      "-p", prompt,
      "--output-format", "json",
      "--tools", "",
      "--system-prompt", system,
      "--disable-slash-commands",
      "--setting-sources", "",
      "--no-session-persistence",
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) throw new Error(r.stderr || "claude failed");

  const out = JSON.parse(r.stdout);
  if (out.is_error) throw new Error(String(out.result ?? "claude reported an error"));
  const u = out.usage ?? {};
  return {
    text: String(out.result ?? "").trim(),
    inputTokens: (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0),
    outputTokens: u.output_tokens ?? 0,
    costUsd: out.total_cost_usd ?? 0,
    ms: Date.now() - start,
  };
}

export function callModel(prompt: string, system?: string): string {
  return callModelDetailed(prompt, system).text;
}
