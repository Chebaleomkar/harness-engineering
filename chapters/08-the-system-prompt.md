# 8. The system prompt

**Commit:** `0b79428` (lesson 8). **Files:** `prompt.ts`, `tools.ts`, `agent.ts`, `lesson8.ts`

## The idea

The system prompt is the text the model reads before anything else, on every call. It says who the model is, what format to reply in, which tools exist, what rules to follow, and what the world looks like right now: the folder, the platform, the date.

Without the environment part, the model guesses paths. In chapter 3, it sometimes used absolute paths it had no reason to know.

The prompt is easy to let drift. Imagine the prompt lists a tool that the code doesn't have, or the code adds a tool the prompt never mentions. The model then calls a tool that fails, or never uses one that works.

So we build the prompt from the code.

## What the code does

Each tool in the registry in `tools.ts` carries its own usage line. `prompt.ts` collects those lines into the prompt. Add a tool to the registry, and the prompt updates itself.

The prompt is built from parts, and each part has one job:

- **Identity:** one line about what the model is.
- **Reply format:** one JSON object, and never write a tool result yourself.
- **Tools:** generated from the registry.
- **Rules:** habits learned the hard way, like "grep before read" and "read before edit."
- **Environment:** the working folder, platform, and date.

Later chapters add project files, skills, and memory as more parts.

## Try it

```
git checkout 0b79428
node lesson8.ts
```

The script prints the full system prompt first. Read it. Then it runs one question twice: once with the default prompt, and once with one extra rule added. The extra rule asks for the answer in French. The second run answers in French.

## Notice

- A prompt rule is a request. Compare the two runs. The model still wrote a fake tool result in the second run. The harness catches that, because it throws away anything that isn't the JSON it acted on.
- A rule that must always hold has to be enforced in code. Permissions (chapter 13) and hooks (chapter 15) do that.
- Adding a tool means one edit, in one place. That's the reason for the registry.

## Exercise

Remove the environment part from `prompt.ts`, and ask "what is today's date?" Then put it back. What does the model say without it?

## Common mistakes

- Pasting tool descriptions into the prompt by hand. They drift out of sync with the code within a week.
- Making the prompt longer to fix a behavior. Longer prompts cost tokens on every call. Prefer enforcement in code, and a short rule.

## Next

Chapter 9 moves the rules out of the code and into the project: a file the repository owns.
