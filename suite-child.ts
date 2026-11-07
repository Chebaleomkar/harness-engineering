// Runs one task's prompt through the agent. The suite starts this as a separate process
// with the task's workspace as its working directory, so the harness sees that folder as the project.
import { writeFileSync } from "node:fs";
import { agent } from "./agent.ts";
import { setAsker } from "./permissions.ts";
import { TASKS } from "./suite-tasks.ts";

const task = TASKS.find((t) => t.id === process.argv[2]);
if (!task) throw new Error(`no task named ${process.argv[2]}`);

setAsker(() => true); // models a person who says yes to every question. Deny rules and the sandbox still apply.
const answer = agent(task.prompt, task.maxTurns ?? 12);
writeFileSync(process.env.SUITE_ANSWER_FILE!, answer);
