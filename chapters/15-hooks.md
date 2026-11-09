# 15. Hooks

**Commit:** `c05fca7` (lesson 15). **Files:** `hooks.ts`, `hooks.json`, `hooks/protect-files.ts`, `hooks/audit.ts`, `agent.ts`, `lesson15.ts`

## The idea

The checks in chapters 13 and 14 are built into the harness. Teams have their own rules: never touch the CI config, log every action, run the linter after every edit. You shouldn't have to edit the harness for each one.

A hook is a script you register. The harness runs it at a fixed moment:

- **PreToolUse.** Before a tool runs. The script can block the call.
- **PostToolUse.** After it runs. The script can add feedback for the model.
- **Stop.** When the model tries to finish. The script can say "not yet."

The contract is small. The harness sends a JSON description of the event to the script's stdin. The script's exit code is the answer:

- **Exit 0:** carry on.
- **Exit 2:** block. What the script wrote to stderr becomes the reason, and the model reads it.
- **Any other code:** the hook itself broke. The harness logs a warning and carries on.

## What the code does

`hooks.json` lists the hooks, with an event, an optional matcher, and a command.

Here, a PreToolUse hook runs `hooks/protect-files.ts` for `edit` and `write`. It refuses to change `secret.txt`, `HARNESS.md`, `hooks.json`, and the `hooks/` folder. Those last two matter: without them, the agent could turn off its own guard. Chapter 16 adds a test file to this list.

A PostToolUse hook runs `hooks/audit.ts` for every tool. It appends one line per call to `.harness-audit.log`.

`runHooks()` in `hooks.ts` runs the matching hooks in order, with a 5-second timeout each.

In `agent.ts`, the order is fixed: Pre hooks run first, then permissions, then the tool, then Post hooks.

## Try it

```
git checkout c05fca7
node lesson15.ts
```

Part A tests the hooks directly. It checks the protected-file rule, the audit log, and the exit codes, including a crashing hook that must not block anything.

Part C asks the model to change a word in `secret.txt`. The model reads the file, tries to edit it, and the hook blocks the edit. The model then reports that it couldn't make the change. Check that `secret.txt` is unchanged.

Read `.harness-audit.log` afterward. It has a line for the read, but not for the blocked edit. A Post hook only runs when the tool ran.

## Notice

- Hooks run with your full permissions and outside the sandbox. A `hooks.json` from a repository you didn't write can run commands on your machine. Read it before you run any agent in that repository.
- A broken hook fails open. That keeps a buggy formatter from freezing the agent. A security hook would want the opposite.
- Hooks see tool calls. They don't see what a shell command does inside. An agent could still write `echo x > hooks.json` as a command. Permissions ask first, which is the only barrier here.
- The Stop hook is capped. A hook that always says "not yet" would loop forever. Chapter 16 uses this on purpose.

## Exercise

Write a PostToolUse hook that counts `bash` calls and prints a warning once it passes 20. Register it, run a task that uses bash a lot, and check the warning.

## Next

Chapter 16 uses the Stop hook for a real check: the agent must pass the tests before it can say "done."
