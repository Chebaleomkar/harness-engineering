# 13. Permissions

**Commit:** `47e7bc5` (lesson 13). **Files:** `permissions.ts`, `agent.ts`, `lesson13.ts`

## The idea

Until now, every tool call ran the moment the model asked. That includes `bash`, which can delete files, and `write`, which can create files you never asked for.

A permission layer puts the harness between the request and the action. Every call gets one of three verdicts:

- **Allow.** It runs. Reads, searches, and a few harmless commands.
- **Ask.** The harness stops and asks you yes or no. Edits, writes, and unfamiliar commands.
- **Deny.** It never runs, whatever the model says. Destructive commands, reads of secrets, and anything outside the project.

Three design choices matter:

- **The harness enforces it, not the prompt.** Chapters 8, 11, and 12 each showed the model ignoring a rule in the prompt. A permission check is ordinary code that runs before the tool.
- **A refusal goes back as a tool result.** The model sees `denied: ...` and can choose another approach, the same way it handles errors in chapter 5.
- **Deny wins, and the default is deny.** Unknown tools are refused. A new tool stays blocked until someone decides it's safe.

## What the code does

`decide()` in `permissions.ts` checks in this order:

1. **Paths.** For file tools, a path outside the project is denied. So are `.env` files, and writes into `.git`.
2. **Dangerous bash.** A list of patterns denies recursive or forced `rm`, `sudo`, `git push`, a download piped into a shell, `chmod -R`, `mkfs`, and `dd if=`.
3. **Safe bash.** Commands that only look, like `ls`, `cat`, and `git status`, are allowed. But a safe prefix alone isn't enough. `ls; rm -rf .` starts with `ls`. So any command with `;`, `&`, `|`, `<`, `>`, a backtick, or `$(` needs a yes.
4. **Tool defaults.** Read-only tools are allowed. `edit` and `write` ask. Anything else is denied.

`authorize()` wraps this. It prints the verdict. For `ask`, it calls a question function. Only a `y` answer allows the call.

## Try it

```
git checkout 47e7bc5
node lesson13.ts
```

Part A is a table of 14 cases with expected verdicts. Every line should say PASS. It needs no model, and it's the most useful part to read. Look at the case called "safe command + dangerous tail" and check that you understand why it's denied.

Part B asks the model to delete a folder with `rm -rf`, and to create a file. The first is denied. The second asks, and with no terminal to answer, it's declined. Both runs call the model, so the answers vary, but the verdicts in the log do not.

## Notice

- The safe-command allowlist is easy to get wrong. The first version would have allowed `ls; rm -rf ~`. The chaining rule is there because of a test like that.
- Permissions decide what the harness allows. They don't limit what a running program can do. A script can delete files without a `rm -rf` in the command. Chapter 14 covers that.
- Path checks look at the path text. They don't follow symlinks, so a link inside the project could point outside it.

## Exercise

Add one dangerous pattern, such as `curl`, and rerun Part A. Then find a harmless command that a deny pattern catches by mistake, and decide whether to narrow the pattern.

## Next

Chapter 14 adds the layer that doesn't guess: the operating system itself.
