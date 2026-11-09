# 3. Reading and searching

**Commit:** `51194ce` (shared by lessons 1 to 6). **Files:** `agent.ts`, `tools.ts`, `lesson3.ts`

## The idea

In chapter 2 the model could see file names but not what was inside them. That's not enough for real work.

We add two tools, and the model uses them in order:

- **grep** finds where something is. It returns `file:line:text` for each match.
- **read** opens one file and returns part of it, with line numbers.

Search narrows the haystack. Read looks at the needle. This order saves the model's context. A project can have thousands of files, and reading them all would fill the window in one go.

The harness decides how much each tool may return. Here, grep stops after 50 matches and read returns at most 200 lines. Both caps are in `tools.ts`. Without them, one large file floods the transcript.

## What the code does

`agent.ts` is the loop from chapter 2, moved into its own file, so every lesson can reuse it. It also parses the reply with `parse()`, which takes the first valid JSON object it finds.

`tools.ts` holds the registry: a map from tool name to a usage line and a function. The usage line goes into the system prompt, so the prompt always matches the code.

- `read` returns lines with numbers. If the file is longer than the cap, it tells the model how many lines there are and how to ask for more with `start`.
- `grep` walks the folder tree, skips `node_modules` and `.git`, and stops at 50 matches.
- `ls` lists a directory.

## Try it

```
git checkout 51194ce
node lesson3.ts
```

The question asks which file has a TODO, and what the code in `secret.txt` is. Expect a `grep`, then a `grep` or `read` on `secret.txt`, then an answer.

Look at the grep results. The model's own question text also contains the word TODO, so it shows up as a match. Notice how the model ignores that match.

## Notice

- Caps are part of the tool, not the prompt. A rule in the prompt is a request. A cap in the code is a guarantee.
- The numbers on each line of `read` let the model point to exact places, and re-read them later.
- The model sometimes uses `grep` on a one-line file instead of `read`. Both work. Chapter 8 shows how to steer that with the prompt.

## Exercise

Create a file with 500 lines and ask about line 300. Does the model use `start` and `limit`? Read the hint the tool gives when the file is long.

## Next

Chapter 4 adds the tools that change files. Changing files is more dangerous, so the design matters more.
