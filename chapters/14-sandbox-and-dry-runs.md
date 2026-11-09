# 14. Sandbox and dry runs

**Commit:** `a637c73` (lesson 14). **Files:** `sandbox.ts`, `tools.ts`, `lesson14.ts`

> **macOS only.** The sandbox uses `sandbox-exec`, which exists only on macOS. On other systems, `bash` refuses to run. That's deliberate: an unprotected run would be worse than no run.

## The idea

Chapter 13 guesses danger by reading the command. A guess can be wrong. The model can write `find . -delete` or a script that deletes files, and no pattern catches every version.

A sandbox takes a different approach. It limits what the process can do, at the operating system level. Even a harmful command gets stopped by the OS.

A dry run is the other half. It shows what an action would do, without doing it. That's useful for edits: you see the change before you approve it.

## What the code does

`sandbox.ts` wraps each shell command in `sandbox-exec` with a profile:

- Deny all file writes, then allow writes only inside the project folder, temp folders, `/dev/null`, and the terminal.
- Deny all network access.
- Deny reading `~/.ssh` and `~/.aws`.

The order matters. Later rules override earlier ones, so each deny is followed by narrower allows.

`tools.ts` has a dry-run switch. In dry-run mode, `edit`, `write`, and `bash` return a description of what they would do, such as `dry run: would edit notes.txt` with the old and new lines. Nothing changes on disk.

## Try it

```
git checkout a637c73
node lesson14.ts
```

Part A tests the sandbox directly:

- A write inside the project works.
- A write outside it is refused by the OS.
- `find <folder> -delete` is not caught by the permission check, but the sandbox stops it.
- Network access is blocked.
- Reading `~/.ssh` is blocked.

The script creates a throwaway folder in your home directory and removes it at the end. It also writes and removes a test file outside the project. Check afterward that nothing is left behind.

Part B tests dry-run mode, with no model involved. Part C runs the model in dry-run mode. It asks for a file to be created, and reports that nothing was written.

## Notice

- Permissions and the sandbox do different jobs. Permissions decide what should happen, and can ask you. The sandbox limits the damage when a decision is wrong. You want both.
- The sandbox has costs. `npm install` and `git fetch` will fail without network. A real tool allows specific hosts.
- Temp folders are writable. Reading is open except for the credential folders. The lists are yours to extend.

## Exercise

Add `~/.config` to the read-deny list, then run Part A and check which test changes. Then think about what else a coding agent might need to read, and whether denying it breaks normal work.

## Next

Chapter 15 lets you add your own rules without changing the harness: scripts that run at fixed points.
