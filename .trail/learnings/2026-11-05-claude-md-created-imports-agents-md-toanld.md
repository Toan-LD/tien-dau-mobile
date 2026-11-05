---
title: "CLAUDE.md created: imports AGENTS.md, summarizes v1 spec constraints"
author: Toanld
date: 2026-11-05
branch: master
cost: { minutes: 1, tokens: 40742 }
touches:
  - CLAUDE.md
  - docs/mockups/01-man-ghi.html
  - docs/mockups/02-trang-hom-nay.html
  - docs/mockups/03-trang-bao-cao.html
  - docs/mockups/04-tao-muc-moi.html
  - docs/mockups/README.md
  - docs/superpowers/specs/2026-11-05-expense-app-v1-design.md
  - AGENTS.md
  - package-lock.json
  - src/app/_layout.tsx
---

## Decided
- CLAUDE.md pulls in AGENTS.md with `@AGENTS.md` instead of copying it, so the Expo rules live in one place.
- CLAUDE.md lists the v1 spec constraints that affect code: Expo Go only, Android first, light mode only, neutral line-icon style, Vietnamese UI with VND as integers, transaction-creation logic in its own module, Supabase migrations starting from `db pull`.
- The spec (docs/superpowers/specs/2026-11-05-expense-app-v1-design.md) is the source of truth; CLAUDE.md links it rather than restating it.
## Tried and ruled out
- Using `bunx`: the repo has package-lock.json and no bun.lock, so commands use npx.
## Watch out
- No test runner and no ESLint are installed yet; `npx expo lint` sets ESLint up on its first run.
- The template follows the system color scheme in three places (src/app/_layout.tsx, src/hooks/use-color-scheme*.ts, app.json userInterfaceStyle). Locking v1 to light mode means changing all of them.
- CLAUDE.md describes src/ as still the template; update it once real screens land.
