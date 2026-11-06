---
title: "Category list: tap the row to edit, no edit icon"
author: Toanld
date: 2026-11-06
branch: master
cost: { minutes: 1, tokens: 35673 }
touches:
  - CLAUDE.md
  - docs/superpowers/specs/2026-11-05-expense-app-v1-design.md
  - src/app/(tabs)/_layout.tsx
  - src/app/(tabs)/report.tsx
  - src/app/(tabs)/settings.tsx
  - src/app/_layout.tsx
  - src/app/categories.tsx
  - src/components/categories/category-sheet.tsx
  - src/components/categories/sortable-category-list.tsx
  - src/components/entry/entry-form.tsx
---

## Decided
- Owner's rule (2026-11-06): in Quản lý danh mục, tapping a category row (icon or name) opens the edit sheet. There is no separate ✎ edit button; each row has only the delete button and the ≡ drag handle (`src/components/categories/sortable-category-list.tsx`).
- The hint under the list (`src/app/categories.tsx`) says "Nhấn vào một mục để sửa..." because nothing else on screen shows that rows can be edited. Spec §2 note updated.

## Tried and ruled out
- An edit icon next to delete: the owner found it redundant since the row already opens the editor.

## Watch out
- Don't add an edit icon back to list rows; prefer tap-the-row for editing elsewhere too unless the owner asks otherwise.
