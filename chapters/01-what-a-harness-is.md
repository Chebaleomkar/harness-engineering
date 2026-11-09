# 1. What a harness is

**Commit:** `51194ce` (shared by lessons 1 to 6). **Files:** `model.ts`, `lesson1.ts`

## The idea

A model takes text in and gives text out. That's all it does.

Ask it "what's in my src folder?" and it can only guess. It can't look. It has no hands.

```
you  ->  [ model ]  ->  text
```

A harness gives the model hands. It runs the actions the model asks for and hands the results back:

```
you  ->  [ harness ]  ->  [ model ]
             ^                |
             |                | "I want to run ls src"
             |                v
         tool result  <-  [ tools: read, edit, run ]
```

The model never touches your files. It writes a request as text. The harness decides whether to run it, runs it, and returns the result.

That split is the whole subject of this course. Every later lesson adds to the harness: which tools exist, what the model is shown, what it may do, and how its work gets checked.

## What the code does

`model.ts` calls the model. It runs the Claude Code CLI with `--tools ""`, which turns off the CLI's own tools. We want to see the bare model, not Claude Code.

`lesson1.ts` asks the model a question that only a tool could answer.

Read `callModelDetailed` in `model.ts`. It returns the text and the token counts. Those counts matter in lesson 19.

## Try it

```
git checkout 51194ce
node lesson1.ts
```

You should get an answer that says the model has no way to list files. That's the point. The model is fine at thinking. It can't reach your folder.

Now change the question to one the model can answer from memory, like "what is 17 times 23?" It answers correctly. The model isn't broken. It just has no way to reach the outside world.

## Notice

- The model's answer depends on what the harness gives it, not on what you wish it could do.
- You will see the model say "I can't do that" many times in this course. Each time, the fix is a tool or a rule in the harness, not a better prompt.
- If `node lesson1.ts` prints "claude failed", the Claude CLI isn't installed or logged in. Fix that first.

## Common mistakes

- Expecting the model to remember your folder. It doesn't. It only sees what is in the prompt.
- Running on Node older than 26. The `.ts` files won't start.

## Next

Chapter 2 gives the model a tool and builds the loop that runs it.
