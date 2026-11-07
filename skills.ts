import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SKILLS_DIR = "skills";

type Skill = { name: string; description: string; body: string };

// A skill file starts with a short header holding a description, then the full instructions.
function parseSkill(name: string, raw: string): Skill {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { name, description: "(no description)", body: raw };
  const description = m[1].match(/^description:\s*(.*)$/m)?.[1] ?? "(no description)";
  return { name, description, body: m[2].trim() };
}

export function loadSkills(dir = join(process.cwd(), SKILLS_DIR)): Skill[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parseSkill(f.slice(0, -3), readFileSync(join(dir, f), "utf8")));
}

// The short list that is always in the prompt.
export function skillIndex(): string {
  return loadSkills().map((s) => `- ${s.name}: ${s.description}`).join("\n");
}

// The full instructions, loaded only when the model asks for one.
export function getSkill(name: string): string {
  const skill = loadSkills().find((s) => s.name === name);
  if (!skill) {
    const names = loadSkills().map((s) => s.name).join(", ");
    return `error: no skill named ${name}. Available: ${names}`;
  }
  return skill.body;
}
