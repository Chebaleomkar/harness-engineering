# 19. Tracing and cost

**Commit:** `62189e2` (lesson 19). **Files:** `trace.ts`, `report.ts`, `model.ts`, `agent.ts`, `lesson19.ts`

## The idea

So far we've judged the agent by its final answer. That hides the important questions: how many model calls did it take, where did the time go, what did it cost, and which tool calls failed?

A trace answers those. It records every event as the run happens, one line of JSON each. A report turns the trace into a short summary.

Tracing is how you find the expensive part. In chapter 17, the subagent's calls cost most of a run. You can only see that in a trace.

## What the code does

`model.ts` now returns more than text. Every call reports input tokens, output tokens, cost, and wall time. `callModel` still exists for the older lessons.

`trace.ts` writes one JSON object per line to `.harness-traces/`. Each run gets its own file. The events are:

- `run_start` and `run_end`, with the outcome and totals.
- `model_call`, with the agent (`main` or `sub`), turn, tokens, cost, and time.
- `tool_call`, with the tool, time, result size, and outcome (`ok`, `error`, `denied_by_permissions`, `blocked_by_hook`, or `out_of_scope`).
- `stop_block`, when a hook sends the agent back to work.

A subagent writes into its parent's trace, labeled `sub`. So one file shows the whole run.

`report.ts` reads a trace and prints a summary: totals, a table of model calls, where the time went, a count of tool outcomes, and how the input grew over the run.

One detail matters. A `delegate` call contains the subagent's whole run. If the report counted both the delegate's time and the subagent's model time, it would count them twice. So the report leaves delegate time out of the tool total.

## Try it

```
git checkout 62189e2
node lesson19.ts check
```

`check` builds a fake trace with known numbers and checks the report, with no model. Every line should say PASS. Read the check for "delegate time is not counted twice." That's the detail above, tested.

Then a real run:

```
node lesson19.ts run
```

It runs a delegated research task, then prints the report. Read the table of model calls. Look at input tokens across the main calls. They grow, because the whole transcript is sent again each turn.

## Notice

- Input tokens are the cost driver. Output is usually small. A growing transcript is most of the bill.
- The cost is what the CLI reports, which is list price. A subscription doesn't pay that amount, and the CLI's own overhead is included. Use the numbers to compare runs, not as a bill.
- Time is almost all model time. Tools took about 1%. So fewer model calls is the only lever that matters much.
- Traces hold tool results. Don't commit `.harness-traces/`. It's git-ignored here.

## Exercise

Run the same task twice and compare the reports. How different are the call counts? Then change the task to one that needs no reading, and see how the report changes.

## Next

That's the last lesson in the core path. Build something with what you've learned: pick a tool the agent doesn't have, add it with a permission rule, a test, and a trace line, and write it up in the same format as these chapters.
