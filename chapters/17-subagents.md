# 17. Subagents

**Commit:** `af4c5a3` (lesson 17). **Files:** `subagent.ts`, `tools.ts`, `plan.ts`, `permissions.ts`, `prompt.ts`, `agent.ts`, `lesson17.ts`

## The idea

Reading a lot of code fills the transcript fast. Chapter 11 showed the cost. Chapter 12 showed the workaround, a plan that survives clearing.

A subagent is a different answer: a fresh agent with its own empty transcript. The parent gives it one task. The subagent reads whatever it needs, then returns a short answer. Everything it read is discarded.

The parent's context stays small. It only sees the summary.

## What the code does

`runSubagent(task)` in `subagent.ts` calls the same `agent()` loop with three changes:

- **A new transcript**, with the task as its only question.
- **A smaller tool list.** It gets `ls`, `grep`, and `read`. No `bash`, no `edit`, no `write`. And no `delegate`, so it can't start more subagents. The restriction is in two places: the subagent's prompt doesn't list the other tools, and the loop refuses any tool outside its list.
- **A capped answer.** The reply is limited to 2,000 characters, and it must be under 150 words by its own rule.

The parent calls the subagent through a `delegate` tool. The tool is in the registry, so the parent's prompt lists it automatically.

Starting a subagent resets the plan, because `agent()` resets it. `runSubagent` saves the parent's plan first and restores it afterward.

## Try it

```
git checkout af4c5a3
node lesson17.ts
```

Part A is six checks, with no model. They confirm the subagent's prompt has no `delegate`, `bash`, or `edit`. They confirm an empty task is refused. And they confirm the plan gets wiped when a subagent starts, which is the bug the save-and-restore guards against.

Part B asks the parent to explain how bash commands are allowed, and to delegate the reading. Watch the `|` lines. They are the subagent's own turns, indented under the parent.

At the end, the log prints the subagent's peak context size and the size of what came back. In our test, the subagent peaked at over 10,000 characters, and the parent received under 1,000.

## Notice

- A subagent only helps if its task is self-contained. It knows nothing about the parent's conversation. The task must say everything it needs.
- The restriction is what makes it safe to run. A read-only helper can't make changes, so it's safe to start without asking you.
- The plan save-and-restore was tested only for the wipe. A run where the parent has a plan and then delegates is worth testing yourself.

## Exercise

Make the subagent's answer limit 200 characters and run Part B. Does the parent still get what it needs? Then try a task that needs more detail than that, and find the limit where the answer gets too thin.

## Next

Chapter 18 is memory: notes the agent saves to disk, so the next session starts knowing things.
