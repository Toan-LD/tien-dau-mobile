---
title: Read-only component props
author: Toanld
date: 2026-11-06
branch: master
cost: { minutes: 1, tokens: 23730 }
touches:
  - src/components/categories/sortable-category-list.tsx
---

## Decided
On 2026-11-06 the owner asked for `SortableCategoryList`'s props to be read-only (src/components/categories/sortable-category-list.tsx). The fix is `}: Readonly<Props>)` in the function signature; the `Props` type itself is unchanged. This matches the "mark the props of the component as read-only" lint rule (Sonar S6759). They asked about this one component only, not about applying it repo-wide.

## Tried and ruled out
Nothing. tsc and eslint pass with no other changes.

## Watch out
`Readonly<Props>` is shallow: `items: Category[]` can still be mutated (push/sort). Use `readonly Category[]` if deep immutability is wanted. Ask the owner before applying `Readonly<Props>` to every component.
