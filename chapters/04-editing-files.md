# 4. Editing files

**Commit:** `51194ce` (shared by lessons 1 to 6). **Files:** `tools.ts`, `lesson4.ts`

## The idea

Reading changes nothing. Editing changes your files, so the tool design matters more. Three common ways to let a model edit a file:

- **Rewrite the whole file.** Simple, but expensive on big files. It also silently drops anything the model forgot to copy.
- **Edit by line number.** Line numbers go stale as soon as anything above them changes.
- **Replace exact text.** The model gives the old text and the new text. This is what coding agents use.

We use the third. It has a built-in check: the old text must appear exactly once.

- If it appears zero times, the model's picture of the file is wrong. Refuse, and tell it to read the file again.
- If it appears more than once, the edit is ambiguous. Refuse, and tell it to include more context.

Either way, the file stays untouched.

`write` creates new files only. If the file exists, it refuses and points to `edit`. That stops a full rewrite from happening by accident.

## What the code does

Look at `edit` in `tools.ts`. It counts matches with `split`, and it refuses unless the count is exactly one. Then it replaces that one match.

Look at `write`. One `existsSync` check is all it takes to stop an overwrite.

The usage lines in the registry tell the model these rules before it tries anything.

## Try it

```
git checkout 51194ce
node lesson4.ts
```

The task changes `buy milk` to `buy oat milk` in `notes.txt`. Expect a search, a read, an `edit`, and an answer.

Check the file afterward with `cat notes.txt`. Then reset it:

```
git checkout -- notes.txt
```

## Try the refusals

Make a file with the same word twice, and ask the agent to change that word. You should see the "appears 2 times" message, and the file should be unchanged. Then ask it to edit text that isn't there. You should see the "not found" message.

## Notice

- The refusal is the feature. A tool that silently edits the wrong place is worse than one that says no.
- The model learns from the error. The message tells it what to do next, so it usually recovers without help.
- A rule like "read a file before you edit it" is only in the prompt. The code can't check that yet. Chapter 16 adds real checks.

## Common mistakes

- Making `edit` replace every match by default. It's tempting, and it hides mistakes.
- Forgetting to reset `notes.txt` before running the lesson again. The second run will fail with "not found," which is correct.

## Next

Chapter 5 is about errors. Each refusal above was an error the model read and acted on. Chapter 5 makes that reliable.
