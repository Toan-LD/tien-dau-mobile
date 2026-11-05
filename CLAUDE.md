# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project state

"Tiền Đâu" is a personal income/expense tracker (Expo SDK 58, Expo Router, React 19.3, RN 0.88, TypeScript strict, Supabase backend). v1 is built: login, Ghi (entry), Hôm nay, Báo cáo, transaction edit and settings screens.

The approved v1 design is in [docs/superpowers/specs/2026-11-05-expense-app-v1-design.md](docs/superpowers/specs/2026-11-05-expense-app-v1-design.md) (in Vietnamese). Approved mockups are in `docs/mockups/`. Where a mockup and the spec disagree, the spec wins; `docs/mockups/README.md` lists the known differences.

## Commands

The package manager is npm (`package-lock.json`), so use `npx`, not `bunx`.

```bash
npx expo start            # dev server; v1 runs in Expo Go on Android
npx expo lint             # lint (eslint-config-expo + Prettier; formatting issues are errors)
npm run format            # format everything with Prettier (format:check to verify)
npx tsc --noEmit          # typecheck
npm test                  # unit tests (jest-expo)
npx expo install <pkg>    # add dependencies
npx supabase start && npx supabase db reset   # local DB (needs Docker)
npx supabase test db      # pgTAP tests in supabase/tests/database
```

Commands that talk to the hosted project use `--remote` (Supabase CLI v3 has no `--linked`), for example `npx supabase gen types typescript --remote --schema public > src/lib/database.types.ts`. Run them outside the sandbox: it blocks ports 5432/6543.

Env: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` (publishable key, never service_role) live in `.env.local` (gitignored). `.env.example` is the template.

## Constraints from the spec that shape the code

- **Expo Go only.** Don't add libraries that need a development build. That rules out native Google Sign-In: login uses Supabase OAuth in the in-app browser (expo-web-browser), with redirects through the `tiendaumobile` scheme and Expo Go's `exp://` URLs.
- **Android first.** The owner tests on an Android phone. Code must still run on iOS: no Android-only APIs. Web is out of scope for v1.
- **Light mode only** (`app.json` `userInterfaceStyle: "light"`).
- **Visual style:** neutral, muted colors, line icons in one dark gray color. No gradients, no emoji, no glass effects. The spec treats a UI that "looks AI-generated" as a failure.
- **UI language is Vietnamese.**

## Code style rules from the owner

- **Formatting is Prettier** (`.prettierrc`): 4-space indent and Prettier defaults otherwise (double quotes, semicolons, trailing commas, 80-column width). `.vscode/settings.json` makes VS Code format `.ts`/`.tsx`/`.js`/`.json` with Prettier on save. Markdown, `docs/` and generated `database.types.ts` are excluded (`.prettierignore`).
- **No inline styles.** No `style={{ ... }}` literals in JSX. Put styles in `StyleSheet.create` at the bottom of the file; only values computed at runtime (a bar width) may sit inline next to a stylesheet entry, as in `style={[styles.bar, { width }]}`.
- **Dates never via `toISOString()`.** Dates are local-time `YYYY-MM-DD` (helpers in `src/lib/dates.ts`); `toISOString()` shifts the day back before 07:00 in UTC+7.
- **Money is a positive integer VND**, displayed like `30.000 đ`. The sign comes from the transaction type and is for display only. Max input is `999_999_999_999`.

## Architecture

- **Routing:** Expo Router with routes in `src/app/`. Typed routes and React Compiler are on (`app.json` `experiments`). `(tabs)/_layout.tsx` uses `Tabs` from `expo-router/js-tabs`: Ghi (index) · Hôm nay · Báo cáo. `login`, `settings` and `transaction/[id]` sit beside the tabs.
- **Auth:** `src/lib/auth.tsx` provides the session; the root `_layout.tsx` gates routes with `Stack.Protected`. `src/app/+native-intent.tsx` sends the OAuth redirect deep link (`auth/callback`) to `/` so it never hits an unmatched route.
- **Data layer:** all Supabase access lives in `src/lib/` (`supabase.ts`, `transactions.ts`, `categories.ts`, `report.ts`, `delete-with-undo.ts`). Screens and components never call `supabase` directly. Transaction-creation logic (validation, default wallet, category) is in `transactions.ts` so a later AI entry feature can reuse it. After a write, `subscribeTransactionsChanged` notifies the screens that need to reload.
- **Types:** `src/lib/database.types.ts` is generated; regenerate it after schema changes.
- **Path aliases:** `@/*` points to `src/*` and `@/assets/*` points to `assets/*`.
- **Theme:** `src/constants/theme.ts` holds one light palette `Colors` and `Spacing` (`useTheme()` returns the palette). Shared primitives: `src/components/ui/toast.tsx`, `src/components/ui/bottom-sheet.tsx`, `src/components/category-icon.tsx`.
- **Supabase:**
  - Sessions are stored in AsyncStorage. The app uses only the publishable key.
  - Schema lives in `supabase/migrations/`. **Never edit an applied migration**; add a new one.
  - New-user setup (profile, hidden default wallet, default categories) happens in the `handle_new_user` trigger, not in the app.
  - Every table has RLS on `user_id = auth.uid()` (`profiles` uses `id`). `transactions`, `budgets` and `recurring_transactions` check in their RLS `with check` (inline `EXISTS`) that the category and wallet belong to the user. `is_own_category` (security definer) guards only `categories.parent_id`, to avoid RLS recursion.
  - `categories.icon` stores an icon key string (see `category-icons.ts`), not an emoji.

## Working with the owner

The owner is new to React Native and Supabase. Explain choices in plain language. Put any setup steps they must do themselves (Google Cloud OAuth client, Supabase provider, redirect URLs, `supabase login` and `supabase link`) in `docs/setup.md` as step-by-step instructions in Vietnamese.
