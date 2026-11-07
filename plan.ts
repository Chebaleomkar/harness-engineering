export type Item = { text: string; status: "pending" | "in_progress" | "done"; note?: string };

const STATUSES = ["pending", "in_progress", "done"];
const SHAPE = `error: items must be a non-empty list of {"text":"<step>","status":"pending|in_progress|done","note":"<optional>"}.`;

// The plan lives here, outside the transcript, so clearing old tool results never touches it.
let plan: Item[] = [];

export function resetPlan(): void {
  plan = [];
}

// A subagent starts with an empty plan. These let its parent get its own plan back afterwards.
export const snapshotPlan = (): Item[] => plan.map((i) => ({ ...i }));
export function restorePlan(saved: Item[]): void {
  plan = saved;
}

// Replaces the whole plan. Returns an error string if the list is malformed.
export function setPlan(items: unknown): string {
  if (!Array.isArray(items) || items.length === 0) return SHAPE;
  for (const it of items) {
    if (typeof it?.text !== "string" || !STATUSES.includes(it?.status)) {
      return `${SHAPE} Bad item: ${JSON.stringify(it)}`;
    }
  }
  if (items.filter((it) => it.status === "in_progress").length > 1) {
    return "error: only one item can be in_progress at a time.";
  }
  plan = items.map((it) => ({ text: it.text, status: it.status, note: it.note }));
  return `plan saved: ${plan.filter((i) => i.status === "done").length}/${plan.length} done`;
}

// What gets appended to the end of every model call.
export function renderPlan(): string {
  const mark = { pending: "[ ]", in_progress: "[>]", done: "[x]" };
  return plan.map((i) => `${mark[i.status]} ${i.text}${i.note ? ` -- ${i.note}` : ""}`).join("\n");
}
