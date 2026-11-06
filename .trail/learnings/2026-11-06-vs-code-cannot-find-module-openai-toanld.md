---
title: "VS Code 'Cannot find module openai' in supabase/functions"
author: Toanld
date: 2026-11-06
branch: feat/chatbot-phase1
cost: { minutes: 1, tokens: 29567 }
touches:
  - supabase/functions/chat/tools.ts
  - supabase/functions/deno.json
  - ".vscode/settings.json"
  - tsconfig.json
---

## Decided
- The error "Cannot find module 'openai/resources/chat/completions'" in supabase/functions/chat/tools.ts is an editor-only false alarm. VS Code's built-in TS server (Node resolution) checks the file, does not read supabase/functions/deno.json, and finds no `openai` in node_modules. Deno resolves it via the import map (`"openai": "npm:openai@7"`).
- To confirm the functions really type-check, run `npm run check:fn` (deno check). It passed.
- Fix for the editor: the Deno extension (denoland.vscode-deno) with `"deno.enablePaths": ["supabase/functions"]` and `"deno.config": "supabase/functions/deno.json"` in .vscode/settings.json. Proposed to the owner; not applied yet.

## Tried and ruled out
- Installing `openai` with npm in the app to silence it: wrong. The app never imports it, and the functions must keep resolving through the Deno import map.

## Watch out
- tsconfig.json already excludes supabase/functions, so `npx tsc --noEmit` stays clean; only the open editor shows the error.
- `source.organizeImports` on save reorders imports in function files and leaves harmless diffs.
