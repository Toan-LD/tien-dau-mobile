---
title: "Chat: skip the second LLM call when a round only proposes drafts"
author: Toanld
date: 2026-11-06
branch: feature/chat-faster-replies
cost: { minutes: 16, tokens: 101051 }
touches:
  - CLAUDE.md
  - supabase/functions/chat/agent.test.ts
  - supabase/functions/chat/agent.ts
  - supabase/functions/chat/handler.test.ts
  - supabase/functions/chat/handler.ts
  - supabase/functions/chat/system-prompt.test.ts
  - supabase/functions/chat/system-prompt.ts
  - supabase/functions/chat/tools.test.ts
  - supabase/functions/chat/tools.ts
---

## Decided
- `runAgent` (chat/agent.ts) takes an optional `replyAfterTools(results)`. The handler passes `replyForDraftsOnly` (chat/tools.ts): when every tool call in a round is propose_transaction and none returned `{error}`, the server returns "Bạn kiểm tra thẻ rồi bấm Lưu nhé." (or "Mình soạn N thẻ, ...") without a second LLM call. Any error or read tool in the round falls back to the model as before.
- The handler now runs `fetchCategories` in parallel with `consumeQuota` (Promise.all). Categories are fetched even on a 429, which costs one cheap query.
- System prompt: a bare list of amounts with no "ghi" counts as a request to record; propose every item in the same round; propose in the first round without first calling read tools; for a mixed record-plus-question message, call propose and the read tool in the same round. Without these rules the real model (gpt-6-luna) sometimes proposed only 1 of 3 items in round 1, which the shortcut would have cut off, and sometimes answered only the record half of a mixed message.

## Tried and ruled out
- Stronger prompt wording to stop the model calling get_summary/get_by_category alongside the drafts of a pure multi-item record: it still happens in about half the runs. It is harmless (falls back to round 2, no shortcut) but the reply then adds unrequested totals. Not fixed.

## Watch out
- Checking the model's first round directly is fast: a scratch Deno script that calls `openAIModel(...).complete` with `buildSystemPrompt` + `TOOL_DEFINITIONS` and prints the tool call names. Run each question 4-6 times, because behaviour varies between runs.
- During a live eval, saving any file under supabase/functions (VS Code format on save) restarts `functions serve`, and every request in flight gets a 502. The local runtime also kills slow workers ("wall clock duration warning ... early termination") when the LLM proxy stalls, giving 502/504 runs. Rerun before blaming code.
- The eval after this change: 30 passed, 7 refusals to review by hand (all fine), and 1 failure, biggest-this-week, which already failed before.
