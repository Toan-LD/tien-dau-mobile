# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project state

"Tiền Đâu" is a personal income/expense tracker (Expo SDK 58, Expo Router, React 19.3, RN 0.88, TypeScript strict, Supabase backend). v1 is built: login, Ghi (entry), Danh sách, Báo cáo and Cài đặt tabs, transaction detail/edit and category management.

The approved v1 design is in [docs/superpowers/specs/2026-11-05-expense-app-v1-design.md](docs/superpowers/specs/2026-11-05-expense-app-v1-design.md) (in Vietnamese). Approved mockups are in `docs/mockups/`. Where a mockup and the spec disagree, the spec wins; `docs/mockups/README.md` lists the known differences.

## Commands

The package manager is npm (`package-lock.json`), so use `npx`, not `bunx`.

```bash
npm run start:phone       # dev server for Expo Go on the phone (hostname, not IP: Supabase rejects IP redirect URLs)
npx expo start            # plain dev server; Google login fails here because Expo Go gets an IP URL
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

- **Routing:** Expo Router with routes in `src/app/`. Typed routes and React Compiler are on (`app.json` `experiments`). `(tabs)/_layout.tsx` uses `Tabs` from `expo-router/js-tabs`: Ghi (index) · Danh sách (`today.tsx`) · Báo cáo · Cài đặt (`settings.tsx`, draws its own title). `login`, `categories` (add, edit name/icon, delete, drag to reorder), `transaction/[id]` (detail: Sửa / Xoá with a confirm dialog) and `transaction/[id]/edit` sit beside the tabs.
- **Auth:** `src/lib/auth.tsx` provides the session; the root `_layout.tsx` gates routes with `Stack.Protected`. `src/app/+native-intent.tsx` sends the OAuth redirect deep link (`auth/callback`) to `/` so it never hits an unmatched route.
- **Data layer:** all Supabase access lives in `src/lib/` (`supabase.ts`, `transactions.ts`, `categories.ts`, `report.ts`, `delete-with-undo.ts`). Screens and components never call `supabase` directly. Transaction-creation logic (validation, default wallet, category) is in `transactions.ts` so a later AI entry feature can reuse it. After a write, `subscribeTransactionsChanged` notifies listeners.
- **Data cache:** screens read through TanStack Query, not by calling `src/lib/` fetchers in effects. `src/lib/query-client.ts` holds the one `QueryClient` (30 s staleTime, AppState as focus, invalidates `["transactions"]` on every transaction write). `src/lib/queries.ts` defines every query (`dayQuery`, `monthQuery`, `periodQuery`, `transactionQuery`, `categoriesQuery`) and `useRefreshOnFocus`. `periodQuery` (Danh sách tab: day/week/month, see `src/lib/periods.ts`, weeks start Monday) reuses the day and month keys so the cache is shared with Báo cáo. Day/month lists use `placeholderData: keepPreviousData` and dim while the new period loads, and the previous day/month is prefetched. The detail/edit screens share `useTransaction` (`src/lib/use-transaction.ts`); their `["transaction", id]` key is deliberately outside `["transactions"]` and has `gcTime: 0`. The cache is cleared on sign-out (`auth.tsx`). In tests, build a `QueryClient` with `gcTime: Infinity` or Jest hangs on its cleanup timer.
- **Types:** `src/lib/database.types.ts` is generated; regenerate it after schema changes.
- **Path aliases:** `@/*` points to `src/*` and `@/assets/*` points to `assets/*`.
- **Theme:** `src/constants/theme.ts` holds one light palette `Colors` and `Spacing` (`useTheme()` returns the palette). Shared primitives in `src/components/ui/`: `Button` (variants `primary`, `danger-outline`, `dashed`), `IconButton`, `PeriodNav` (‹ title ›), `StatCard`/`StatRow`, `SegmentedControl`, `SelectableTile`, `LoadingSpinner`, `BottomSheet`, `toast`; plus `src/components/type-toggle.tsx` and `src/components/category-icon.tsx`. Use these instead of styling a new `Pressable`; they carry the pressed/disabled feedback. Anything else tappable uses `PressableScale` (`src/components/ui/pressable-scale.tsx`: shrinks under the finger and springs back, with an optional `pressedStyle`; it takes a style array, not a style function). `useDatePicker` (`src/components/ui/date-picker.tsx`) opens `DayPicker`, our own calendar sheet (same on Android and iOS, weeks start Monday, days after today greyed out; tapping a day only marks it, "Xong" applies it). The owner asked for it because the system calendar looked out of place, so `@react-native-community/datetimepicker` was removed: don't bring the native picker back. The grid comes from `monthGrid` in `src/lib/calendar.ts` (always six weeks so the sheet never resizes). Charts: `react-native-svg` (in Expo Go) for the donut (`src/components/report/donut-chart.tsx`); the month columns are plain Views. Chart mark colours are `ChartColors` in `theme.ts` (validated with the dataviz palette validator; marks only, never text); swatch colours come from StyleSheet entries made from it, not inline. `MonthPicker` (`src/components/ui/month-picker.tsx`) is our own month sheet: the native picker has no month-only mode on Android, and month-picker libraries need a development build. Their `style` prop is for outer spacing only. Loading: show `<LoadingSpinner visible={isWaitingForData(query)} />` over the area that loads (`isWaitingForData` in `queries.ts`: first load or a placeholder period, not a quiet refresh); it appears after 150 ms so quick loads never flash. Animations come from `src/constants/motion.ts` (Reanimated `entering`/`exiting`/`layout` builders). Long lists (Danh sách): plain `FlatList`, never `Animated.FlatList`/`itemLayoutAnimation` (it wraps every cell in an animated view and made month lists stutter); rows are `memo` components whose handlers take the item, so one stable function serves every row; row removal glides with `LayoutAnimation` in `useDeleteTransaction`. Row swipes (ReanimatedSwipeable) start only after 24 px sideways and are disabled through a shared value while the list is dragged or gliding (`onScrollBeginDrag`/`onMomentumScrollEnd`), so a diagonal scroll never turns into a swipe. `BottomSheet` does not use RN `Modal` (it opens a new Android window each time and the slide stuttered): it draws through `Portal` (`src/components/ui/portal.tsx`, host in the root layout inside ToastProvider, so toasts stay on top), drives backdrop + slide from one shared value, stays mounted until the close slide ends, and closes on Android back via its own BackHandler. Sheets with charts pass `deferContent` + a fixed-height `bodyStyle`: they slide up with an empty body of the same size and fade the chart in once open, so the sheet never resizes. A chart's `drawKey` must not include the sheet's `visible`, or closing replays the chart animation mid-slide.
- **Supabase:**
  - Sessions are stored in AsyncStorage. The app uses only the publishable key.
  - Schema lives in `supabase/migrations/`. **Never edit an applied migration**; add a new one.
  - New-user setup (profile, hidden default wallet, default categories) happens in the `handle_new_user` trigger, not in the app.
  - Every table has RLS on `user_id = auth.uid()` (`profiles` uses `id`). `transactions`, `budgets` and `recurring_transactions` check in their RLS `with check` (inline `EXISTS`) that the category and wallet belong to the user. `is_own_category` (security definer) guards only `categories.parent_id`, to avoid RLS recursion.
  - `categories.icon` stores an icon key string (see `category-icons.ts`), not an emoji.
  - **Sample data (dev only):** Cài đặt shows "Dữ liệu mẫu" when `__DEV__`. `src/lib/sample-data.ts` generates believable rows from 1 January to now and marks each with `receipt_url = 'sample-data'` (`SAMPLE_MARKER`); "Xoá dữ liệu mẫu" deletes by that marker only. If a receipt feature ever starts using `receipt_url`, move the marker first.

## Working with the owner

The owner is new to React Native and Supabase. Explain choices in plain language. Put any setup steps they must do themselves (Google Cloud OAuth client, Supabase provider, redirect URLs, `supabase login` and `supabase link`) in `docs/setup.md` as step-by-step instructions in Vietnamese.
