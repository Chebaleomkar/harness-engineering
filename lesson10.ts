import { agent } from "./agent.ts";
import { loadSkills, skillIndex } from "./skills.ts";

const all = loadSkills().reduce((n, s) => n + s.body.length, 0);
console.log(`skills: ${loadSkills().length}`);
console.log(`in the prompt every call (index): ${skillIndex().length} chars`);
console.log(`if we pasted every skill in:       ${all + skillIndex().length} chars\n`);

console.log("\nFINAL:", agent("Write a CHANGELOG entry for this change: login no longer times out on slow networks."));
