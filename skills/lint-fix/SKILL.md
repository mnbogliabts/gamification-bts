---
name: lint-fix
description: >
  ESLint and Prettier commands. Trigger: When linting, formatting, or fixing code style issues.
license: Apache-2.0
metadata:
  author: gamification-bts
  version: '1.0'
---

## When to Use

- Running linter to find issues
- Auto-fixing lint errors
- Formatting code with Prettier
- Checking type errors
- Before committing code

## Critical Commands

### Lint All

```bash
npm run lint              # ESLint both workspaces
npm run lint --workspace=backend
npm run lint --workspace=frontend
```

### Fix Issues

```bash
npm run lint:fix         # ESLint + --fix flag
npm run lint:fix --workspace=backend
npm run lint:fix --workspace=frontend
```

### Format

```bash
npm run format           # Prettier all files
```

### Type Check

```bash
# Backend TypeScript
cd backend && npx tsc --noEmit

# Frontend TypeScript
cd frontend && npx tsc --noEmit

# Both
npm run type-check
```

## Files

- `backend/.eslintrc.json` - Backend ESLint config
- `frontend/.eslintrc.json` - Frontend ESLint config
- Root `.eslintrc.json` - Not used (workspace-specific)

## Common Issues

| Error             | Fix                        |
| ----------------- | -------------------------- |
| `unused variable` | Remove or prefix with `_`  |
| `any` type        | Add proper type annotation |
| `import order`    | Run format                 |
| `console.log`     | Remove or use logger       |
| `no-else-return`  | Remove unnecessary else    |

## Pre-commit Hook

ESLint runs as pre-commit hook. To bypass:

```bash
git commit --no-verify  # Not recommended
```

## CI

In CI, always run:

```bash
npm run build && npm run lint
```
