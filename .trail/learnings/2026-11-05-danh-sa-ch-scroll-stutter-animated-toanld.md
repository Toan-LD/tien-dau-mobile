---
title: "Danh sách scroll stutter: Animated.FlatList itemLayoutAnimation on long lists"
author: Toanld
date: 2026-11-05
branch: feat/v1
touches:
  - CLAUDE.md
  - src/app/(tabs)/today.tsx
  - src/components/today/day-header.tsx
  - src/components/today/transaction-row.tsx
  - src/constants/motion.ts
  - src/lib/use-transaction.ts
  - node_modules/react-native-reanimated/src/component/FlatList.tsx
---

## Decided
- Owner reported the Danh sách list stuttering while scrolling long week/month lists (sample data, ~100+ rows a month). Cause: `Animated.FlatList` from Reanimated wraps EVERY cell in an `AnimatedView` with the `itemLayoutAnimation` as `layout` (see node_modules/react-native-reanimated/src/component/FlatList.tsx createCellRendererComponent), on top of each row's ReanimatedSwipeable.
- Fix: plain RN `FlatList` with smaller batches (initialNumToRender 12, maxToRenderPerBatch 8, windowSize 7); `TransactionRow` and `DayHeader` are `memo`, row handlers take the transaction so the screen passes one function to all rows; DayHeader takes primitives (title, expense, income) because day groups are rebuilt each render. Delete glide is now `LayoutAnimation.configureNext` in `useDeleteTransaction` (runs once per delete). `Motion.reflow` removed.
## Watch out
- Not yet measured on the phone. Judge scroll performance with the JS bundle in production mode (`npm run start:phone -- --no-dev --minify`); Expo Go dev mode is much slower.
- If it still stutters, the next suspect is one ReanimatedSwipeable per row (mounting cost while scrolling).
