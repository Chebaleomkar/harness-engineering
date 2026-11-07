import { realpathSync } from "node:fs";
import { homedir } from "node:os";

const quote = (path: string): string => `"${path.replace(/["\\]/g, "\\$&")}"`;

// Wraps a shell command in the macOS sandbox. Later rules win, so each deny is followed by narrower allows.
// The command can write only to the project and temp folders, cannot use the network,
// and cannot read common credential folders.
export function sandboxCommand(command: string): { cmd: string; args: string[] } {
  if (process.platform !== "darwin") {
    // Fail closed: no sandbox means no command, never an unsandboxed run.
    throw new Error("no sandbox available on this platform, so the command was not run");
  }
  const project = realpathSync(process.cwd());
  const home = homedir();
  const profile = [
    "(version 1)",
    "(allow default)",
    "(deny file-write*)",
    `(allow file-write* (subpath ${quote(project)}) (subpath "/private/tmp") (subpath "/private/var/folders") (literal "/dev/null") (literal "/dev/tty"))`,
    "(deny network*)",
    `(deny file-read* (subpath ${quote(home + "/.ssh")}) (subpath ${quote(home + "/.aws")}))`,
  ].join("");
  return { cmd: "sandbox-exec", args: ["-p", profile, "bash", "-c", command] };
}
