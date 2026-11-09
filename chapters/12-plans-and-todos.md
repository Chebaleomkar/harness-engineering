# 12. Plans and todos

**Commit:** `5d23884` (lesson 12). **Files:** `plan.ts`, `tools.ts`, `agent.ts`, `prompt.ts`, `lesson12.ts`

## The idea

Chapter 11 ended with the model forgetting what it had read. The fix is a place to put what it learned that clearing can't touch.

That place is a plan: a short list of steps, with a status and a note on each one. The model updates it with a `todo` tool. The harness keeps it outside the transcript, and rebuilds it at the end of every call.

This helps in three ways:

- **Drift.** On a long task, the model loses track of what is done. A fresh list at the end of every call is a reminder it can't miss.
- **Memory.** Each item has a `note`. The model writes what it learned there, like "tools.ts has the registry and the 7 tools." Clearing the original result no longer costs anything.
- **Visibility.** You can see what the agent thinks it is doing, as it goes.

## What the code does

`plan.ts` stores the plan in a variable, and checks it. The rules are enforced in code:

- A plan must be a non-empty list.
- Each item must have a text and a valid status: `pending`, `in_progress`, or `done`.
- Only one item may be `in_progress` at a time. If the model breaks this, the call returns an error and the model fixes it.

`renderPlan()` turns the plan into text. `agent.ts` appends it to the end of every model call, where the model reads it most closely.

There's one more piece. When the harness clears old results and the plan is empty, it adds a note to the transcript: "old results were just cleared, and your plan is empty. Save what you learned now." That's the nudge. The prompt asks for a plan too, but the prompt alone didn't work in testing. The code noticed the moment it mattered.

## Try it

```
git checkout 5d23884
node lesson12.ts
```

Part A checks the rules without a model: empty list, bad status, two items in progress, and one valid plan.

Part B runs lesson 11's task again, with the same small budget. This time the model saves a note after each file it reads, and the run finishes. In our test it took about ten turns and answered from its notes alone.

Watch the `[plan]` block that prints before each call. It's exactly what the model saw.

## Notice

- The nudge did the work, not the prompt. Where a behavior must happen, the harness has to check for it.
- The plan is rebuilt from storage on each call. It isn't copied from earlier turns, so clearing can't remove it.
- One run isn't proof. The model varies. The mechanisms are deterministic, but whether the model cooperates isn't.

## Exercise

Remove the nudge block from `agent.ts`, run Part B again, and compare. Does the run still finish? Count the reads of the same file.

## Next

Chapter 13 is the first real control. The model has been free to run anything. Now the harness decides what is allowed.
