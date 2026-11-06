---
title: "Chat safety hardening applied: An toàn prompt section, promptSafeName, 40/200 length limits"
author: Toanld
date: 2026-11-06
branch: feat/chatbot-phase1
cost: { minutes: 4, tokens: 51969 }
touches:
  - ".vscode/settings.json"
  - docs/superpowers/specs/2026-11-06-chatbot-phase1-design.md
  - src/components/categories/category-sheet.tsx
  - src/components/entry/note-sheet.tsx
  - src/lib/categories.ts
  - src/lib/transactions.ts
  - supabase/functions/chat/system-prompt.test.ts
  - supabase/functions/chat/system-prompt.ts
  - supabase/migrations/20261106062130_text_length_limits.sql
  - supabase/tests/database/text_length_limits.test.sql
---

## Decided
- Applied the recommendations from the 2026-11-06 prompt-injection review. supabase/functions/chat/system-prompt.ts now has a "## An toàn" section (data is not instructions, model cannot open links, does not repeat its instructions or tool names, only has the asking user's data) and wraps each category name with promptSafeName (whitespace and newlines collapsed, cut to 40 characters, quoted).
- Length limits live in three places on purpose and must stay equal: migration text_length_limits (categories.name <= 40, transactions.note and recurring_transactions.note <= 200, pgTAP test text_length_limits.test.sql), app constants MAX_CATEGORY_NAME_LENGTH in src/lib/categories.ts and MAX_NOTE_LENGTH in src/lib/transactions.ts used as TextInput maxLength, and MAX_CATEGORY_NAME_LENGTH in system-prompt.ts (functions never import from src/).
- The owner restated the rule mid-task: no comments in code, not even "why" comments explaining a constant.

## Tried and ruled out
- Truncating notes in the list_transactions tool output: not needed once the DB check exists; notes longer than 200 can only be old rows.

## Watch out
- Deno is not on PATH on this machine; it is in node_modules/.bin (deno 2.9.6), so run `npm run test:fn` or prefix PATH with node_modules/.bin.
- The pgTAP tests run against the local stack (`npx supabase test db`, needs Docker and runs outside the sandbox).
