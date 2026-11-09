# 11. The context window

**Commit:** `e8ddf04` (lesson 11). **Files:** `window.ts`, `agent.ts`, `lesson11.ts`

## The idea

Everything the model reads in one call must fit in a fixed budget, the context window. That includes the system prompt, your question, every earlier reply, and every tool result. Tokens are roughly four characters each.

The costly part is that the model has no memory. Chapter 2 showed the harness resending the whole transcript on every turn. So the transcript doesn't just fill the window. It also makes each call bigger than the one before.

```
call 1 sends  2,000      call 6 sends 12,000
call 2 sends  4,000      ...
call 3 sends  6,000      call 10 sends 20,000
```

Ten turns store 20,000 characters but send 110,000 in total. Long sessions get expensive, and eventually they hit the wall.

Hitting the wall is worse. The call fails, or the oldest content gets cut silently. So the harness manages the budget itself.

The cheapest method is to **clear old tool results**. Old `read` and `bash` output is bulky and usually stale: the model already acted on it. We replace each old result with a short stub, oldest first, until the context fits. The stub tells the model it can run the tool again if it needs the result back.

## What the code does

`window.ts` holds three functions:

- `contextSize()` estimates the size of the system prompt plus the transcript.
- `compact()` replaces the oldest tool results with a stub until the size is under the budget. It always keeps the two newest results.
- `estimateTokens()` converts characters to a rough token count.

`agent.ts` calls `compact()` before every model call. The default budget is 400,000 characters. That's roughly the size of a large window, so normal runs never clear anything.

## Try it

```
git checkout e8ddf04
node lesson11.ts
```

**This run is designed to show a failure.** Part A prints the arithmetic from above. Part B runs a real task with a budget of 9,000 characters, which is far too small. You'll see the harness clear results, the model read the same files again, and the run hit the turn limit and gave up.

That failure is the lesson. The mechanism works: the harness clears old results and never crashes. But clearing is lossy. The model forgets what it read, so it reads it again, and the budget overflows again. Chapter 12 fixes this by giving the model somewhere to save what it learned.

## Notice

- Clearing isn't free. You pay again to read a file you already read.
- The budget must be larger than what one step needs at once. A tiny budget thrashes, as this run shows.
- The harness logs the size on every call. Watch it grow. That's the cost you can't see from the answer alone.

## Exercise

Change the budget to 30,000 characters and run again. Nothing gets cleared, and the run should finish in a few turns. Then find the smallest budget that still finishes. Write down the number.

## Next

Chapter 12 gives the model a place to write down what it has learned, so clearing stops costing it progress.
