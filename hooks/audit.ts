// PostToolUse hook: appends one line per tool call to an audit log.
import { appendFileSync, readFileSync } from "node:fs";

const event = JSON.parse(readFileSync(0, "utf8"));
const input = JSON.stringify(event.input).slice(0, 120);
appendFileSync(".harness-audit.log", `${new Date().toISOString()} ${event.tool} ${input}\n`);
