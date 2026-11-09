# 5. Tool errors the model can act on

**Commit:** `51194ce` (shared by lessons 1 to 6). **Files:** `agent.ts`, `tools.ts`, `lesson5.ts`

## The idea

Something will always go wrong. A file won't exist. A reply won't be valid JSON. A tool will throw. The question is what happens next.

Two bad outcomes are common:

- **The harness crashes.** The whole run dies for one missing file.
- **The model is kept in the dark.** The error is swallowed, and the model guesses what happened.

The good outcome is that the error becomes text, and the model reads it and changes course. The model is good at that, if we give it a clear message.

So the rule is simple: **nothing a tool or a reply does should crash the loop.** Every failure turns into a string the model can read.

## What the code does

Two places handle failures.

**Tool errors.** `runTool` in `tools.ts` wraps every tool call in a `try`. If a tool throws, the error becomes `error: <message>` and goes back to the model. Before this, a missing file killed the run.

**Bad replies.** `parse()` in `agent.ts` takes the first valid JSON object it finds. If the reply has no valid JSON, the loop doesn't crash. It sends back a message that says what went wrong and asks for one JSON object.

There's one more rule in this commit. The transcript records only the JSON the harness acted on, not the whole reply. If the model writes a fake tool result in its reply, the harness drops it. Chapter 6 shows why this matters.

## Try it

```
git checkout 51194ce
node lesson5.ts
```

The task reads `missing.txt`, which doesn't exist. Expect a read that returns `error: ENOENT`, and an answer that quotes that error exactly. The model should not invent file contents.

## Notice

- Node's error text is accurate, but it isn't always helpful. "Cannot read properties of undefined" tells the model nothing. A good error says what failed and what to try.
- The retry for a bad reply costs a turn. The turn limit still applies, so a model that never gets it right stops.

## Common mistakes

- Catching errors and returning an empty string. The model then thinks the file is empty.
- Writing errors that only a programmer understands, like a stack trace. The model needs a sentence it can act on.

## Exercise

Look at the error messages in `tools.ts` for `edit`. Pick one, and change it to be more useful. Then run chapter 4's refusal test and see whether the model's next move changes.

## Next

Chapter 6 adds the most powerful tool: running shell commands.
