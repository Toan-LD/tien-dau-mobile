---
title: "Deploying the chat function: per-function deno.json and --use-api"
author: Toanld
date: 2026-11-06
branch: feat/chatbot-phase1
cost: { minutes: 2, tokens: 18131 }
touches:
  - CLAUDE.md
  - docs/setup.md
  - supabase/config.toml
  - supabase/functions/chat/deno.json
  - supabase/functions/chat/deno.lock
  - supabase/functions/deno.json
---

## Decided
- Supabase CLI v3 ignores `import_map` in config.toml for deploy ("Specifying import_map through flags is no longer supported. Please use deno.json instead."). The line was removed, and supabase/functions/chat/deno.json (plus chat/deno.lock) now holds the function's imports, as the Supabase docs recommend. This replaces the earlier decision to use one shared deno.json with no per-function file.
- supabase/functions/deno.json stays, because test:fn, check:fn and VS Code (deno.config) use it. It repeats the same imports, so change both files together.
- Deploy with `npx supabase functions deploy chat --use-api` (bundled server-side, no Docker). docs/setup.md 7.5 says this.

## Tried and ruled out
- Plain `functions deploy chat` on Fedora: Docker bundling cannot read supabase/functions (SELinux label user_home_t) and fails with "entrypoint path does not exist .../chat/index.ts", even though the file exists. chcon would also work, but --use-api avoids relabelling.

## Watch out
- The deploy has not been verified against the hosted project yet; the first --use-api deploy is the real test of chat/deno.json.
