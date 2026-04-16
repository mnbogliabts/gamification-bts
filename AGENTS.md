# AGENTS.md

## Project Structure

```
monorepo/
├── backend/          # Express + TypeScript + DDD (domain/application/infrastructure/presentation)
├── frontend/         # React 18 + Vite + TypeScript
└── package.json      # workspaces: ["backend", "frontend"]
```

## Developer Commands

```bash
npm run install:all       # Install all workspaces
npm run dev               # Run backend (port 8000) + frontend (port 3000)
npm run build             # tsc && vite build (frontend needs tsc first!)
npm test                  # Jest --runInBand (both workspaces)
npm run lint              # ESLint both workspaces
npm run format            # Prettier all .ts/.tsx/.js/.jsx/.json/.md

# Single workspace
npm run dev --workspace=backend
npm test --workspace=frontend
```

## Architecture

- **Backend entrypoint**: `backend/src/index.ts`
- **Backend layers**: domain → application → infrastructure → presentation (DDD)
- **Frontend entrypoint**: `frontend/src/main.tsx` (via Vite)
- **Database**: PostgreSQL (default port 5432)

## Docker

```bash
docker-compose -f docker-compose.dev.yml up   # Hot reload dev
docker-compose up -d                            # Production
```

## Important Notes

- Frontend build runs `tsc && vite build` — TypeScript must pass before Vite
- Tests use `--runInBand` (sequential) — required for this codebase
- Auth: JWT + Google OAuth 2.0 (see `backend/src/infrastructure/auth/`)
- File uploads: Multer, stored in `uploads/` directory
- Env files: `.env` at root and per-workspace (see `.env.example`)

## Existing Conventions

- Skill registry: `.atl/skill-registry.md`
- ESLint + Prettier enforced
- DDD pattern: domain entities, value objects, application use cases, infrastructure repositories
