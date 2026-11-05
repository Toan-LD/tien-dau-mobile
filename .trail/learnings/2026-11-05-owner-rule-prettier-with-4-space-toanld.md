---
title: "Owner rule: Prettier with 4-space indent for all code"
author: Toanld
date: 2026-11-05
branch: feat/v1
touches:
  - ".vscode/settings.json"
  - CLAUDE.md
  - app.json
  - eslint.config.js
  - jest.global-setup.js
  - package-lock.json
  - package.json
  - scripts/reset-project.js
  - src/app/(tabs)/_layout.tsx
  - src/app/(tabs)/index.tsx
---

## Decided
- The owner wants one format, the one their VS Code already uses: Prettier, with `tabWidth: 4` and Prettier defaults otherwise (double quotes, semicolons, trailing commas, printWidth 80).
- `.prettierrc` holds the config; `npx expo lint` enforces it via eslint-plugin-prettier/recommended (Expo's documented setup); `npm run format` reformats.
- The workspace `.vscode/settings.json` sets Prettier as formatter for ts/tsx/js/json, because the owner's user settings format `.ts` with the built-in TypeScript formatter.
## Tried and ruled out
- Single quotes: earlier tasks wrote single quotes, but the owner's editor kept rewriting `.tsx` files to double quotes on save. Prettier defaults win.
## Watch out
- `.prettierignore` skips markdown (the owner formats it with Markdown All in One), docs/, .claude/, assets/ and the generated src/lib/database.types.ts. Running `prettier --write .` without it reformats CLAUDE.md and .claude/settings.json.
