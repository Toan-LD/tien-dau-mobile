---
title: "Expense app v1 scope and early decisions (brainstorming, in progress)"
author: Toanld
date: 2026-11-05
branch: master
cost: { minutes: 17, tokens: 59036 }
touches:
  - ".superpowers/brainstorm/.last-port"
  - ".superpowers/brainstorm/.last-token"
  - ".superpowers/brainstorm/72777-1793869860/content/ghi-khoan-chi.html"
  - ".superpowers/brainstorm/72777-1793869860/state/server-info"
  - ".superpowers/brainstorm/72777-1793869860/state/server-instance-id"
  - ".superpowers/brainstorm/72777-1793869860/state/server.log"
  - ".superpowers/brainstorm/72777-1793869860/state/server.pid"
  - package.json
---

## Decided
- App: personal income/expense tracker (Expo SDK 58 + Supabase). Brainstorming still in progress; no design doc approved yet, no code written.
- v1 scope: Google login only (browser-based OAuth via Supabase + expo-web-browser so it runs in Expo Go); enter amount -> pick category (can create new category inline); chi/thu toggle; monthly report with charts for both expense and income.
- One default wallet created automatically and hidden in v1 (transactions.wallet_id is NOT NULL in the existing schema).
- Supabase schema (profiles, wallets, categories, transactions, budgets, recurring_transactions) will live in this repo under supabase/migrations via Supabase CLI. RLS so each user only sees own rows.
- UI: neutral/muted colors, minimal, must not look "AI-generated" (no gradients, no emoji overload). Simplicity of use is top priority.
## Tried and ruled out
- Natural-language/AI entry ("cafe 35k") deferred to later, but keep the design open for it.
- Email/password and anonymous login deferred; native Google Sign-In deferred (needs dev build).
- Local-only storage ruled out: data loss risk, harder AI later.
## Watch out
- The user is new to Supabase and React Native: explain choices plainly and give step-by-step setup guides (Google Cloud OAuth client, Supabase provider, redirect URLs).
- Supabase deps were added to package.json but not committed yet.
