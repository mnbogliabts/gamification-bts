# Database Connection Configuration

This module provides PostgreSQL database connection management with connection pooling, retry logic, and health checks.

## Features

- **Connection Pooling**: Efficient connection reuse with configurable pool size
- **Retry Logic**: Automatic reconnection with exponential backoff (Requirement 18.1)
- **Health Checks**: Database connectivity monitoring
- **Error Handling**: Comprehensive error logging and recovery

## Configuration

### Environment Variables

Configure the database connection using the following environment variables:

```bash
DB_HOST=localhost              # Database host (default: localhost)
DB_PORT=5432                   # Database port (default: 5432)
DB_NAME=training_platform      # Database name (default: training_platform)
DB_USER=postgres               # Database user (default: postgres)
DB_PASSWORD=postgres           # Database password (default: postgres)
DB_POOL_MAX=20                 # Maximum pool connections (default: 20)
DB_IDLE_TIMEOUT=30000          # Idle connection timeout in ms (default: 30000)
DB_CONNECTION_TIMEOUT=5000     # Connection timeout in ms (default: 5000)
```

### Connection Pool Settings

The connection pool is configured with the following defaults:

- **Max Connections**: 20 (configurable via `DB_POOL_MAX`)
- **Idle Timeout**: 30 seconds (configurable via `DB_IDLE_TIMEOUT`)
- **Connection Timeout**: 5 seconds (configurable via `DB_CONNECTION_TIMEOUT`)

These settings ensure efficient resource usage while supporting up to 100 concurrent users (Requirement 15.4).

## Usage

### Initialize Database Connection

```typescript
import { createDatabasePool, connectWithRetry } from './infrastructure/database/connection';

// Create the connection pool
createDatabasePool();

// Connect with retry logic (up to 3 attempts with exponential backoff)
await connectWithRetry(3);
```

### Get Database Pool

```typescript
import { getDatabasePool } from './infrastructure/database/connection';

const pool = getDatabasePool();
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

### Health Check

```typescript
import { checkDatabaseHealth } from './infrastructure/database/connection';

const isHealthy = await checkDatabaseHealth();
if (isHealthy) {
  console.log('Database is connected');
} else {
  console.log('Database is disconnected');
}
```

### Close Connection Pool

```typescript
import { closeDatabasePool } from './infrastructure/database/connection';

// Gracefully close all connections
await closeDatabasePool();
```

## Retry Logic

The `connectWithRetry` function implements exponential backoff as specified in Requirement 18.1:

- **Attempt 1**: Immediate connection
- **Attempt 2**: Retry after 2 seconds (2^1 * 1000ms)
- **Attempt 3**: Retry after 4 seconds (2^2 * 1000ms)
- **Attempt 4**: Retry after 8 seconds (2^3 * 1000ms)

If all retries fail, the function throws an error and logs the failure.

## Error Handling

The module includes comprehensive error handling:

1. **Pool Errors**: Unexpected pool errors are logged with full context
2. **Connection Failures**: Connection attempts are retried with exponential backoff
3. **Health Check Failures**: Health check errors are logged but don't crash the application

All errors are logged using the Winston logger with appropriate log levels.

## Health Check Endpoint

The application exposes a `/health` endpoint that checks database connectivity:

```bash
# Healthy response (200 OK)
GET /health
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2024-01-15T10:30:45.123Z"
}

# Unhealthy response (503 Service Unavailable)
GET /health
{
  "status": "degraded",
  "database": "disconnected",
  "timestamp": "2024-01-15T10:30:45.123Z"
}
```

This endpoint is used by Docker health checks and monitoring systems.

## Testing

The module includes comprehensive unit tests covering:

- Pool creation with default and custom configurations
- Environment variable configuration
- Retry logic with exponential backoff
- Health check success and failure scenarios
- Pool closure and cleanup

Run tests with:

```bash
npm test -- connection.test.ts
```

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 18.1**: Database connection retry with exponential backoff (up to 3 attempts)
- **Requirement 19.1**: Containerization with proper configuration
- **Requirement 15.4**: Support for 100+ concurrent users via connection pooling
- **Requirement 15.5**: Database query performance with proper connection management

## Architecture

The database connection module follows the Infrastructure Layer pattern in the DDD architecture:

```
Application Layer
       ↓
Infrastructure Layer (Database Connection)
       ↓
PostgreSQL Database
```

The module provides a clean abstraction over the `pg` library, allowing the application layer to focus on business logic without worrying about connection management details.
