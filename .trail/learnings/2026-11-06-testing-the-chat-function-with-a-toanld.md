---
title: "Testing the chat function with a real LLM key: local serve vs hosted"
author: Toanld
date: 2026-11-06
branch: feat/chatbot-phase1
cost: { minutes: 1, tokens: 34474 }
---

## Decided
- The LLM key goes only in supabase/functions/.env (copied from .env.example, gitignored): LLM_BASE_URL, LLM_API_KEY, LLM_MODEL, CHAT_DAILY_LIMIT=50. Never in the app or .env.local.
- Two ways to test: (A) on the phone, which needs `db push --remote`, `secrets set --env-file supabase/functions/.env` and `functions deploy chat` against the hosted project; (B) on this machine, with `supabase start` + `functions serve --env-file .env.eval.local` + `eval:seed`/`eval:chat`. B first is the recommended order.

## Tried and ruled out
- Serving the function locally and testing from the phone: the app's .env.local points EXPO_PUBLIC_SUPABASE_URL at the hosted project, so the phone never reaches a locally served function.

## Watch out
- `eval "$(npx supabase status -o env)"` exports the API_URL/ANON_KEY/SERVICE_ROLE_KEY names that the eval scripts read.
- On Fedora, run `chcon -R -t container_file_t supabase/functions` before serving and `restorecon -RF supabase/functions` after.
- The error "LLM_BASE_URL, LLM_API_KEY and LLM_MODEL must be set" means the env file was not loaded (missing --env-file, or secrets set was skipped).
