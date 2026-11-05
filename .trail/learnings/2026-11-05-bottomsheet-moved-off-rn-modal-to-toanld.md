---
title: BottomSheet moved off RN Modal to a root Portal; chart sheets use fixed bodies
author: Toanld
date: 2026-11-05
branch: feat/v1
touches:
  - CLAUDE.md
  - docs/superpowers/specs/2026-11-05-expense-app-v1-design.md
  - src/app/(tabs)/today.tsx
  - src/app/_layout.tsx
  - src/components/report/category-history-sheet.tsx
  - src/components/report/period-report-sheet.tsx
  - src/components/ui/bottom-sheet.tsx
  - src/components/ui/loading-spinner.tsx
  - src/hooks/use-back-twice-to-exit.ts
  - src/lib/__tests__/periods.test.ts
---

## Decided
- Supersedes the earlier BottomSheet learning (Modal animationType "none" + shared value). The owner still saw the "từ trước tới nay" sheet stutter when sliding up and when the chart appeared (tested with npm run start:phone, dev mode). RN `Modal` opens a new Android window on every show, which costs the first frames of the slide.
- `BottomSheet` now renders through `Portal` (`src/components/ui/portal.tsx`): `PortalHost` sits in the root layout inside ToastProvider (toasts stay above sheets) and inside GestureHandlerRootView. The sheet handles Android back itself with BackHandler while visible; the handler added last runs first, so it beats use-back-twice-to-exit.
- Chart sheets pass `deferContent` + a fixed-height `bodyStyle` (history 410, period report 470): the empty body and the content are the same size, the content fades in after the slide. No more LayoutAnimation resize.
- Chart `drawKey` must not include the sheet's `visible`: closing used to replay the chart animation mid-slide.
## Watch out
- Not yet confirmed on the phone. Portal content loses any context provided below the root layout (none today).
- The old learning's note that RNGH touchables don't work inside the sheet came from the Modal; with the Portal they should, but sheets still use plain Pressable.
