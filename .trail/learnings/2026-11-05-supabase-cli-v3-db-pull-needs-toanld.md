---
title: "Supabase CLI v3 db pull: needs --remote, and the sandbox blocks the DB port"
author: Toanld
date: 2026-11-05
branch: master
cost: { minutes: 27, tokens: 106928 }
touches:
  - docs/superpowers/specs/2026-11-05-expense-app-v1-design.md
  - package-lock.json
  - package.json
  - docs/setup.md
  - supabase/.gitignore
  - supabase/config.toml
  - supabase/migrations/20261105103009_initial_schema.sql
  - CLAUDE.md
  - docs/mockups/01-man-ghi.html
  - docs/mockups/02-trang-hom-nay.html
---

## Decided
- Initial migration pulled with `npx supabase db pull initial_schema --remote --yes` -> supabase/migrations/20261105103009_initial_schema.sql; remote migration history marked applied.
- Supabase CLI is a devDependency (supabase ^3.0.0), run via `npx supabase`. Docker (moby-engine) is installed on the owner's Fedora machine.
- .gitignore now ignores `.env` as well as `.env*.local` (the owner created both, with EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY).
## Tried and ruled out
- `supabase db pull` without `--remote`: CLI v3 targets the LOCAL stack by default and fails with ECONNREFUSED 127.0.0.1:54322.
- Running db pull inside Claude's Bash sandbox: HTTPS works but raw TCP to the pooler (5432/6543) times out. Run CLI commands that talk to the DB with the sandbox disabled (the user approves the prompt).
## Watch out
- The server schema already has RLS enabled on all 6 tables with ZERO policies (deny-all), a handle_new_user() trigger that only inserts profiles, set_updated_at triggers, and an rls_auto_enable event trigger. Extend handle_new_user with CREATE OR REPLACE; don't add a second trigger.
- transaction_type enum = income | expense | transfer. transactions.category_id is already ON DELETE SET NULL. No trigger maintains wallets.balance.
- Hosted changes with CLI v3 need --yes (or SUPABASE_YES exported); .env files don't count.
