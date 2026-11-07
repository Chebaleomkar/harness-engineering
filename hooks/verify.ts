// Stop hook: runs the verification command from HARNESS_VERIFY before the agent may finish.
// No command set means no verification. Exit 2 sends the failure back to the model.
import { spawnSync } from "node:child_process";

const command = process.env.HARNESS_VERIFY;
if (!command) process.exit(0);

const r = spawnSync("bash", ["-c", command], { encoding: "utf8", timeout: 60_000 });
if (r.status === 0) process.exit(0);

const tail = (r.stdout + r.stderr).trim().split("\n").slice(-40).join("\n");
console.error(`Verification failed (${command}, exit ${r.status}). Fix the code, not the tests. Last output:\n${tail}`);
process.exit(2);
