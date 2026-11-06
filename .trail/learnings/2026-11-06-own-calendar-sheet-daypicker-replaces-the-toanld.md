---
title: Own calendar sheet (DayPicker) replaces the system date picker
author: Toanld
date: 2026-11-06
branch: master
cost: { minutes: 9, tokens: 63572 }
touches:
  - CLAUDE.md
  - app.json
  - docs/superpowers/specs/2026-11-05-expense-app-v1-design.md
  - package-lock.json
  - package.json
  - src/components/ui/date-picker.tsx
  - src/components/ui/month-picker.tsx
  - src/lib/__tests__/calendar.test.ts
  - src/lib/calendar.ts
  - README.md
---

## Decided
- Owner's request (2026-11-06): the system date picker looked out of place, so every day picker is now our own `DayPicker` in src/components/ui/date-picker.tsx, opened through the unchanged `useDatePicker(date, onChange)` hook (callers: DateField on Ghi/Sửa, ListScreen in today.tsx). Same on Android and iOS.
- Look, picked by the owner from mockups (option A): bottom sheet "Chọn ngày", ‹ Tháng M/YYYY ›, 7 columns T2→CN, selected day is a black filled circle, today is bold with a small dot, days after today are greyed out and can't be tapped, › is disabled in the current month. No days from the neighbouring months.
- Owner's rule: tapping a day only marks it; the "Xong" button applies it. Closing the sheet without Xong changes nothing.
- In Tuần mode on Danh sách only the day is highlighted, not the whole week (Claude's call, the owner didn't ask for more).
- `monthGrid` (src/lib/calendar.ts) always returns 6 weeks of 7 `{ date, inMonth }` cells, so the sheet height never changes between months. Neighbour-month cells carry their real date so they can be the React key (Sonar flags index keys).
- `@react-native-community/datetimepicker` was uninstalled and removed from app.json plugins. `YearMonth` now lives in src/lib/calendar.ts; month-picker.tsx re-exports it.

## Tried and ruled out
- Option B (square tile with a dark ring, like the category tiles) and option C (A plus "Hôm nay"/"Hôm qua" buttons). The owner chose A.
- Select-and-close on tap: the owner wants a confirm step (Xong).

## Watch out
- Don't bring the native date picker back.
- `trail check` flags CLAUDE.md:56 (the long Theme paragraph) for "icon delete" and "gesture handler": those are false positives on existing words in that paragraph.
- Not yet checked on the phone.
