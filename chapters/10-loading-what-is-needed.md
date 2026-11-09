# 10. Loading what is needed

**Commit:** `e309afe` (lesson 10). **Files:** `skills.ts`, `skills/`, `tools.ts`, `prompt.ts`, `lesson10.ts`

## The idea

Chapter 9 put the whole project file in the prompt on every call. That works for a few lines. Now imagine a project with a commit guide, a changelog format, a bug report template, and a release checklist. If all of that goes into every call, the agent pays for it even when you asked about a typo. The context window is finite, and a crowded prompt also makes the model less precise.

The fix is two levels:

- **The index.** A short list in the prompt: a name and when it is useful. Always there.
- **The body.** The full text. Loaded only when the model decides it needs it, through a tool.

This is called progressive disclosure. Claude Code's skills work this way. Your `read` tool from chapter 3 is the same idea on a smaller scale: the model sees a list of files, and opens one only when it needs it.

## What the code does

Each skill is a markdown file in `skills/`. It starts with a short header:

```
---
description: Use when asked to write a git commit message. Gives the required commit format.
---
```

`skills.ts` reads every header and builds the index. The index goes into the prompt. The body stays on disk.

`load_skill` is a tool. When the model calls `load_skill` with a name, the full body comes back as a tool result. The prompt tells the model to load a skill first when a task matches one.

## Try it

```
git checkout e309afe
node lesson10.ts
```

The script first prints two numbers: the size of the index, and the size of all skills pasted together. The index is about 400 characters. Everything together is about 2,200. The gap grows with every skill you add.

Then it asks for a changelog entry. Watch the model call `load_skill` for `changelog` first. Its entry then follows the emoji and attribution format from that skill, which the prompt never mentioned.

**Note:** this run may create a `CHANGELOG.md` in the repo. That's the model's real output, and it's how we found the file that was later removed. Delete it after the run.

## Notice

- The description decides everything. The model never sees a skill's body until it picks the skill. A vague description means the skill never gets used. A misleading one loads it for the wrong tasks.
- Treat descriptions like tool names. Write them for the model to choose between.
- The index costs tokens on every call. Keep each line short.

## Exercise

Add a fifth skill for pull request descriptions. Write only its description first. Ask for a PR description and see whether the model loads it. Then fill in the body and test again.

## Next

Chapter 11 is about the budget itself: how big the context can be, and what happens when the transcript outgrows it.
