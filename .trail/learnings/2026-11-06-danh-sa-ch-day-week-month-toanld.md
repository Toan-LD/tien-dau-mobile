---
title: "Danh sách day/week/month switch jank: Reanimated commit pausing + remounting rows"
author: Toanld
date: 2026-11-06
branch: feature/smooth-period-switch
cost: { minutes: 6, tokens: 78923 }
touches:
  - CLAUDE.md
  - package-lock.json
  - package.json
  - src/app/(tabs)/today.tsx
  - src/components/today/transaction-row.tsx
  - src/components/ui/segmented-control.tsx
---

## Decided
- Owner (2026-11-06): switching Ngày/Tuần/Tháng in Danh sách still stuttered after the FlatList fix; wants no jank at all.
- Cause 1: the SegmentedControl thumb ran on Reanimated. In Reanimated 4.7 on Android, ANDROID_SYNCHRONOUSLY_UPDATE_UI_PROPS is false, so every animated frame is a ShadowTree commit, and ReanimatedCommitHook pauses Reanimated commits from a React commit until its mount (UpdatesRegistryManager::pauseReanimatedCommits / shouldReanimatedSkipCommit). The list switch made React commit in batches (FlatList, 40 ms batches), so the thumb froze repeatedly. The thumb also animated width/elevation/shadow each frame.
- Cause 2: a mode switch unmounted/mounted many TransactionRows, each a ReanimatedSwipeable (2 gesture detectors, ~10 shared values, 3 animated styles, actions always rendered).
- Fix: SegmentedControl on RN Animated with useNativeDriver (transform + opacity only, static shadow); list on FlashList 2.3.2 (in Expo Go) with getItemType, maintainVisibleContentPosition disabled; setMode in startTransition; TransactionRow resets its swipe on tx.id change (recycling); prepareForLayoutAnimationRender() before the delete LayoutAnimation (FlashList turns recycling back on after the next commit).
## Tried and ruled out
- Measuring on an emulator: AVDs exist (~/Android/Sdk, cds_test) but login needs Google OAuth with the owner's account, so it was not run.
## Watch out
- Not yet measured on the phone. Judge with `npm run start:phone -- --no-dev --minify`.
- `npx expo install` rewrote package-lock.json with 2-space indent; the repo keeps it at 4 spaces (it is in .prettierignore), so re-indent before committing.
- If it still stutters, next suspect: ReanimatedSwipeable mount cost per row; a lighter custom swipe row would be the next step.
