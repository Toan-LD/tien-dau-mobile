---
title: "Jest 30 cannot run when the repo path contains '?'"
author: Toanld
date: 2026-11-05
branch: feat/v1
---

## Decided
- The owner renames the parent folder `tien-dau?` to `tien-dau`, so `npm test` (jest-expo preset, Jest 30) works in place.
## Tried and ruled out
- Running jest via a symlinked path without `?`, and passing `--rootDir` with the symlink: Jest resolves the real path, so it fails the same way.
- Root cause: jest-config validates the `resolver` option through jest-resolve, which treats `?` in an absolute path as the start of a query string. The error is "Module .../@react-native/jest-preset/jest/resolver.js in the resolver option was not found".
## Watch out
- Any repo checkout whose path contains `?` (or other characters that look like a URL query) breaks Jest before any test runs. Copying the repo to a `?`-free path is the only workaround without renaming.
