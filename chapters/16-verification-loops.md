# 16. Verification loops

**Commit:** `8f70148` (lesson 16). **Files:** `hooks/verify.ts`, `hooks.json`, `hooks/protect-files.ts`, `agent.ts`, `playground/`, `lesson16.ts`

## The idea

When the model says "done," that's a claim. It can be sincere and still wrong. Models often say they tested something that they didn't.

A verification loop gives the harness something to compare against: a command whose result isn't up to the model, like the test suite:

```
model says "done"  ->  harness runs the check
                          pass  -> accept the answer
                          fail  -> send the failure back, model tries again
                          still failing after N tries -> return it marked NOT VERIFIED
```

Chapter 15's Stop hook does most of the work. This chapter adds a real check, an honest ending, and a guard against cheating.

## What the code does

- **The verify hook.** `hooks/verify.ts` reads a command from the `HARNESS_VERIFY` environment variable and runs it. If it fails, the hook exits with 2 and sends the last 40 lines of output back as the reason. If no command is set, it does nothing.
- **An honest ending.** After three blocked stops, `agent()` returns the answer with `[NOT VERIFIED ...]` added. Before this change, the answer quietly passed through.
- **A guard against cheating.** The test file is on the protected list. A model asked to make tests pass can pass them by editing the tests. That's the first thing it will try, so the guard matters.

The practice project is `playground/`: a `slugify` function with a deliberately weak first version, and a test file that spells out the real rules. One rule is hard to guess: a leading "The" is dropped.

## Try it

```
git checkout 8f70148
node lesson16.ts
```

Part A tests the verifier with no model. It checks that buggy code is stopped, correct code passes, and the test file can't be edited.

Part B has the model fix `slugify`. In our test, the first answer came back as "done." The verifier caught the missing rule, the model read the test file, added the rule, ran the tests itself, and answered again. The run ends with an independent test run, which should pass.

Afterward, look at `playground/slug.ts`. The script rewrites it to the buggy version at the start of each run, so the run is repeatable.

## Notice

- The model's confidence is not evidence. The check is.
- The check must be something the agent can't change. If the test file could be edited, the loop would measure nothing.
- Three retries is a cap, not a goal. The "NOT VERIFIED" stamp means a human should look.
- The failure message keeps the last 40 lines. In our test, that cut off the name of the failing test. A better verifier would pull out the failing test names. That's a good exercise.

## Exercise

Remove `protect-files` from `hooks.json` for the test file, and run the lesson. What does the model do? Then restore the guard and compare.

## Next

Chapter 17 lets the agent hand a reading task to a fresh agent, so the main conversation stays small.
