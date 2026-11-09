# 9. Project files

**Commit:** `290c0c8` (lesson 9). **Files:** `context.ts`, `prompt.ts`, `HARNESS.md`, `lesson9.ts`

## The idea

The prompt in chapter 8 is the same for every project. But every project has its own habits: how to name things, which commands run the tests, what never to touch. Retyping those in each question is slow and easy to forget.

Real tools read those habits from a file in the project. Claude Code reads `CLAUDE.md`. Other tools read `AGENTS.md`. The name is a convention. The harness loads the file and adds it to the system prompt, so the model follows it without being reminded.

There are good reasons to use a file:

- It lives in git, so the whole team shares it.
- The harness loads it, so the model doesn't have to remember to look.
- It can layer. A file in a subfolder adds to the one at the repo root. The closest file is read last, so it wins on conflicts.

We call ours `HARNESS.md`, so it doesn't clash with a real `CLAUDE.md`.

## What the code does

`loadProjectFiles()` in `context.ts` starts at the working folder and walks up toward the root. It stops at the folder that has a `.git` directory. Every `HARNESS.md` it finds is loaded, general first and specific last.

Each file is capped at 4,000 characters. A huge file could otherwise fill the context window (chapter 11). The cap adds a marker when it cuts.

`prompt.ts` puts the loaded text into a section titled "Project instructions," with each file's path above it.

## Try it

```
git checkout 290c0c8
node lesson9.ts
```

The task adds a note to `notes.txt`. With `HARNESS.md` present, the note follows the checklist format in that file: `- [ ] buy eggs`. Without it, the model writes a plain line.

Run the control yourself. Rename `HARNESS.md`, run the lesson, and compare. Put the file back and restore `notes.txt`:

```
git checkout -- notes.txt
```

## Notice

- Trust matters. Anything in `HARNESS.md` goes straight into the prompt. A repository you didn't write can give the model instructions this way. Treat that file as code you are running.
- A rule about a file, like "never change existing lines," is still a request. Chapter 13 can enforce it.
- The path label on each section tells the model which file a rule came from, which helps when two files disagree.

## Exercise

Make a subfolder with its own `HARNESS.md`. Run the lesson from inside that folder. You should see both files, and the subfolder's rules should win on conflicts.

## Next

Chapter 10 solves a different problem: a project with fifty guides. Putting all of them in the prompt wastes tokens on every call.
