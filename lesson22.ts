import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Usage: node lesson22.ts check   (no model, fast)
//        node lesson22.ts run     (real model, about $0.05, three runs)
const here = dirname(fileURLToPath(import.meta.url));
const HARNESS = join(here, "harness");
const mode = process.argv[2] ?? "check";

let failed = 0;
const check = (name: string, ok: boolean, detail = ""): void => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `\n      ${detail}` : ""}`);
};

// A project folder with its own instructions, outside the harness repo.
const project = (codename: string): string => {
  const dir = mkdtempSync(join(tmpdir(), "harness-project-"));
  writeFileSync(join(dir, "HARNESS.md"), `Project codename: ${codename}\n`);
  return dir;
};
const run = (args: string[], cwd: string, input = "") =>
  spawnSync(HARNESS, args, { cwd, input, encoding: "utf8", timeout: 600_000 });

if (mode === "check") {
  const a = project("ORCHARD");
  const b = project("LANTERN");

  const ctxA = run(["--show-context"], a).stdout;
  const ctxB = run(["--show-context"], b).stdout;
  check("from folder A, the agent sees A's instructions", ctxA.includes("ORCHARD") && !ctxA.includes("LANTERN"));
  check("from folder B, the agent sees B's instructions", ctxB.includes("LANTERN") && !ctxB.includes("ORCHARD"));

  // The same command, run through a symlink from somewhere else, as if it were on PATH.
  const bin = mkdtempSync(join(tmpdir(), "harness-bin-"));
  symlinkSync(HARNESS, join(bin, "harness"));
  const viaLink = spawnSync(join(bin, "harness"), ["--show-context"], { cwd: b, encoding: "utf8" });
  check("works through a symlink from another folder", viaLink.status === 0 && viaLink.stdout.includes("LANTERN"), viaLink.stderr);

  const help = run(["--help"], a);
  check("--help exits 0", help.status === 0 && help.stdout.includes("usage: harness"));
  const bad = run(["--nope"], a);
  check("an unknown flag exits 2 with a message", bad.status === 2 && bad.stderr.includes("unknown option --nope"));
  const badApproval = run(["--approval", "maybe", "hi"], a);
  check("a bad --approval value exits 2", badApproval.status === 2);
  const empty = run([], a, "");
  check("no task and empty stdin exits 2", empty.status === 2 && empty.stderr.includes("no task"));

  console.log(failed ? `\n${failed} FAILED` : "\nall checks passed");
  process.exit(failed ? 1 : 0);
}

if (mode === "run") {
  const a = project("ORCHARD");
  const b = project("LANTERN");
  const question = "What is this project's codename? Reply with only the codename.";

  console.log("=== one task from folder A ===");
  const fromA = run([question], a);
  console.log(fromA.stdout.trim(), `  (exit ${fromA.status})`);
  check("folder A's run answers ORCHARD", fromA.stdout.includes("ORCHARD") && fromA.status === 0);

  console.log("\n=== the same task from folder B ===");
  const fromB = run([question], b);
  console.log(fromB.stdout.trim(), `  (exit ${fromB.status})`);
  check("folder B's run answers LANTERN", fromB.stdout.includes("LANTERN") && fromB.status === 0);

  console.log("\n=== a task that needs a yes, with no terminal to answer ===");
  const write = run([], a, "Create a file named made.txt containing the word hi. Then tell me whether you did it.");
  console.log(write.stdout.trim(), `  (exit ${write.status})`);
  check("without a terminal, the write is refused and no file appears", !existsSync(join(a, "made.txt")));

  console.log(failed ? `\n${failed} FAILED` : "\nall runs behaved as expected");
  process.exit(failed ? 1 : 0);
}
