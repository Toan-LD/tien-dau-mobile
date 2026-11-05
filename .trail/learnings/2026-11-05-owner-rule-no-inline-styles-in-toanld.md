---
title: "Owner rule: no inline styles in React Native components"
author: Toanld
date: 2026-11-05
branch: feat/v1
---

## Decided
- The owner does not want inline styles. Every style goes in `StyleSheet.create({...})` at the bottom of the component file and is referenced as `style={styles.x}` or `style={[styles.a, styles.b]}`.
- Only runtime-computed values (for example a bar width from data) may sit inline beside a stylesheet entry: `style={[styles.bar, { width }]}`.
## Watch out
- This covers placeholder screens and small components too; reviewers should flag any `style={{` literal.
