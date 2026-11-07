import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type Args = Record<string, any>;
type Memory = { name: string; description: string; content: string };

// The name becomes a filename, so it must not be able to contain a path.
const NAME = /^[a-z0-9][a-z0-9-]{0,39}$/;
const MAX_CONTENT = 600;
const MAX_DESCRIPTION = 120;
const MAX_INDEX = 30;
const SECRET = /(api[_-]?key|secret|password|passwd|token)\s*[:=]|sk-[A-Za-z0-9]{10,}|-----BEGIN/i;

const dir = (): string => process.env.HARNESS_MEMORY_DIR ?? join(process.cwd(), ".harness-memory");
const BAD_NAME = `error: name must be lowercase letters, digits and hyphens, at most 40 characters, like "test-command".`;

function parse(name: string, raw: string): Memory {
  const m = raw.match(/^---\ndescription: (.*)\n---\n([\s\S]*)$/);
  return m ? { name, description: m[1], content: m[2].trim() } : { name, description: "(no description)", content: raw.trim() };
}

export function loadMemories(): Memory[] {
  if (!existsSync(dir())) return [];
  return readdirSync(dir())
    .filter((f) => f.endsWith(".md"))
    .map((f) => parse(f.slice(0, -3), readFileSync(join(dir(), f), "utf8")));
}

// The short list that goes in the prompt every session.
export function memoryIndex(): string {
  return loadMemories().slice(0, MAX_INDEX).map((m) => `- ${m.name}: ${m.description}`).join("\n");
}

// Saves a note. Reusing a name replaces the old note, so memory does not fill up with near-duplicates.
export function remember(a: Args): string {
  const name = String(a.name ?? "");
  const description = String(a.description ?? "").trim();
  const content = String(a.content ?? "").trim();

  if (!NAME.test(name)) return BAD_NAME;
  if (!description || !content) return "error: description and content are both required.";
  if (description.includes("\n")) return "error: description must be one line.";
  if (description.length > MAX_DESCRIPTION) {
    return `error: description is ${description.length} characters, the limit is ${MAX_DESCRIPTION}. Make it one short line.`;
  }
  if (content.length > MAX_CONTENT) {
    return `error: content is ${content.length} characters, the limit is ${MAX_CONTENT}. Save only the fact, not the story.`;
  }
  if (SECRET.test(description) || SECRET.test(content)) return "error: this looks like a secret. Never save keys, tokens or passwords.";

  mkdirSync(dir(), { recursive: true });
  const path = join(dir(), `${name}.md`);
  const existed = existsSync(path);
  writeFileSync(path, `---\ndescription: ${description}\n---\n${content}\n`);
  return `${existed ? "updated" : "saved"} memory ${name}`;
}

export function recall(a: Args): string {
  const name = String(a.name ?? "");
  if (!NAME.test(name)) return BAD_NAME;
  const found = loadMemories().find((m) => m.name === name);
  if (found) return found.content;
  const names = loadMemories().map((m) => m.name).join(", ") || "none";
  return `error: no memory named ${name}. Available: ${names}`;
}

export function forget(a: Args): string {
  const name = String(a.name ?? "");
  if (!NAME.test(name)) return BAD_NAME;
  const path = join(dir(), `${name}.md`);
  if (!existsSync(path)) return `error: no memory named ${name}.`;
  rmSync(path);
  return `forgot memory ${name}`;
}
