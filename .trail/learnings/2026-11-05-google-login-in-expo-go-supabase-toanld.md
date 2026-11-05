---
title: "Google login in Expo Go: Supabase rejects IP redirect URLs"
author: Toanld
date: 2026-11-05
branch: feat/v1
cost: { minutes: 24, tokens: 152593 }
touches:
  - CLAUDE.md
  - app.json
  - docs/setup.md
  - package.json
  - src/app/(tabs)/report.tsx
  - src/lib/auth.tsx
  - src/app/+native-intent.tsx
---

## Decided
- Run the dev server for the phone with `npm run start:phone` (sets REACT_NATIVE_PACKAGER_HOSTNAME=<LAN IP>.sslip.io). Supabase Auth's IsRedirectURLValid returns false for any non-loopback IP host BEFORE checking the Redirect URLs allow list, so `exp://192.168.x.x:8081/--/auth/callback` is rejected even with `exp://**` allowed, and the browser lands on the Site URL (localhost:3000).
- src/lib/auth.tsx `authRedirectUrl()` builds `exp://<hostUri>/--/auth/callback` itself when `isRunningInExpoGo()`: on the owner's phone `Linking.createURL` did not detect Expo Go and returned `tiendaumobile://auth/callback`, which no installed app opens, so the Custom Tab spun forever on accounts.google.com. If hostUri is an IP it throws a Vietnamese message pointing to `npm run start:phone`.
- Fallback when the router blocks sslip.io (DNS rebind protection): `npx expo start --tunnel`. Documented in docs/setup.md Phần 6.

## Tried and ruled out
- `createTask: false` on openAuthSessionAsync: a wrong guess (two Expo Go windows in recents is just the default proxy-activity browser task), reverted.
- Supabase dashboard config: Google provider, client ID and Redirect URLs (`tiendaumobile://**`, `exp://**`) were all correct (`npx supabase config diff`). The user row existed, so Google -> Supabase worked; only the hop back to the app failed.

## Watch out
- Debug the redirect with logs of `redirectTo` first; it showed the wrong scheme immediately. The "WebCrypto API is not supported" warning (PKCE falls back to plain) is unrelated.
- Supabase's newer auth server uses an opaque state UUID, so you can't decode which redirect it accepted from the authorize response.
- The catch in signInWithGoogle now shows the real error under "Chi tiết:".
