import { readFileSync } from "node:fs";

type Row = Record<string, any>;

const sum = (rows: Row[], key: string): number => rows.reduce((n, r) => n + (Number(r[key]) || 0), 0);
const secs = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;
const usd = (n: number): string => `$${n.toFixed(4)}`;
const num = (n: number): string => n.toLocaleString("en-US");

// Turns one trace file into a short report that answers "where did the time and money go?"
export function summarize(path: string): string {
  const events: Row[] = readFileSync(path, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const start = events.find((e) => e.type === "run_start");
  const end = events.find((e) => e.type === "run_end");
  const calls = events.filter((e) => e.type === "model_call");
  const tools = events.filter((e) => e.type === "tool_call");
  const mainCalls = calls.filter((c) => c.agent === "main");
  const subCalls = calls.filter((c) => c.agent === "sub");

  const out: string[] = [];
  out.push(`Run: ${String(start?.question ?? "?").slice(0, 90)}`);
  out.push(
    `Outcome: ${end?.outcome ?? "did not finish"}   Model calls: ${calls.length} (${mainCalls.length} main, ${subCalls.length} sub)` +
      `   Wall time: ${end ? secs(end.ms) : "?"}`,
  );
  out.push(`Cost: ${usd(sum(calls, "costUsd"))}   Tokens in: ${num(sum(calls, "inputTokens"))}   out: ${num(sum(calls, "outputTokens"))}`);

  out.push("", "Model calls", " #  agent   in tokens   out      cost   time");
  calls.forEach((c, i) => {
    out.push(
      `${String(i + 1).padStart(2)}  ${String(c.agent).padEnd(5)} ${num(c.inputTokens).padStart(10)} ${String(c.outputTokens).padStart(5)}` +
        `  ${usd(c.costUsd).padStart(8)}  ${secs(c.ms).padStart(6)}`,
    );
  });

  // A delegate call contains the subagent's whole run, so leave it out of the tool time to avoid counting that time twice.
  const modelMs = sum(calls, "ms");
  const toolMs = sum(tools.filter((t) => t.tool !== "delegate"), "ms");
  const total = modelMs + toolMs || 1;
  out.push("", `Where the time went: model ${secs(modelMs)} (${Math.round((modelMs / total) * 100)}%), tools ${secs(toolMs)} (${Math.round((toolMs / total) * 100)}%)`);

  const byTool = new Map<string, Row[]>();
  for (const t of tools) byTool.set(t.tool, [...(byTool.get(t.tool) ?? []), t]);
  out.push("", "Tools");
  for (const [name, rows] of byTool) {
    const biggest = Math.max(...rows.map((r) => Number(r.resultChars) || 0));
    const note = name === "delegate" ? "includes the subagent's time" : `${secs(sum(rows, "ms"))} total`;
    out.push(`  ${name.padEnd(9)} x${rows.length}   ${note}, biggest result ${num(biggest)} chars`);
  }

  const bad = tools.filter((t) => t.outcome !== "ok");
  const count = (o: string): number => bad.filter((t) => t.outcome === o).length;
  out.push(
    "",
    `Not ok: ${bad.length} (errors ${count("error")}, denied ${count("denied_by_permissions")}, blocked by hook ${count("blocked_by_hook")}, out of scope ${count("out_of_scope")})`,
  );

  if (mainCalls.length > 1) {
    const first = mainCalls[0].inputTokens;
    const last = mainCalls[mainCalls.length - 1].inputTokens;
    out.push(`Input tokens per main call went ${num(first)} -> ${num(last)}: the transcript is resent on every turn.`);
  }
  return out.join("\n");
}
