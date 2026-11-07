import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type Event = "PreToolUse" | "PostToolUse" | "Stop";
export type Hook = { event: Event; matcher?: string; command: string };

const TIMEOUT_MS = 5_000;

export function loadHooks(): Hook[] {
  const path = join(process.cwd(), "hooks.json");
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, "utf8")).hooks ?? [];
  } catch (e) {
    console.log(`[hook] warning: hooks.json is not valid JSON, no hooks will run: ${(e as Error).message}`);
    return [];
  }
}

// Runs every hook registered for an event. The hook gets the event as JSON on stdin.
// Exit 0 = carry on. Exit 2 = block, and stderr is the reason. Any other failure is
// logged and ignored, so a broken hook cannot wedge the agent.
// Returns the first block reason, or null.
export function runHooks(event: Event, payload: Record<string, unknown>, hooks: Hook[] = loadHooks()): string | null {
  for (const hook of hooks) {
    if (hook.event !== event) continue;
    if (hook.matcher && !new RegExp(`^(${hook.matcher})$`).test(String(payload.tool))) continue;

    const r = spawnSync("bash", ["-c", hook.command], {
      input: JSON.stringify({ event, ...payload }),
      encoding: "utf8",
      timeout: TIMEOUT_MS,
    });
    if (r.status === 2) return r.stderr.trim() || "blocked by a hook";
    if (r.status !== 0) {
      const why = r.error ? r.error.message : `exit ${r.status}`;
      console.log(`[hook] warning: "${hook.command}" failed (${why}) and was ignored`);
    }
  }
  return null;
}
