import { agent } from "./agent.ts";
import { loadProjectFiles } from "./context.ts";

console.log("project files loaded:", loadProjectFiles().map((f) => f.path));
console.log("\nFINAL:", agent("Add a note to notes.txt: buy eggs"));
