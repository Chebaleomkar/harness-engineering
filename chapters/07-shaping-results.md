# 7. Shaping results

**Commit:** `5b658b3` (lesson 7). **Files:** `shape.ts`, `tools.ts`, `lesson7.ts`

## The idea

The model never sees the real output of a tool. It sees whatever string the harness returns. So shaping results is a design decision: what goes into that string.

Chapter 6 cut long output from the start. That keeps the beginning and drops the end. It's usually the wrong end.

A test run prints thousands of passing lines, then the one failure, then the summary, at the bottom. Cutting the start deletes exactly what the model needs.

Three shaping rules:

- **Keep both ends.** The head gives context. The tail usually holds the result. Say how many lines were dropped in the middle.
- **Strip noise.** Color codes like `\x1b[31m` cost tokens and mean nothing to a model.
- **Say what was removed.** "3,257 lines omitted" tells the model there is more, and that it can narrow the search with grep.

## What the code does

`shape()` in `shape.ts` does all three.

1. It removes ANSI color codes.
2. If the text is longer than 8,000 characters, it keeps the first 30% and the last 70%, cut on line boundaries.
3. It inserts a marker in the middle that says how many lines were omitted.

`bash` in `tools.ts` passes its output through `shape()`. Nothing else needs to change. That's the payoff of putting the logic in one function.

## Try it

```
git checkout 5b658b3
node lesson7.ts
```

The task runs `seq 1 5000`, then prints a `FAIL` line to stderr and exits with code 1. Expect the model to find `test_login` as the failing test. Under chapter 6's old head-only cut, that line would have been lost.

Look at the tool result in the log. You'll see the start, then an omission marker, then the end with the `FAIL` line.

## Notice

- The marker is a message to the model. It is not decoration.
- The percentages are a judgment call. Failures sit near the end, so the tail gets more room.
- Color codes are noise to a model, but they are signal to a human reading a log. Strip them for the model, and keep the raw output in your own logs (chapter 19 does this).

## Exercise

Change `HEAD_SHARE` to 0.9 and run the lesson again. Does the model still find the failure? What does that tell you about where to put the cap?

## Next

Chapter 8 is the system prompt: the text the model reads before anything else, on every call.
