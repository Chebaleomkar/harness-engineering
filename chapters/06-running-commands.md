# 6. Running commands

**Commit:** `51194ce` (shared by lessons 1 to 6). **Files:** `tools.ts`, `agent.ts`, `lesson6.ts`

> **Warning.** This tool runs any shell command you give it, with your permissions. Nothing stops `rm -rf` yet. Run this chapter in a throwaway folder. Chapters 13 and 14 add the guards.

## The idea

So far the model can read and edit files. It can't run the tests, check the git status, or call a compiler. A `bash` tool gives it all of that. Most of what makes a coding agent useful lives here.

Running a command is simple: start a process, wait for it, and capture three things.

- **What it printed.**
- **What it reported as errors.**
- **The exit code.** `0` means success. Anything else means failure.

The exit code matters most. The model can tell whether the tests passed without parsing text.

The harness has to protect itself from two problems:

- **Hangs.** A command like `sleep 1000` blocks the loop forever. So the harness sets the timeout, and the model can't change it.
- **Huge output.** `cat` on a big file would flood the transcript. Chapter 7 handles that.

## What the code does

`bash` in `tools.ts` runs `bash -c` with a 10-second timeout. It returns `exit code: N` followed by the output.

When the timeout fires, it returns a message that tells the model not to run commands that wait or never exit.

`agent.ts` also records the model's reply in the transcript as the JSON the harness acted on, not the raw text. That's the rule from chapter 5 doing its job here. In this commit's test, the model invented a result for `node --version` in its reply. The harness threw that text away and used the real output.

## Try it

```
git checkout 51194ce
node lesson6.ts
```

The task asks for the Node version and the line count of `notes.txt`. Expect one `bash` call, then an answer that matches what your machine says. Check it yourself:

```
node --version
wc -l notes.txt
```

## Notice

- The exit code is part of the result, so the model can branch on it.
- A timeout is a normal result, not a crash. The model sees it and can change its approach.
- If the model's reply quotes output before it has run anything, that quote is fiction. The harness only trusts the result it produced.

## Common mistakes

- Using `exec` instead of `spawnSync`. You lose the exit code and the timeout.
- Trusting `stdout` alone. A command can print a success message and still exit with an error.

## Exercise

Ask the agent to run `sleep 60`. What does the timeout message look like? Then ask it to run `ls /nope`. Read the exit code it reports.

## Next

Chapter 7 deals with the problem this chapter ran into: output that is far too long.
