# Docker Setup Guide

This guide explains how to run the Employee Training Management Platform using Docker and Docker Compose.

## Prerequisites

- Docker Engine 20.10 or higher
- Docker Compose 2.0 or higher

## Quick Start

### Development Mode (with hot reload)

1. Copy the environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and configure your environment variables (especially database password and JWT secret)

3. Start all services:
```bash
docker-compose -f docker-compose.dev.yml up
```

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - Database: localhost:5432

### Production Mode

1. Copy the environment file:
```bash
cp .env.example .env
```

2. Edit `.env` with production values (use strong passwords and secrets)

3. Build and start all services:
```bash
docker-compose up -d
```

4. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

## Services

### Database (PostgreSQL)
- **Port**: 5432
- **Container**: training-platform-db
- **Volume**: postgres_data (persistent storage)
- **Health Check**: Checks PostgreSQL readiness every 10 seconds

### Backend (Node.js/Express)
- **Port**: 8000
- **Container**: training-platform-backend
- **Depends on**: Database (waits for health check)
- **Health Check**: HTTP GET /health endpoint
- **Volume**: ./uploads (for file storage)

### Frontend (React/Nginx)
- **Port**: 3000
- **Container**: training-platform-frontend
- **Depends on**: Backend (waits for health check)

## Environment Variables

### Required Variables

- `DB_PASSWORD`: PostgreSQL password (change in production!)
- `JWT_SECRET`: Secret key for JWT tokens (minimum 32 characters)
- `GOOGLE_CLIENT_ID`: Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret

### Optional Variables

- `DB_NAME`: Database name (default: training_platform)
- `DB_USER`: Database user (default: postgres)
- `JWT_EXPIRES_IN`: JWT token expiration (default: 24h)
- `GOOGLE_CALLBACK_URL`: OAuth callback URL
- `ALLOWED_EMAIL_DOMAIN`: Email domain restriction (default: bluetrailsoft.com)
- `FILE_UPLOAD_PATH`: File upload directory (default: /app/uploads)
- `MAX_FILE_SIZE`: Maximum file size in bytes (default: 10485760 = 10MB)
- `VITE_API_URL`: Frontend API URL (default: http://localhost:8000/api)

## Common Commands

### Start services
```bash
# Development mode with hot reload
docker-compose -f docker-compose.dev.yml up

# Production mode
docker-compose up -d
```

### Stop services
```bash
# Development
docker-compose -f docker-compose.dev.yml down

# Production
docker-compose down
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f database
```

### Rebuild containers
```bash
# Development
docker-compose -f docker-compose.dev.yml up --build

# Production
docker-compose up --build -d
```

### Access database
```bash
docker exec -it training-platform-db psql -U postgres -d training_platform
```

### Clean up everything (including volumes)
```bash
docker-compose down -v
```

## Development Workflow

### Hot Reload

In development mode, both frontend and backend support hot reload:

- **Backend**: Changes to `backend/src/**` files trigger automatic restart
- **Frontend**: Changes to `frontend/src/**` files trigger automatic rebuild

### Volume Mounts

Development mode mounts source code directories:
- Backend: `./backend/src` → `/app/src`
- Frontend: `./frontend/src` → `/app/src`

This allows you to edit code on your host machine and see changes immediately in the containers.

## Health Checks

All services include health checks:

- **Database**: Checks PostgreSQL readiness using `pg_isready`
- **Backend**: HTTP GET request to `/health` endpoint
- **Frontend**: Depends on backend health check

Services wait for dependencies to be healthy before starting.

## File Storage

Training certificates and files are stored in the `./uploads` directory, which is mounted as a volume in the backend container. This ensures files persist even if containers are recreated.

## Troubleshooting

### Database connection errors

If the backend can't connect to the database:
1. Check database health: `docker-compose ps`
2. Verify environment variables in `.env`
3. Check database logs: `docker-compose logs database`

### Port conflicts

If ports 3000, 5432, or 8000 are already in use:
1. Stop conflicting services
2. Or modify port mappings in `docker-compose.yml`

### Permission errors with uploads

If you get permission errors with file uploads:
```bash
mkdir -p uploads
chmod 777 uploads
```

### Reset database

To start with a fresh database:
```bash
docker-compose down -v
docker-compose up -d
```

## Security Notes

### Production Deployment

For production deployment:

1. **Change default passwords**: Update `DB_PASSWORD` and `JWT_SECRET`
2. **Use strong secrets**: JWT_SECRET should be at least 32 random characters
3. **Configure OAuth**: Set up proper Google OAuth credentials
4. **Use HTTPS**: Configure reverse proxy (nginx/traefik) with SSL certificates
5. **Restrict database access**: Don't expose port 5432 publicly
6. **Set proper CORS**: Configure allowed origins in backend
7. **Use secrets management**: Consider Docker secrets or external secret managers

### Environment Variables

Never commit `.env` file to version control. The `.env.example` file is provided as a template.

## Network Architecture

All services run in a custom bridge network (`training-platform-network`), allowing them to communicate using service names:

- Backend connects to database using hostname `database`
- Frontend connects to backend using hostname `backend` (or via host machine)

## Data Persistence

- **Database data**: Stored in Docker volume `postgres_data`
- **Uploaded files**: Stored in `./uploads` directory on host machine

Both persist even when containers are stopped or removed (unless you use `docker-compose down -v`).
