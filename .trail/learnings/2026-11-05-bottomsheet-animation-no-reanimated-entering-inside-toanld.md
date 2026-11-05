---
title: "BottomSheet animation: no Reanimated entering inside RN Modal; month picker"
author: Toanld
date: 2026-11-05
branch: feat/v1
touches:
  - CLAUDE.md
  - docs/superpowers/specs/2026-11-05-expense-app-v1-design.md
  - package-lock.json
  - package.json
  - src/app/(tabs)/_layout.tsx
  - src/app/(tabs)/index.tsx
  - src/app/(tabs)/report.tsx
  - src/app/(tabs)/today.tsx
  - src/app/_layout.tsx
  - src/app/categories.tsx
---

## Decided
- `src/components/ui/bottom-sheet.tsx` no longer uses Modal `animationType="fade"` + Reanimated `entering={SlideInDown}` (the earlier learning's approach). The owner saw lag when the month sheet opened. Now Modal is `animationType="none"`, one shared value 0..1 drives backdrop opacity and sheet translateY (measured height, window height before the first layout), and a `mounted` state keeps the Modal open until the close timing ends (`scheduleOnRN(setMounted, false)`).
- Báo cáo month jump uses our own `MonthPicker` sheet (`src/components/ui/month-picker.tsx`): `@react-native-community/datetimepicker` has no month-only mode on Android, and month-picker libraries need a dev build.
- Report prefetches both neighbour months (next only when not on the current month).
- Tapping the Danh sách tab again: `useNavigation<BottomTabNavigationProp<...>>()` (type from `expo-router/js-tabs`) + `addListener("tabPress")` with `navigation.isFocused()`.
- Back-twice-to-exit on Ghi: `src/hooks/use-back-twice-to-exit.ts` (BackHandler inside useFocusEffect, 2 s window, return false the second time).
## Watch out
- Not verified on the phone yet: whether the new sheet animation fixes the lag, and the back gesture on newer Android versions.
- `PressableScale` takes a style array plus `pressedStyle`; Reanimated's animated Pressable does not take a style function.
