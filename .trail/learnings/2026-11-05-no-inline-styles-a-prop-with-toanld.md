---
title: "No inline styles: a prop with a few fixed values is not a runtime value"
author: Toanld
date: 2026-11-05
branch: feat/v1
cost: { minutes: 1, tokens: 3827 }
touches:
  - src/components/entry/category-grid.tsx
  - src/components/entry/new-category-sheet.tsx
  - src/components/ui/month-picker.tsx
  - src/components/ui/selectable-tile.tsx
  - CLAUDE.md
  - docs/superpowers/specs/2026-11-05-expense-app-v1-design.md
  - package-lock.json
  - package.json
  - src/app/(tabs)/_layout.tsx
  - src/app/(tabs)/index.tsx
---

## Decided
- The owner flagged `style={[styles.ring, { borderRadius: radius }]}` in SelectableTile as an inline style, even though `radius` came from a prop. A prop that only ever takes a few fixed values (8 or 10) is not a "runtime-computed value": give it named variants (`radius?: "small" | "large"`) mapped to `StyleSheet.create` entries (`radiusStyles[radius]`).
- Still allowed inline beside a stylesheet entry: values only known at run time, such as safe-area insets, measured widths, list lengths, animated values.
## Watch out
- When a shared component needs a variant, add an enum-like prop plus a StyleSheet map, never a numeric style prop passed straight into `style`.
