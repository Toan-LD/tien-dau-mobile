---
title: README rewritten for Tiền Đâu (Vietnamese)
author: Toanld
date: 2026-11-06
branch: master
cost: { minutes: 1, tokens: 44802 }
touches:
  - README.md
  - docs/setup.md
  - CLAUDE.md
  - scripts/reset-project.js
---

## Decided
- README.md is in Vietnamese (like docs/setup.md), written for the owner and future developers. It replaces the default create-expo-app text.
- It covers what the app does, the 4 tabs, tech stack, getting started (`npm run start:phone`, not `npx expo start`, because Supabase rejects IP redirect URLs), common commands, folder layout and core conventions.
- Setup details (Supabase, Google OAuth, redirect URLs) live only in docs/setup.md; README links there instead of repeating them. Architecture details stay in CLAUDE.md.

## Tried and ruled out
- Copying the setup steps into README: two copies would drift apart, so it only links.

## Watch out
- When a tab or feature changes (especially the Cài đặt contents), update the "Tính năng" section of README too.
- Leftovers from the template: LICENSE still names Expo (650 Industries), and the `reset-project` script plus scripts/reset-project.js are still there. README doesn't mention either.
