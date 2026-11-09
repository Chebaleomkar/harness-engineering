# 2. The agent loop

**Commit:** `51194ce` (shared by lessons 1 to 6). **Files:** `lesson2.ts`

## The idea

One request and one answer isn't enough. The model asks for a tool, the harness runs it, and the model needs to see the result before it can answer. So the harness runs a loop:

```
messages = [your question]
     |
     v
+--> ask model ----> answer?  ---> done
|        |
|        v  tool request
|    run the tool
|        |
+--- add the result to messages
```

Each time around, the harness sends the whole conversation again. The model keeps no memory between calls. The conversation lives in the harness, in an array. That's why the array grows, and why lesson 11 has to manage it.

Two rules keep the loop safe:

- **Ask for one JSON object, every time.** The harness can read JSON reliably. Free text is harder.
- **Set a turn limit.** A confused model can loop forever. The limit is the first safety rail.

## What the code does

`lesson2.ts` has its own small loop and one tool, `ls`. The system prompt tells the model the exact format:

```
{"tool":"ls","path":"<directory>"}   to use a tool
{"answer":"<your final answer>"}     to finish
```

The loop does three things each turn:

1. Sends the transcript to the model.
2. Parses the reply. If it has an `answer`, it returns it.
3. Otherwise, runs the tool and appends the result to the transcript.

The transcript is a plain array of strings. It is the model's whole memory.

## Try it

```
git checkout 51194ce
node lesson2.ts
```

Expect two turns. First the model asks for `ls`. Then it reads the file names and answers.

Watch the `[turn N]` lines. They show the exact reply each time. Look at the turn 1 reply. The model didn't run `ls`. It only asked for it, in text. Your code ran it.

## Notice

- The model never executes anything. A line of JSON is a request, and the harness chooses whether to honor it.
- The turn limit prevents a runaway. Try setting it to 1 and see what happens.
- Every turn resends everything. Turn 2 is more expensive than turn 1, because it carries turn 1's result.

## Common mistakes

- Parsing the reply with a regex and not with `JSON.parse`. It breaks the first time the model adds a sentence before the JSON.
- Forgetting to add the model's reply to the transcript. Then the model forgets what it asked for.

## Exercise

Change the question to "how many files are here?" Does the answer still match `ls`? Then ask about a folder that doesn't exist. What does the loop do? Chapter 5 is about exactly that.

## Next

Chapter 3 adds `read` and `grep`, so the model can look inside files.
