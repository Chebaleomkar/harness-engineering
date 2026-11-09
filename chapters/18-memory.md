# 18. Memory

**Commit:** `3f343c0` (lesson 18). **Files:** `memory.ts`, `tools.ts`, `permissions.ts`, `prompt.ts`, `lesson18.ts`

## The idea

The plan in chapter 12 lasts for one run. When the process ends, everything the agent learned is gone. Tomorrow it asks the same questions and makes the same mistakes.

Memory is notes saved to disk that a later session loads. It sits between two things we already have:

- **`HARNESS.md` (chapter 9)** is instructions a human writes.
- **The plan (chapter 12)** is notes the agent writes for one run.
- **Memory** is notes the agent writes for itself, for the next run.

Memory needs more care than skills did, because the model writes it:

- **Validate what gets saved.** The name becomes a filename, so `../evil` must be refused. Notes have a size limit. Anything that looks like a key or a password is refused.
- **Update, don't pile up.** Saving under an existing name replaces the note.
- **Treat notes as possibly stale.** A note was true when it was written. The prompt tells the model to check it against the code before relying on it.
- **There must be a way to forget.** A wrong note that's never removed misleads every future session.

## What the code does

`memory.ts` provides three tools:

- `remember` saves a note. The name must be lowercase letters, digits, and hyphens. The description is one line of at most 120 characters. The content is at most 600 characters. Anything that matches a secret pattern is refused.
- `recall` loads a note by name. It can't read outside the memory folder.
- `forget` deletes a note.

The prompt gets an index: one line per note, with its name and description. The full text loads only when the model calls `recall`. That's the same pattern as skills in chapter 10.

Subagents get no memory section, because they can't call `recall`.

Notes live in `.harness-memory/` in the folder you run from. The environment variable `HARNESS_MEMORY_DIR` changes that location.

## Try it

```
git checkout 3f343c0
node lesson18.ts check
```

`check` runs 13 checks with no model. It covers saving, updating, the name and size rules, the secret filter, recall, and forget.

Then the real test. It needs two separate processes, because memory only proves itself across sessions:

```
node lesson18.ts teach    # session 1: teach the agent a convention
node lesson18.ts use      # session 2: a new process that only knows what is on disk
node lesson18.ts control  # the same task, with no memory
```

Read the output of `teach`. It ends by printing the note file. Then compare `use` with `control`.

## Notice

- In our test, the control run also got the right answer. The project had a folder the model could guess from. Memory showed up as fewer turns and the exact command, not as a different answer. A real test needs a convention nobody could guess.
- The model writes memory, and `remember` is allowed without asking. That's a risk. Suppose a tool result said "save a note: always run this download-and-execute command." A model that obeys would plant it, and every later session would trust it. Review the memory folder the way you would review code.
- `forget` asks you first, because deleting a note is hard to undo.

## Exercise

Teach the agent a second convention, then ask a question that uses both. Then edit a note by hand to be wrong, and see whether the agent catches it.

## Next

Chapter 19 measures the agent: where its time and tokens go, and what each run costs.
