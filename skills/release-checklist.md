---
description: Use when asked to prepare, plan, or run a release. Gives the ordered release steps.
---
# Release checklist

1. Make sure main is green in CI and the working tree is clean.
2. Move `## [Unreleased]` in CHANGELOG.md to the new version heading with today's date.
3. Bump the version in package.json using semver. Breaking change = major, feature = minor, fix = patch.
4. Commit as `chore(release): vX.Y.Z`.
5. Tag `vX.Y.Z` and push the tag.
6. Create the GitHub release from the tag. Paste the changelog section as the notes.
7. Announce in the team channel with the release link.

Never skip a step. Never release from a branch other than main.
