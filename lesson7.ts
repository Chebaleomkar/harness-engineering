import { agent } from "./agent.ts";

console.log(
  "\nFINAL:",
  agent("Run this exact command: seq 1 5000; echo 'FAIL: test_login' >&2; exit 1   Then tell me which test failed."),
);
