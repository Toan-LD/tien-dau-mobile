---
title: "TanStack Query cache, shared ui components and motion for smoother screens"
author: Toanld
date: 2026-11-05
branch: feat/v1
cost: { minutes: 1, tokens: 5779 }
touches:
  - CLAUDE.md
  - package-lock.json
  - package.json
  - src/app/(tabs)/report.tsx
  - src/app/(tabs)/today.tsx
  - src/app/_layout.tsx
  - src/app/categories.tsx
  - src/app/settings.tsx
  - "src/app/transaction/[id].tsx"
  - src/components/categories/sortable-category-list.tsx
---

## Decided
- Data loading goes through TanStack Query (`@tanstack/react-query` 5.x, JS only, Expo Go safe). `src/lib/query-client.ts` holds the single client (staleTime 30 s, retry 1, AppState as focusManager) and bridges `subscribeTransactionsChanged` to `invalidateQueries(["transactions"])`. `src/lib/queries.ts` defines all query options plus `useRefreshOnFocus`.
- Day/month screens use `placeholderData: keepPreviousData`, dim the old data (opacity 0.5) and prefetch the previous day/month. Today deletes optimistically; `deleteWithUndo` now resolves to a boolean so a failed delete restores the row.
- Edit screen key is `["transaction", id]`, outside `["transactions"]`, with `gcTime: 0` and `placeholderData` from cached day/month lists. Outside the group so a delete doesn't refetch it to null and call router.back() twice; gcTime 0 because EntryForm copies `initial` only once, so an old cached copy would show pre-edit values.
- Query cache is cleared in `onAuthStateChange` when the session becomes null.
- Shared ui: Button, IconButton, PeriodNav, StatCard/StatRow, SegmentedControl (+ TypeToggle), SelectableTile. Animations live in `src/constants/motion.ts`. BottomSheet uses Modal `fade` plus a Reanimated SlideInDown sheet.
- `nextCategorySortOrder` (max + 1, empty list gives 1) replaced two copies that disagreed (-1 vs 0 seed).
## Tried and ruled out
- `useCallback(() => setHintId(null), [])` in today.tsx: after the change the React Compiler lint rule `preserve-manual-memoization` failed. Dropped the manual memo; the compiler memoizes it.
- Writing `ref.current = x` during render in useRefreshOnFocus: replaced with an effect, and the focus callback depends only on the client, so a key change doesn't trigger a second (cancelling) refetch.
## Watch out
- Jest hangs (never exits) if a test creates `new QueryClient()` with default gcTime: its 5-minute timer keeps the process alive. Use `gcTime: Infinity` in tests.
- Not verified on a phone yet: Reanimated `entering` inside the RN Modal on Android, `Animated.FlatList itemLayoutAnimation` together with ReanimatedSwipeable rows.
