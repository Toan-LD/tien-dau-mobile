---
title: "Chat entry (phase 2): draft cards, parseAmount rules and running the live eval"
author: Toanld
date: 2026-11-06
branch: feature/chat-entry
cost: { minutes: 31, tokens: 294320 }
touches:
  - CLAUDE.md
  - supabase/functions/chat/eval/questions.test.ts
  - supabase/functions/chat/eval/questions.ts
  - supabase/functions/chat/eval/run.ts
  - src/app/(tabs)/ask.tsx
  - src/components/chat/draft-card.tsx
  - src/components/ui/button.tsx
  - src/lib/__tests__/chat-state.test.ts
  - src/lib/chat-state.ts
  - src/lib/__tests__/use-chat.test.tsx
---

## Decided
- Recording by chat is "server proposes, app saves": `propose_transaction` in chat/tools.ts only pushes a draft into the request's `drafts`; the app's `saveDraft` (src/lib/use-chat.tsx) calls the existing `createTransaction`. The function keeps no write path.
- `parseAmount` (_shared/money.ts): normalize with `normalizeName` (đ→d, diacritics off), strip a trailing d/vnd/dong, then `^(\d+(?:[.,\s]\d+)*)\s*(k|nghin|ngan|n|tr|trieu|cu|m|ty)?\s*(\d{1,3})?$`. With a unit, one `.`/`,` + 1–2 digits is a decimal ("1,5tr"); otherwise every separator group must be 3 digits. Digits after the unit are the next three places ("1tr2" = 1.200.000, "1k5" = 1.500). A bare number under 1.000 or any bare decimal is an error containing "mơ hồ" so the model asks back.
- `resolveEntryDate` (_shared/periods.ts): DD/MM and day:DD are the most recent occurrence not after today (walk back up to 8 years / 12 months so 29/02 and day:31 land on a real date).
- Card summary text is "Chi 30.000 đ · Ăn uống · Thứ Sáu, 06/11/2026 · note" (kind and amount in one segment). The app's `[Thẻ N: … · còn chờ|đã lưu|đã bỏ|đã thay]` history line uses the YYYY-MM-DD date instead of the weekday title.
- `replaces` semantics: card not in `cards` → tool error; `saved` → error telling the user to edit in Danh sách; `dismissed`/`replaced` → new card without `replaces`; `open` → new card with `replaces`. The app marks the old open card `replaced`; if it was already saving/saved the new card gets `previousAlreadySaved: true` and shows a warning instead of hiding anything.
- Handler 200 body is `{ reply, remaining, drafts }`; `drafts` is `[]` when the agent gives up.

## Tried and ruled out
- Mocking `@/lib/transactions` with `jest.requireActual` for `validateDraft` alone: it loads src/lib/supabase → AsyncStorage native module and the suite fails to start. Also mock `@/lib/supabase` with `@/test-utils/supabase-mock`'s `fakeSupabase` (same as chat.test.ts).
- Joining kind and amount with " · " as the plan prose said: the plan's own test expects "Chi 30.000 đ · …".

## Watch out
- Live eval recipe that worked (local Supabase already running in Docker): create `supabase/functions/.env.eval.local` from `.env` with `CHAT_DAILY_LIMIT=1000`; `chcon -R -t container_file_t supabase/functions`; `npx supabase functions serve chat --env-file supabase/functions/.env.eval.local` in the background (needs to run outside the sandbox); export the eval env with `eval "$(npx supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY|PUBLISHABLE_KEY)=')"` and `export SUPABASE_URL="$API_URL"`; then `npm run eval:seed` and `npm run eval:chat -- --runs 2`; finally `restorecon -RF supabase/functions`.
- The LLM provider sometimes 504s a whole batch of consecutive questions (two `LỖI 504` in one run); those are transient, rerun before touching the prompt.
- `biggest-this-week` (a phase 1 numbers question) sometimes fails because the model picks the largest income row when asked "khoản lớn nhất"; it is a prompt/grading question, not a chat-entry bug.
- `trail check` flags prose in CLAUDE.md and the plan markdown for words like "openai npm" and "comment"; those are not code conflicts.
- Deploy `npx supabase functions deploy chat` before testing on the phone: an old function with the new app answers "bấm Lưu" with no card.
