---
title: "Chat edge function auth, import map and local serve"
author: Toanld
date: 2026-11-06
branch: feat/chatbot-phase1
touches:
  - supabase/functions/chat/index.ts
  - supabase/functions/chat/handler.ts
  - supabase/config.toml
---

## Decided
- [functions.chat] keeps verify_jwt = true AND index.ts verifies the user JWT itself with supabase.auth.getClaims(token) on a client built from the publishable key plus the user's Authorization header. getClaims returns claims.sub, which is the user id passed to consume_chat_quota.
- Keys come from SUPABASE_PUBLISHABLE_KEYS / SUPABASE_SECRET_KEYS (JSON {"default": ...}), falling back to SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY. The secret key is used only for the consume_chat_quota RPC.
- Functions share one Deno config, supabase/functions/deno.json; config.toml points serve/deploy at it with import_map = "./functions/deno.json" (no per-function deno.json).
## Tried and ruled out
- Relying on verify_jwt alone: locally a request with only the publishable key on apikey (or as Bearer) passes the platform check and reaches the handler. Without getClaims anyone holding the publishable key would get in.
- Leaving import_map out: local serve still finds supabase/functions/deno.json, but the docs only promise per-function deno.json or config.toml import_map for deploy, so the explicit import_map stays.
## Watch out
- Fedora SELinux (enforcing): the edge runtime container cannot read the bind-mounted supabase/functions (Permission denied, shows as BOOT_ERROR / 'failed to determine entrypoint'). For a local serve check: chcon -R -t container_file_t supabase/functions, then undo with restorecon -RF supabase/functions.
- pkill -f 'functions serve' kills the calling shell too (its command line matches); kill by pid instead.
- Local auth signs user JWTs with ES256, so getClaims verifies them against SUPABASE_JWKS.
