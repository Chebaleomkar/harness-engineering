import { existsSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { agent } from "./agent.ts";
import { forget, memoryIndex, recall, remember } from "./memory.ts";
import { setAsker } from "./permissions.ts";
import { buildSystemPrompt } from "./prompt.ts";
import { SUB_TOOLS } from "./subagent.ts";

// Usage: node lesson18.ts check | control | teach | use
// Each mode is its own process, so "use" really is a new session that can only know what is on disk.
const mode = process.argv[2] ?? "check";
setAsker(() => true); // the only "ask" in these runs is the test command, which is sandboxed

if (mode === "check") {
  process.env.HARNESS_MEMORY_DIR = mkdtempSync(join(tmpdir(), "harness-memory-"));
  const dirFiles = (): string[] => readdirSync(process.env.HARNESS_MEMORY_DIR!);

  let failed = 0;
  const check = (name: string, ok: boolean, detail = ""): void => {
    if (!ok) failed++;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `\n      ${detail}` : ""}`);
  };

  const note = { name: "test-command", description: "how to run the tests", content: "Run: node --test playground/" };
  check("saves a note", remember(note) === "saved memory test-command" && dirFiles().length === 1);
  check("the index lists it", memoryIndex() === "- test-command: how to run the tests", memoryIndex());
  check("recall returns the content", recall({ name: "test-command" }) === "Run: node --test playground/");
  check("same name updates, no duplicate", remember({ ...note, content: "Run: npm test" }) === "updated memory test-command" && dirFiles().length === 1);

  const rejects = (name: string, args: any): void => {
    const out = remember(args);
    check(name, out.startsWith("error:") && dirFiles().length === 1, out);
  };
  rejects("a path in the name is rejected", { ...note, name: "../evil" });
  rejects("a secret is rejected", { ...note, name: "creds", content: "api_key = abc123" });
  rejects("an oversized note is rejected", { ...note, name: "big", content: "x".repeat(601) });
  rejects("a multi-line description is rejected", { ...note, name: "multi", description: "a\nb" });
  check("recall of an unknown name lists what exists", recall({ name: "nope" }).includes("Available: test-command"));
  check("recall cannot escape the folder", recall({ name: "../package" }).startsWith("error:"));

  check("parent prompt has the Memory section", buildSystemPrompt().includes("- test-command:"));
  check("subagent prompt has no Memory section", !buildSystemPrompt("", SUB_TOOLS).includes("## Memory"));

  check("forget removes it", forget({ name: "test-command" }) === "forgot memory test-command" && dirFiles().length === 0);

  console.log(failed ? `\n${failed} FAILED` : "\nall checks passed");
  process.exit(failed ? 1 : 0);
}

if (mode === "control" || mode === "use") {
  console.log(`=== ${mode}: new session, memory on disk: ${memoryIndex() ? memoryIndex().replace(/\n/g, " | ") : "(none)"} ===`);
  console.log("FINAL:", agent("Run the lab and tell me how many tests passed.", 7));
}

if (mode === "teach") {
  console.log("=== teach: session 1 ===");
  console.log("FINAL:", agent("Remember this for next time: when I say 'run the lab', I mean running the command node --test playground/", 5));
  const dir = join(process.cwd(), ".harness-memory");
  for (const f of existsSync(dir) ? readdirSync(dir) : []) console.log(`\n--- .harness-memory/${f}\n${readFileSync(join(dir, f), "utf8")}`);
}
