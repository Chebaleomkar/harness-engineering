// The harness command. The project is the folder you run it from.
// One task:      harness "fix the failing test"
// Interactive:   harness            (needs a terminal)
// From a pipe:   echo "task" | harness
// Exit codes: 0 = the agent answered, 1 = it gave up or could not verify, 2 = bad usage.
import { readFileSync, readSync } from "node:fs";
import { agent } from "./agent.ts";
import { setAsker } from "./permissions.ts";
import { buildSystemPrompt } from "./prompt.ts";

const USAGE = `usage: harness [--approval ask|never] [--show-context] [task...]
  harness "task"          run one task and exit
  harness                 interactive session (terminal only, /exit to quit)
  echo "task" | harness   read the task from stdin
  --approval ask|never    ask before risky actions, or refuse them (default: ask in a terminal, never otherwise)
  --show-context          print what the agent would see in this folder, then exit`;

function usage(message: string): never {
  console.error(`harness: ${message}\n${USAGE}`);
  process.exit(2);
}

// Reads one line from stdin without buffering past the newline, so a question
// can be asked in the middle of a run and the next task still reads correctly.
function readLineSync(): string | null {
  const bytes: number[] = [];
  const one = Buffer.alloc(1);
  for (;;) {
    let n: number;
    try {
      n = readSync(0, one, 0, 1, null);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "EAGAIN") continue;
      throw e;
    }
    if (n === 0) return bytes.length ? Buffer.from(bytes).toString("utf8") : null;
    if (one[0] === 10) return Buffer.from(bytes).toString("utf8").replace(/\r$/, "");
    bytes.push(one[0]);
  }
}

const argv = process.argv.slice(2);
let approval: string | undefined;
let showContext = false;
const words: string[] = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--approval") {
    approval = argv[++i];
    if (approval !== "ask" && approval !== "never") usage("--approval must be ask or never");
  } else if (a === "--show-context") showContext = true;
  else if (a === "-h" || a === "--help") {
    console.log(USAGE);
    process.exit(0);
  } else if (a.startsWith("--")) usage(`unknown option ${a}`);
  else words.push(a);
}

if (showContext) {
  console.log(buildSystemPrompt());
  process.exit(0);
}

const isTTY = Boolean(process.stdin.isTTY);
const policy = approval ?? (isTTY ? "ask" : "never");

// The agent logs every turn with console.log. Send that to stderr so stdout carries only the answer.
console.log = console.error;

setAsker(
  policy === "ask"
    ? (question) => {
        process.stderr.write(`\n${question} [y/N] `);
        const line = readLineSync();
        return line !== null && line.trim().toLowerCase().startsWith("y");
      }
    : () => false,
);

function runTask(task: string): number {
  const answer = agent(task);
  process.stdout.write(answer + "\n");
  return answer.startsWith("gave up") || answer.includes("[NOT VERIFIED") ? 1 : 0;
}

if (words.length) {
  process.exitCode = runTask(words.join(" "));
} else if (!isTTY) {
  const task = readFileSync(0, "utf8").trim();
  if (!task) usage("no task. Pass one in quotes, or pipe one in.");
  process.exitCode = runTask(task);
} else {
  console.error(`harness: working in ${process.cwd()}. Type a task, or /exit to quit.`);
  for (;;) {
    process.stderr.write("harness> ");
    const line = readLineSync();
    if (line === null || line.trim() === "/exit") break;
    if (line.trim()) runTask(line.trim());
  }
}
