---
title: "Branch naming: feature/ prefix"
author: Toanld
date: 2026-11-06
branch: feature/chat-entry
cost: { minutes: 5, tokens: 80496 }
touches:
  - docs/superpowers/plans/2026-11-06-chat-entry.md
  - docs/superpowers/specs/2026-11-06-chat-entry-design.md
---

## Decided
- The owner's branching model names feature branches `feature/<topic>` (e.g. `feature/chat-entry`), not `feat/<topic>` (2026-11-06). Commit messages keep conventional `feat:` / `fix:` types.

## Tried and ruled out
- `feat/chat-entry`: renamed at the owner's request.

## Watch out
- Branch from master with `git checkout -b feature/<topic>`; rename local branches with `git branch -m` before the first push.
