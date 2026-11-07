// PreToolUse hook: stops the agent from changing protected files.
// Reads the event from stdin. Exit 2 blocks the call and stderr goes to the model.
import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const event = JSON.parse(readFileSync(0, "utf8"));
const PROTECTED = ["secret.txt", "HARNESS.md", "hooks.json", "hooks/"];

const rel = relative(process.cwd(), resolve(process.cwd(), String(event.input?.path ?? "")));
const hit = PROTECTED.find((p) => rel === p || (p.endsWith("/") && rel.startsWith(p)));

if (hit) {
  console.error(`${rel} is a protected file. The agent may not change it. Tell the user instead.`);
  process.exit(2);
}
