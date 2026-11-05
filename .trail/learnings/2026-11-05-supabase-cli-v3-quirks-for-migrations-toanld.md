---
title: "Supabase CLI v3 quirks for migrations, types and RLS on this repo"
author: Toanld
date: 2026-11-05
branch: feat/v1
touches:
  - src/app/(tabs)/index.tsx
  - src/lib/database.types.ts
---

## Decided
- v1 RLS lives in two migrations: 20261105122159_v1_rls_and_signup.sql (policies, handle_new_user bootstrap, unique category names) and 20261105125550_v1_rls_fk_ownership.sql (FK ownership checks for budgets, recurring_transactions, categories.parent_id). Both are on the hosted project; never edit them, add a new migration instead.
- A categories policy that queries categories recurses (42P17), so parent_id ownership goes through public.is_own_category(uuid): security definer, search_path '', execute granted to authenticated only.
- pgTAP tests live in supabase/tests/database/ and run with `npx supabase start`, `npx supabase db reset`, `npx supabase test db` (Docker).
## Tried and ruled out
- `supabase gen types typescript --linked`: CLI v3 has no --linked. Use `npx supabase gen types typescript --remote --schema public > src/lib/database.types.ts` (outside the sandbox).
## Watch out
- `npx supabase migration new <name>` waits on stdin; run it with `</dev/null`.
- The first `supabase start` pulls images for several minutes.
- `npx supabase db query --remote --read-only "<sql>"` runs a quick check on the hosted DB. On it, lower('Ăn uống') = 'ăn uống' is true, so the unique name index folds Vietnamese case.
