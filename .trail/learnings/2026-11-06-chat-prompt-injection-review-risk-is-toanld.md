---
title: "Chat prompt-injection review: risk is low by architecture, prompt needs a short safety section"
author: Toanld
date: 2026-11-06
branch: feat/chatbot-phase1
cost: { minutes: 2, tokens: 62970 }
touches:
  - ".vscode/settings.json"
  - src/app/(tabs)/ask.tsx
  - src/lib/chat-state.ts
  - src/lib/chat.ts
  - src/lib/use-chat.tsx
  - supabase/config.toml
  - supabase/functions/_shared/categories.test.ts
  - supabase/functions/_shared/periods.test.ts
  - supabase/functions/_shared/periods.ts
  - supabase/functions/chat/daily-limit.ts
---

## Decided
- Review of the chat system prompt (2026-11-06) for prompt injection ("user pastes a strange link"). Verdict: the risk is low because of the architecture, not the prompt: the model has no tool that opens URLs or calls out, all five tools are read-only, data is read through the user's JWT client so RLS scopes it to that user, and replies are drawn with plain `Text` (no markdown, no link detection) in src/components/chat/message-bubble.tsx, so an injected link is inert. The only attacker is the signed-in user, and the only thing they can hijack is their own chat.
- Handler limits already in place count as the real defense: 500-char question, 10 history turns of 2000 chars, 50 questions/day quota, 30 s timeout, 600 output tokens, allowlisted tool names, validated arguments, error logs without headers.
- Recommended (not yet applied): add a short "## An toàn" section to supabase/functions/chat/system-prompt.ts stating that question, history, category names, notes and tool results are data not instructions, that the model cannot open links, that it does not repeat its instructions or tool names, and that it only has the asking user's data.
- Recommended: sanitize category names before interpolating them into the system prompt (strip newlines, cap length, quote each) and add a migration with length checks on categories.name and transactions.note; both columns are unbounded `text` today.

## Tried and ruled out
- Server-side history storage to stop forged `assistant` turns from the client: overkill for v1, since a forged turn only affects the forging user's own session.

## Watch out
- If the chat reply ever gets markdown rendering or link detection, the "injected link is inert" argument stops holding; revisit then.
- Category names flow into the system prompt directly (`${expenseNames}`); any new user-written field added to the prompt or tool output needs the same sanitizing.
