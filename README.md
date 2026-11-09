# Harness Engineering: build a coding agent in TypeScript

A model can only read text and write text. It can't open your files, run your tests, or remember yesterday. The code around the model does all of that. That code is the **harness**.

This repository builds a small but real coding agent, one idea at a time. Each step is a commit, and each step has a chapter that explains the idea, shows the code, and gives you something to run.

By the end you will have written, by hand, the parts that make tools like Claude Code work:

- an agent loop that calls tools and reads the results
- tools for reading, searching, editing, and running commands
- error handling the model can act on
- a system prompt built from parts, plus project instructions and skills
- a context budget, and a plan that survives when old results are cleared
- permissions, a sandbox, dry runs, and hooks
- a verification loop that checks the agent's work before it finishes
- subagents, memory, and tracing with cost reports

## What you need

- **Node 26.** It runs `.ts` files directly, so there is no build step. Run files with `node lessonN.ts`.
- **A model.** The default uses the Claude Code CLI (`claude -p`). Install Claude Code and log in. You don't need an API key for that setup.
- **git.** Each lesson is a commit, so you can compare and reset.
- **macOS for lesson 14.** The sandbox uses `sandbox-exec`, which only exists on macOS. On other systems, bash is refused on purpose. Read chapter 14 before you try to work around that.

## Use any model or API key

Every model call goes through one function, `callModelDetailed` in `model.ts`. It takes a prompt and a system prompt, and returns:

```ts
{ text, inputTokens, outputTokens, costUsd, ms }
```

To use another model, replace the body of that function. Keep the return shape. OpenAI, Anthropic's API, Groq, Ollama, or a local model all work the same way: send the prompt, read back the text and the token counts. Nothing else in the repository calls a model directly.

Two things to know:

- Lesson checks that call a model will vary from run to run, because models are random. The chapters say when this happens.
- Cost is reported from what the CLI returns. If your model returns no price, cost shows as 0. Compare runs by tokens instead.

## How to follow the course

1. Clone the repository.
2. Open the chapter for the lesson you want.
3. Check out that chapter's commit (`git checkout <commit>`), read the chapter, and run the commands in it.
4. Make the change yourself before you look at the next commit. Then compare with the commit's diff.
5. When you're done, return with `git checkout main`. Checking out a commit leaves you on a detached HEAD, and your changes there are easy to lose.

**One exception:** lessons 1 to 6 share one commit, `51194ce`. Read those chapters in order and use the file each chapter names. Every later lesson has its own commit.

## Roadmap

| # | Chapter | Commit | You learn |
|---|---|---|---|
| 1 | [What a harness is](chapters/01-what-a-harness-is.md) | `51194ce` | Why the model needs a harness |
| 2 | [The agent loop](chapters/02-the-agent-loop.md) | `51194ce` | Ask, act, feed the result back |
| 3 | [Reading and searching](chapters/03-reading-and-searching.md) | `51194ce` | Tools that look at the project |
| 4 | [Editing files](chapters/04-editing-files.md) | `51194ce` | Edits that can't silently break things |
| 5 | [Tool errors the model can act on](chapters/05-tool-errors.md) | `51194ce` | Errors as instructions, bad replies as retries |
| 6 | [Running commands](chapters/06-running-commands.md) | `51194ce` | Shell access with a timeout and an exit code |
| 7 | [Shaping results](chapters/07-shaping-results.md) | `5b658b3` | Keep the start and the end, cut the middle |
| 8 | [The system prompt](chapters/08-the-system-prompt.md) | `0b79428` | Build the prompt from the tool registry |
| 9 | [Project files](chapters/09-project-files.md) | `290c0c8` | Instructions that live in the repo |
| 10 | [Loading what is needed](chapters/10-loading-what-is-needed.md) | `e309afe` | Skills: a short index, full text on demand |
| 11 | [The context window](chapters/11-the-context-window.md) | `e8ddf04` | Budgets, and what clearing costs |
| 12 | [Plans and todos](chapters/12-plans-and-todos.md) | `5d23884` | A plan that survives clearing |
| 13 | [Permissions](chapters/13-permissions.md) | `47e7bc5` | Allow, ask, deny, before every call |
| 14 | [Sandbox and dry runs](chapters/14-sandbox-and-dry-runs.md) | `a637c73` | The OS limits what a command can do |
| 15 | [Hooks](chapters/15-hooks.md) | `c05fca7` | Your scripts run at fixed points |
| 16 | [Verification loops](chapters/16-verification-loops.md) | `8f70148` | Don't believe "done" without a check |
| 17 | [Subagents](chapters/17-subagents.md) | `af4c5a3` | Hand a reading task to a fresh agent |
| 18 | [Memory](chapters/18-memory.md) | `3f343c0` | Notes that survive the session |
| 19 | [Tracing and cost](chapters/19-tracing-and-cost.md) | `62189e2` | Measure where time and tokens go |

## Repository layout

- `lessonN.ts`: the runner for lesson N. It shows the idea in action.
- `model.ts`: the only place that calls a model.
- `agent.ts`: the loop that asks the model, runs tools, and checks for an answer.
- `tools.ts`: the tool registry (`ls`, `grep`, `read`, `edit`, `write`, `bash`, and later `todo`, `remember`, `delegate`, ...).
- `prompt.ts`: builds the system prompt from parts.
- `permissions.ts`, `sandbox.ts`, `hooks.ts`: what the agent may do, and how it is stopped.
- `plan.ts`, `window.ts`, `memory.ts`, `subagent.ts`, `trace.ts`, `report.ts`: the rest of the machinery.
- `hooks/`, `skills/`, `playground/`: the examples the lessons use.

Some files are demo data that lessons change on purpose (`notes.txt`, `secret.txt`). Restore them with `git checkout -- <file>` before you re-run a lesson.

## Safety

This agent runs commands and edits files. Run it in a throwaway folder or a repository you can reset. The lessons ask for a yes before risky actions, and some runs deliberately try things the rules should refuse. Keep an eye on what it does.
