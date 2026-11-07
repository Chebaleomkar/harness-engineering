import assert from "node:assert/strict";
import { test } from "node:test";
import { slugify } from "./slug.ts";

test("basic title", () => assert.equal(slugify("Hello World"), "hello-world"));
test("many words", () => assert.equal(slugify("a b c d"), "a-b-c-d"));
test("trims and collapses spaces", () => assert.equal(slugify("  Hello,   World!  "), "hello-world"));
test("drops symbols without doubling hyphens", () => assert.equal(slugify("Rock & Roll"), "rock-roll"));
test("strips accents", () => assert.equal(slugify("Café au lait"), "cafe-au-lait"));
test("underscores become hyphens", () => assert.equal(slugify("snake_case_title"), "snake-case-title"));
test("empty string", () => assert.equal(slugify(""), ""));
test("drops a leading The", () => assert.equal(slugify("The Quick Brown Fox"), "quick-brown-fox"));
