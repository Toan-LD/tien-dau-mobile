---
title: Raised Ghi mới tab button overlaps screen content above the tab bar
author: Toanld
date: 2026-11-06
branch: master
cost: { minutes: 1, tokens: 39345 }
touches:
  - src/app/(tabs)/_layout.tsx
  - src/components/chat/composer.tsx
  - src/constants/theme.ts
  - src/hooks/use-keyboard-visible.ts
---

## Decided
- The Ghi mới tab button (`src/app/(tabs)/_layout.tsx`) rises `NewEntryButton.raise` (24 px) above the tab bar, so it covers the bottom 24 px of whatever screen sits above. Its size/raise now live in `NewEntryButton` in `src/constants/theme.ts` so screens can clear it.
- Chatbot composer (`src/components/chat/composer.tsx`) adds `NewEntryButton.raise` to its bottom padding only while the keyboard is closed (`src/hooks/use-keyboard-visible.ts`). The ask tab has `tabBarHideOnKeyboard`, so with the keyboard open the button is gone and the extra gap would only leave a hole above the keyboard.
- The hook mirrors react-navigation's tab bar events: keyboardWillShow/Hide on iOS, keyboardDidShow/Hide on Android.

## Tried and ruled out
- Constant extra padding on the composer: leaves a 24 px gap above the keyboard while typing.

## Watch out
- Danh sách, Báo cáo and Cài đặt scroll views have no bottom padding for the raised button yet; the middle of the last row can sit under it when scrolled to the end. Owner was asked whether to fix those too.
- Not verified on the phone yet.
