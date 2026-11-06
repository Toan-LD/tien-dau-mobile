---
title: "Chat entry (phase 2) design: draft cards the user saves"
author: Toanld
date: 2026-11-06
branch: master
cost: { minutes: 5, tokens: 71039 }
touches:
  - docs/superpowers/specs/2026-11-06-chat-entry-design.md
  - src/app/(tabs)/_layout.tsx
  - src/components/chat/composer.tsx
  - src/constants/theme.ts
  - src/hooks/use-keyboard-visible.ts
  - src/lib/transactions.ts
---

## Decided
- Owner approved (2026-11-06): chatbot never writes. A new read-only tool `propose_transaction` returns draft cards in the response (`{ reply, remaining, drafts }`); the app shows each card in the chat with Bỏ / Lưu, and Lưu calls `createTransaction` in src/lib/transactions.ts. The Edge Function stays read-only, and saving does not use up the daily quota.
- The server parses the amount the user typed (`parseAmount` in _shared/money.ts: k/nghìn/tr/củ, "1tr2") and the date (today/yesterday/weekday/DD/MM/day:DD resolve to the most recent date that is not after today). The cheap model never computes numbers or dates.
- The app adds a `[Thẻ: ... · đã lưu/đã bỏ/còn chờ]` line to the history, so the model knows the state of each card.
- Spec: docs/superpowers/specs/2026-11-06-chat-entry-design.md (draft, waiting for owner approval).

## Tried and ruled out
- Model saves directly and the app offers undo: rejected for safety. A cheap model that misreads the user or is injected must not write data.
- Model passes the amount as a number: rejected because cheap models misread "1tr2".

## Watch out
- Open question for the owner when this note was written: what happens to the old card when the user corrects it ("không, 35k"). A: both cards stay saveable. B (recommended): the new card replaces the old one; if the old one is already saved, the bot points to Danh sách. Check the spec for the answer.
- The eval case `redirect-record` must change to check drafts instead of text.
