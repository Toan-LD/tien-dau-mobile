---
title: "v1 app patterns: midnight rollover, OAuth deep link, jest time zone"
author: Toanld
date: 2026-11-05
branch: feat/v1
touches:
  - jest.global-setup.js
  - src/lib/delete-with-undo.ts
---

## Decided
- Screens never keep "today" from mount. Entry form, Today and Report store the picked day/month as `null` = "follow today" and resolve it with `todayLocal()` at render and again at save. `src/hooks/use-today.ts` re-renders on focus and on AppState 'active'. A deliberately picked past day/month is kept.
- The Google OAuth redirect `Linking.createURL('auth/callback')` is mapped to `/` in `src/app/+native-intent.tsx` (redirectSystemPath). Without it Expo Router also receives the URL and opens an unmatched route on Android. expo-web-browser still gets the URL for exchangeCodeForSession.
- Jest runs in Asia/Ho_Chi_Minh (`jest.global-setup.js`); a test asserts the offset is -420, so a `toISOString()` date regression fails everywhere, CI included.
- Undo after delete: `src/lib/delete-with-undo.ts` restores once (toast actions can fire twice); `subscribeTransactionsChanged` in transactions.ts lets Today reload when an undo happens from another screen.
## Tried and ruled out
- `Tabs` from 'expo-router': deprecated in SDK 58 typings; use 'expo-router/js-tabs'.
- react-native-gesture-handler touchables inside an RN Modal (BottomSheet): they don't receive touches on Android; sheets use plain RN Pressable/TextInput.
## Watch out
- Not yet verified on a device: toast offset above the tab bar (TAB_BAR_HEIGHT = 64 guess), keyboard inside the sheet, the OAuth round trip, the one-time swipe hint.
- Some files use double quotes (the owner's editor formatter); the rest single. No Prettier config is committed yet.
