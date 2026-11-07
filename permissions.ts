import { readSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

type Args = Record<string, any>;
export type Verdict = { decision: "allow" | "ask" | "deny"; reason?: string };

const allow: Verdict = { decision: "allow" };
const ask: Verdict = { decision: "ask" };
const deny = (reason: string): Verdict => ({ decision: "deny", reason });

// delegate is safe to allow: the subagent it starts is read-only, and each of its own calls is checked too.
const READ_ONLY = new Set(["ls", "grep", "read", "todo", "load_skill", "delegate"]);
const PATH_TOOLS = new Set(["ls", "grep", "read", "edit", "write"]);

// Commands that only look at things. Still refused if they chain or redirect (see CHAINING).
const SAFE_COMMAND = /^(ls|pwd|echo|wc|cat|head|tail|date|git (status|diff|log)|node --version)(\s|$)/;
// "ls; rm -rf ~" starts with a safe command, so a prefix check alone is not enough.
const CHAINING = /[;&|<>`]|\$\(/;

const DANGEROUS: [RegExp, string][] = [
  [/\brm\b.*\s-[a-zA-Z]*[rRf]|\brm\b.*--(recursive|force)/, "recursive or forced delete"],
  [/\bsudo\b/, "sudo"],
  [/\bgit\s+push\b/, "git push publishes changes"],
  [/(curl|wget)[^|]*\|\s*(ba|z)?sh/, "pipes a download into a shell"],
  [/\bchmod\s+-R|\bmkfs|\bdd\s+if=/, "can damage the disk or permissions"],
];

// Decides what should happen to a tool call. Deny rules come first and always win.
export function decide(req: Args): Verdict {
  const tool = String(req.tool);

  if (PATH_TOOLS.has(tool) && req.path !== undefined) {
    const rel = relative(process.cwd(), resolve(process.cwd(), String(req.path)));
    if (rel.startsWith("..") || isAbsolute(rel)) return deny("path is outside the project folder");
    if (/(^|\/)\.env(\.|$)/.test(rel)) return deny("secrets file");
    if (/(^|\/)\.git(\/|$)/.test(rel) && (tool === "edit" || tool === "write")) return deny(".git internals");
  }

  if (tool === "bash") {
    const command = String(req.command ?? "");
    for (const [pattern, why] of DANGEROUS) if (pattern.test(command)) return deny(why);
    return SAFE_COMMAND.test(command) && !CHAINING.test(command) ? allow : ask;
  }

  if (READ_ONLY.has(tool)) return allow;
  if (tool === "edit" || tool === "write") return ask;
  return deny(`no permission rule for tool ${tool}`);
}

// Asks the person at the keyboard. Anything but "y" counts as no, including no keyboard at all.
export function askUser(question: string): boolean {
  process.stdout.write(`\n${question} [y/N] `);
  try {
    const buf = Buffer.alloc(256);
    const n = readSync(0, buf, 0, 256, null);
    return buf.toString("utf8", 0, n).trim().toLowerCase().startsWith("y");
  } catch {
    return false;
  }
}

let asker: (question: string) => boolean = askUser;
export function setAsker(fn: (question: string) => boolean): void {
  asker = fn;
}

function describe(req: Args): string {
  const text = JSON.stringify(req);
  return text.length > 200 ? text.slice(0, 200) + "..." : text;
}

// Returns null if the call may run, or the denial text to hand back to the model.
export function authorize(req: Args): string | null {
  const v = decide(req);
  console.log(`[permission] ${req.tool} -> ${v.decision}${v.reason ? ` (${v.reason})` : ""}`);
  if (v.decision === "allow") return null;
  if (v.decision === "deny") {
    return `denied: ${v.reason}. This is not allowed. Do not retry it. Choose another approach or tell the user.`;
  }
  if (asker(`Allow ${describe(req)}?`)) return null;
  return "denied: the user declined this action. Do not retry it. Ask the user what they want instead.";
}
