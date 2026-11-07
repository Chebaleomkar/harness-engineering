import { spawnSync } from "node:child_process";

// Text in, text out. No tools, no memory, no project files.
export function callModel(prompt: string, system = "You are a helpful assistant."): string {
  const r = spawnSync(
    "claude",
    [
      "-p", prompt,
      "--tools", "",
      "--system-prompt", system,
      "--disable-slash-commands",
      "--setting-sources", "",
      "--no-session-persistence",
    ],
    { encoding: "utf8" },
  );
  if (r.status !== 0) throw new Error(r.stderr || "claude failed");
  return r.stdout.trim();
}
