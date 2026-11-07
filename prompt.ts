import { loadProjectFiles } from "./context.ts";
import { memoryIndex } from "./memory.ts";
import { skillIndex } from "./skills.ts";
import { toolUsage } from "./tools.ts";

// The system prompt is assembled from parts so each one has a single job.
export function buildSystemPrompt(extraRules = "", toolNames?: string[]): string {
  const identity = "You are a coding agent working inside the user's project folder.";

  const format = `## Reply format
Reply with ONLY one JSON object, nothing else.
Never write a tool result yourself. The harness runs the tool and sends you the result.`;

  const tools = `## Tools
${toolUsage(toolNames)}
To finish: {"answer":"<your final answer>"}`;

  const rules = `## Rules
- Search with grep first, then read the exact file you need.
- Read a file before editing it.
- For a task with 3 or more steps, call todo first. Keep it updated as you go, and write what you learn in each note.
- Use paths relative to the working directory.
- If a tool returns an error, read it and change your next call.`;

  const files = loadProjectFiles();
  const project = files.length
    ? `## Project instructions (follow these; later files override earlier ones)\n` +
      files.map((f) => `### ${f.path}\n${f.text.trim()}`).join("\n\n")
    : "";

  const index = skillIndex();
  const skills = index
    ? `## Skills\nWhen a task matches a skill below, call load_skill first and follow it exactly. Do not guess its contents.\n${index}`
    : "";

  // Subagents get no memory section, because they cannot call recall.
  const memory =
    !toolNames || toolNames.includes("recall")
      ? `## Memory
These are notes saved in earlier sessions. They can be out of date, so check them against the code before relying on them. Load one with recall when it looks relevant.
When the user states a lasting preference, convention or fact that the code does not show, save it with remember. Never save secrets.
${memoryIndex() || "(none yet)"}`
      : "";

  const environment = `## Environment
Working directory: ${process.cwd()}
Platform: ${process.platform}
Date: ${new Date().toISOString().slice(0, 10)}`;

  return [identity, format, tools, rules, project, skills, memory, environment, extraRules].filter(Boolean).join("\n\n");
}
