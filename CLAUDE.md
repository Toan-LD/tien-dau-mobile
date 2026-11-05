# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project state

"Tiền Đâu" is a personal income/expense tracker (Expo SDK 58, Expo Router, React 19.3, RN 0.88, TypeScript strict, Supabase backend). The code in `src/` is still the default `create-expo-app` template (Home/Explore demo tabs, themed components). No app screens exist yet.

The approved v1 design is in [docs/superpowers/specs/2026-11-05-expense-app-v1-design.md](docs/superpowers/specs/2026-11-05-expense-app-v1-design.md) (in Vietnamese). Read it before building any feature. Approved mockups are in `docs/mockups/`. Where a mockup and the spec disagree, the spec wins; `docs/mockups/README.md` lists the known differences.

## Commands

The package manager is npm (`package-lock.json`), so use `npx`, not `bunx`.

```bash
npx expo start            # dev server; v1 runs in Expo Go on Android
npx expo lint             # lint (ESLint gets set up on first run; not installed yet)
npx tsc --noEmit          # typecheck
npx expo install <pkg>    # add dependencies
```

There is no test runner yet. The spec names amount-suggestion logic, VND formatting and report aggregation as the parts to unit-test. If you add tests, follow the Expo "Unit Testing with Jest" guide.

## Constraints from the spec that shape the code

- **Expo Go only.** Don't add libraries that need a development build. That rules out native Google Sign-In: login uses Supabase OAuth in the in-app browser (expo-web-browser), with redirects through the `tiendaumobile` scheme and Expo Go's `exp://` URLs.
- **Android first.** The owner tests on an Android phone. Code must still run on iOS: no Android-only APIs. Web is out of scope for v1, even though the template has web files.
- **Light mode only.** The template follows the system color scheme (`useColorScheme` in `src/app/_layout.tsx`, `src/hooks/`, `app.json` `userInterfaceStyle: "automatic"`). v1 must lock to light mode.
- **Visual style:** neutral, muted colors, line icons in one dark gray color. No gradients, no emoji, no glass effects. The spec treats a UI that "looks AI-generated" as a failure.
- **UI language is Vietnamese.** Money is VND stored as positive integers, displayed like `30.000 đ`. The sign comes from the transaction type.
- Put transaction-creation logic (validation, default wallet, category) in a standalone module, not in a screen, so a later AI entry feature can reuse it.

## Architecture

- **Routing:** Expo Router with routes in `src/app/`. Typed routes and React Compiler are on (`app.json` `experiments`). Tabs use `NativeTabs` from `expo-router/native-tabs` (`src/components/app-tabs.tsx`). Planned v1 tabs: Ghi (default) · Hôm nay · Báo cáo, plus a login screen and a settings screen.
- **Platform-specific files:** `.web.tsx` / `.web.ts` siblings (for example `app-tabs.web.tsx`, `use-color-scheme.web.ts`) replace the native file on web. When you change one, check its sibling.
- **Path aliases:** `@/*` points to `src/*` and `@/assets/*` points to `assets/*`.
- **Theme:** `src/constants/theme.ts` holds `Colors`, `Fonts` and `Spacing`. `useTheme()` returns the current palette.
- **Supabase:**
  - The app calls Supabase directly with supabase-js. Sessions are stored in AsyncStorage. Config comes from `EXPO_PUBLIC_*` variables in `.env` (not committed; keep a `.env.example`).
  - Schema lives in `supabase/migrations/` and is managed with the Supabase CLI (directory not created yet). The first migration must come from `supabase db pull`, not be rewritten by hand.
  - New-user setup (profile, hidden default wallet, default categories) happens in a database trigger, not in the app.
  - Every table has RLS on `user_id = auth.uid()` (`profiles` uses `id`).
  - `categories.icon` stores an icon key string, not an emoji.

## Working with the owner

The owner is new to React Native and Supabase. Explain choices in plain language. Put any setup steps they must do themselves (Google Cloud OAuth client, Supabase provider, redirect URLs, `supabase login` and `supabase link`) in `docs/setup.md` as step-by-step instructions in Vietnamese.
