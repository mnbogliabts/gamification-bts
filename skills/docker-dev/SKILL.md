---
name: docker-dev
description: >
  Docker Compose development commands. Trigger: When running, building, or managing Docker containers.
license: Apache-2.0
metadata:
  author: gamification-bts
  version: '1.0'
---

## When to Use

- Starting development environment with hot reload
- Building Docker images
- Managing containers (stop, start, logs)
- Running database migrations
- Production deployment

## Critical Commands

### Development (Hot Reload)

```bash
docker-compose -f docker-compose.dev.yml up     # Run all services
docker-compose -f docker-compose.dev.yml up -d    # Detached mode
docker-compose -f docker-compose.dev.yml down   # Stop and remove
```

### Production

```bash
docker-compose up -d              # Build and run
docker-compose down              # Stop and remove
docker-compose build          # Build images only
docker-compose build --no-cache # Rebuild without cache
```

### Container Management

```bash
docker-compose ps                # List running containers
docker-compose logs -f          # Follow logs
docker-compose logs -f backend  # Backend logs only
docker-compose restart         # Restart all
docker-compose restart backend # Restart specific
```

### Database

```bash
# Connect to database
docker-compose exec database psql -U postgres -d training_platform

# Run init scripts
docker-compose exec backend sh -c "npm run db:init"
```

### Volumes

```bash
docker-compose down -v           # Remove volumes (data loss!)
docker volume ls                # List volumes
docker volume inspect training-platform_postgres_data
```

## Services

| Service  | Port | Description     |
| -------- | ---- | --------------- |
| frontend | 3000 | Vite dev server |
| backend  | 8000 | Express API     |
| database | 5432 | PostgreSQL      |

## Files

- `docker-compose.dev.yml` - Development (hot reload)
- `docker-compose.yml` - Production (optimized)
- `backend/Dockerfile` - Backend production image
- `frontend/Dockerfile` - Frontend production image

## Environment Variables

Required in `.env` or docker-compose:

```bash
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=training_platform
JWT_SECRET=your-secret
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
```

## Common Issues

| Issue                     | Solution                           |
| ------------------------- | ---------------------------------- |
| Container won't start     | Check `docker-compose logs`        |
| Database connection error | Wait for database healthcheck      |
| Port in use               | Stop local services or change port |
| Hot reload not working    | Volume mounted correctly?          |
