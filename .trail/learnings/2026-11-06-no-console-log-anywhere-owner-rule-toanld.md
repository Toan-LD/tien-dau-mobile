---
title: No console.log anywhere (owner rule)
author: Toanld
date: 2026-11-06
branch: feature/chat-entry
cost: { minutes: 5, tokens: 54505 }
touches:
  - CLAUDE.md
  - eslint.config.js
  - scripts/reset-project.js
  - supabase/functions/chat/eval/run.ts
  - supabase/functions/chat/eval/seed.ts
  - supabase/functions/chat/eval/output.test.ts
  - supabase/functions/chat/eval/output.ts
  - src/app/(tabs)/ask.tsx
  - src/lib/__tests__/use-chat.test.tsx
  - src/lib/use-chat.tsx
---

## Decided
- Owner rule (2026-11-06): "Không dùng console.log xóa hết đi". No `console.log` in any code, scripts included.
- ESLint `no-console` (eslint.config.js) is set to error with `console.error`/`console.warn` allowed. It covers `src/` and `scripts/`. `supabase/functions/**` is ignored by ESLint, so nothing checks the Deno code automatically.
- The eval scripts (`chat/eval/run.ts`, `seed.ts`) exist to print a report, so they print through `printLine` in `chat/eval/output.ts`. It writes to `Deno.stdout.writeSync` and loops until every byte is written. `scripts/reset-project.js` has a local `printLine` built on `process.stdout.write`.
- `console.error` stays for real failures (handler `chat failed:`, eval/seed fatal errors).

## Tried and ruled out
- Deleting the eval scripts' output outright: `npm run eval:chat` would then grade every question and print nothing.

## Watch out
- The owner works through SonarLint warnings in VS Code (`// NOSONAR`, fewer parameters, import order). `console.log` is one of the things Sonar flags.
- In Deno code, use `printLine` for a CLI script's output. Never add `console.log`, even for a quick debug.
