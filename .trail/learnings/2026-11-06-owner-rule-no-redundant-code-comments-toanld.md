---
title: "Owner rule: no redundant code comments"
author: Toanld
date: 2026-11-06
branch: master
cost: { minutes: 23, tokens: 110876 }
touches:
  - src/app/(tabs)/today.tsx
  - src/components/entry/date-field.tsx
  - src/components/entry/entry-form.tsx
  - src/components/ui/date-picker.tsx
  - src/hooks/use-back-twice-to-exit.ts
  - src/lib/__tests__/money.test.ts
  - src/lib/auth.tsx
  - src/lib/calendar.ts
  - src/lib/categories.ts
  - src/lib/database.types.ts
---

## Decided
The owner (2026-11-06) asked not to write redundant comments in code. They deleted comments added during a lint-fix session (e.g. "deleteWithUndo never rejects…", "Refresh in the background; the toast doesn't wait for it.", "1234567 -> 1.234.567") and stripped many existing comments across src/ too. Default: write no comments in new code or refactors; explain the reasoning in the chat reply instead.

## Tried and ruled out
Short "why" comments next to `void` promises, helper functions and loop rewrites: the owner removed them all, so even "why" comments count as redundant here.

## Watch out
Don't re-add comments the owner removed. If a workaround is truly surprising and would get "fixed" wrongly without a note, one short line at most.
