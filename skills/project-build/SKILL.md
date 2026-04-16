---
name: project-build
description: >
  Build, test, and dev commands for the monorepo. Trigger: When building, testing, or running development servers.
license: Apache-2.0
metadata:
  author: gamification-bts
  version: '1.0'
---

## When to Use

- Running development servers (backend + frontend)
- Building the project (production)
- Running tests (Jest)
- Running single workspace commands

## Critical Commands

### Install Dependencies

```bash
npm run install:all       # Install all workspaces
```

### Development

```bash
npm run dev               # Run backend (port 8000) + frontend (port 3000)
npm run dev --workspace=backend    # Backend only
npm run dev --workspace=frontend # Frontend only (with Vite hot reload)
```

### Build

```bash
npm run build             # tsc (backend) + vite build (frontend)
# Frontend needs backend tsc to pass first!
```

### Testing

```bash
npm test                 # Jest --runInBand (both workspaces)
npm test -- --workspace=backend    # Backend tests only
npm test -- --workspace=frontend # Frontend tests only

# With coverage
npm run test:coverage
```

### Single Commands

```bash
# Backend only
cd backend && npm run dev          # ts-node-dev with hot reload
cd backend && npm run build        # tsc to dist/
cd backend && npm test           # Jest tests

# Frontend only
cd frontend && npm run dev     # Vite dev server
cd frontend && npm run build    # Vite build
cd frontend && npm test       # Jest tests
```

## Ports

| Service    | Port |
| ---------- | ---- |
| Backend    | 8000 |
| Frontend   | 3000 |
| PostgreSQL | 5432 |

## Environment

- Root `.env` for shared config
- `backend/.env` for backend-specific
- `frontend/.env` for frontend-specific
- See `.env.example` for required variables

## Common Issues

| Issue                     | Solution                                |
| ------------------------- | --------------------------------------- |
| Frontend build fails      | Run `cd backend && npm run build` first |
| Tests fail intermittently | Use `--runInBand` (already default)     |
| Port in use               | Kill process on port or change in .env  |
