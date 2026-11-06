---
title: "Chat not answering on the hosted project: check the LLM model name first"
author: Toanld
date: 2026-11-06
branch: feat/chatbot-phase1
cost: { minutes: 2, tokens: 9935 }
touches:
  - CLAUDE.md
  - docs/setup.md
  - supabase/config.toml
  - supabase/functions/chat/deno.json
  - supabase/functions/chat/deno.lock
---

## Decided
- To diagnose "chat doesn't work" on the hosted project, run these checks in order: `functions list` (deployed, ACTIVE), `secrets list` (the LLM_* names are present), `migration list --remote` (run outside the sandbox), an unauthenticated POST to /functions/v1/chat (expect 401), then a direct curl to `$LLM_BASE_URL/chat/completions` with one tool, using supabase/functions/.env. The CLI v3 has no `functions logs` command.
- On 2026-11-06 the cause was LLM_MODEL=gpt-6-astra, which zpro rejected (404 model_not_found). `gpt-6` works and returns tool_calls.

## Tried and ruled out
- Trusting zpro's /v1/models list: it shows models this key still cannot use (claude-sonnet-5 returned "Upstream access forbidden"). Test the actual model with a tool call.

## Watch out
- Changing LLM_MODEL needs only `secrets set --env-file supabase/functions/.env`, no redeploy.
