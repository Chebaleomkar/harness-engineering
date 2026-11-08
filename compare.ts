export type Result = { task: string; trial: number; passed: boolean; reason: string | null; turns: number; costUsd: number; ms: number };
export type Run = { label: string; features: string; results: Result[] };

const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);
const stats = (xs: number[]) => ({ mean: sum(xs) / xs.length, min: Math.min(...xs), max: Math.max(...xs) });
const usd = (n: number): string => `$${n.toFixed(3)}`;
const pct = (from: number, to: number): string => `${to >= from ? "+" : "-"}${Math.abs(((to - from) / from) * 100).toFixed(0)}%`;

function byTask(run: Run): Map<string, Result[]> {
  const m = new Map<string, Result[]>();
  for (const r of run.results) m.set(r.task, [...(m.get(r.task) ?? []), r]);
  return m;
}

// Compares two runs task by task. Strict on purpose:
// a drop in passes is a regression, and a change in call count only counts if the two ranges do not overlap.
// This is a small-sample check, not a significance test.
export function compare(a: Run, b: Run, noise?: Run): string {
  const A = byTask(a);
  const B = byTask(b);
  const out: string[] = [];
  out.push(`A = ${a.label} [${a.features || "baseline"}]   B = ${b.label} [${b.features || "baseline"}]`);
  out.push("", "task                  pass A  pass B   calls A (range)    calls B (range)    cost A   cost B   verdict");

  for (const [task, ra] of A) {
    const rb = B.get(task);
    if (!rb) continue;
    const passA = ra.filter((r) => r.passed).length / ra.length;
    const passB = rb.filter((r) => r.passed).length / rb.length;
    const ca = stats(ra.map((r) => r.turns));
    const cb = stats(rb.map((r) => r.turns));
    const verdict =
      passB < passA ? "REGRESSION: fewer passes"
      : passB > passA ? "more passes (check the trials)"
      : cb.max < ca.min ? "FEWER CALLS, clear"
      : cb.min > ca.max ? "MORE CALLS, clear"
      : "same, within noise";
    const range = (s: ReturnType<typeof stats>): string => `${s.mean.toFixed(1)} (${s.min}-${s.max})`;
    out.push(
      `${task.padEnd(21)} ${`${ra.filter((r) => r.passed).length}/${ra.length}`.padStart(6)} ${`${rb.filter((r) => r.passed).length}/${rb.length}`.padStart(7)}` +
        `   ${range(ca).padEnd(17)}  ${range(cb).padEnd(17)}  ${usd(stats(ra.map((r) => r.costUsd)).mean).padStart(7)}  ${usd(stats(rb.map((r) => r.costUsd)).mean).padStart(7)}   ${verdict}`,
    );
  }

  const costA = sum(a.results.map((r) => r.costUsd));
  const costB = sum(b.results.map((r) => r.costUsd));
  out.push(
    "",
    `Passes: A ${a.results.filter((r) => r.passed).length}/${a.results.length}, B ${b.results.filter((r) => r.passed).length}/${b.results.length}` +
      `   Total cost: A ${usd(costA)}, B ${usd(costB)} (${pct(costA, costB)})`,
  );

  if (noise) {
    const costN = sum(noise.results.map((r) => r.costUsd));
    out.push(
      `Noise check: ${a.label} vs ${noise.label} are the same harness, and their total cost differed by ${pct(costA, costN)}.` +
        ` A difference of that size or smaller between A and B is not evidence of anything.`,
    );
  } else {
    out.push("No noise run given. Without an A-vs-A run you cannot tell a real change from luck.");
  }
  return out.join("\n");
}
