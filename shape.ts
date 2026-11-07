const MAX_CHARS = 8_000;
const HEAD_SHARE = 0.3;

const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;

// Cleans tool output for the model: drops color codes, and if it is too long
// keeps the start and the end (where results and errors usually are).
export function shape(text: string, maxChars = MAX_CHARS): string {
  const clean = text.replace(ANSI, "");
  if (clean.length <= maxChars) return clean;

  const lines = clean.split("\n");
  const head: string[] = [];
  const tail: string[] = [];
  let used = 0;

  while (head.length < lines.length && used + lines[head.length].length < maxChars * HEAD_SHARE) {
    used += lines[head.length].length + 1;
    head.push(lines[head.length]);
  }
  used = 0;
  while (
    tail.length < lines.length - head.length &&
    used + lines[lines.length - 1 - tail.length].length < maxChars * (1 - HEAD_SHARE)
  ) {
    used += lines[lines.length - 1 - tail.length].length + 1;
    tail.unshift(lines[lines.length - 1 - tail.length]);
  }

  const omitted = lines.length - head.length - tail.length;
  return [...head, `[... ${omitted} lines omitted. Narrow with grep or a more specific command ...]`, ...tail].join("\n");
}
