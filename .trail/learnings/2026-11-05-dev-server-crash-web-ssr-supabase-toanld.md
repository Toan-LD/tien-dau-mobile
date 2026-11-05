---
title: "Dev server crash: web SSR + Supabase AsyncStorage (window is not defined)"
author: Toanld
date: 2026-11-05
branch: feat/v1
cost: { minutes: 4, tokens: 38426 }
touches:
  - app.json
  - src/app/(tabs)/report.tsx
  - src/lib/supabase.ts
---

## Decided
- app.json `web.output` changed from "server" to "single". With "server", any web request (pressing `w`, or a stale browser tab on localhost:8081 reloading) makes Expo render routes in Node; the Supabase client in src/lib/supabase.ts initializes, AsyncStorage's web implementation touches `window`, and the whole dev server crashes — taking the Expo Go session on the phone down with it.
- "single" is safe: the project has no `+api`, `+html` or `+middleware` routes, so server output was unused. Verified: web page and bundle return 200 and the packager stays running.

## Tried and ruled out
- Making supabase.ts SSR-aware (no-op storage when `typeof window === "undefined"`): not needed while web is out of scope for v1; revisit only if server output or API routes are added.

## Watch out
- "No Android connected device found" after pressing `a` is not a bug: the owner runs the app by scanning the QR code in Expo Go, not via adb/emulator.
- If `web.output` ever goes back to "server"/"static", the Supabase storage must be guarded for Node first or the dev server will crash again.
