# Logging and Error Handling Infrastructure

This directory contains the core logging and error handling infrastructure for the Employee Training Platform backend.

## Components

### Logger (`logger.ts`)

Winston-based logger with environment-specific configuration:

**Development Mode:**
- Colorized console output
- Debug level logging
- Human-readable format

**Production Mode:**
- JSON formatted logs
- File-based logging (error.log, combined.log)
- Console output for container log aggregation
- Info level logging by default

**Usage:**
```typescript
import logger from './shared/logger';

logger.info('User logged in', { userId: '123' });
logger.error('Database connection failed', { error: err.message });
logger.warn('Rate limit approaching', { userId: '123', count: 95 });
logger.debug('Processing request', { path: '/api/users' });
```

**Configuration:**
- `LOG_LEVEL`: Set log level (error, warn, info, debug)
- `NODE_ENV`: Determines output format and destinations

### Error Classes (`errors.ts`)

Standardized error classes for consistent error handling:

**ApplicationError** - Base class for all application errors
- Properties: statusCode, message, code, details
- All custom errors extend this class

**ValidationError (400)** - Input validation failures
```typescript
throw new ValidationError('Invalid email format', { field: 'email' });
```

**AuthenticationError (401)** - Authentication failures
```typescript
throw new AuthenticationError('Invalid credentials');
```

**AuthorizationError (403)** - Permission denied
```typescript
throw new AuthorizationError('Insufficient permissions');
```

**NotFoundError (404)** - Resource not found
```typescript
throw new NotFoundError('User'); // Returns "User not found"
```

**ConflictError (409)** - Duplicate or conflicting resources
```typescript
throw new ConflictError('Email already exists');
```

**InternalServerError (500)** - Unexpected server errors
```typescript
throw new InternalServerError('Database connection failed');
```

## Error Handler Middleware

Global error handler that:
- Logs all errors with full context
- Returns appropriate HTTP status codes
- Never exposes sensitive information
- Handles database, JWT, and file upload errors
- Sanitizes request bodies before logging

**Features:**
- Automatic handling of PostgreSQL constraint violations
- JWT token error translation
- Multer file upload error handling
- Sensitive field redaction (password, token, secret, etc.)

**Usage:**
```typescript
import { errorHandler } from './presentation/middleware/errorHandler';

app.use(errorHandler);
```

## Database Connection Utilities

### Connection Management (`infrastructure/database/connection.ts`)

**createDatabasePool()** - Initialize connection pool
```typescript
const pool = createDatabasePool({
  host: 'localhost',
  port: 5432,
  database: 'training_platform',
  user: 'postgres',
  password: 'postgres'
});
```

**connectWithRetry()** - Connect with exponential backoff
- Retries up to 3 times by default
- Exponential backoff: 2s, 4s, 8s
- Requirement 18.1 compliant

```typescript
await connectWithRetry(3);
```

**checkDatabaseHealth()** - Health check endpoint
```typescript
const isHealthy = await checkDatabaseHealth();
```

### Transaction Management (`infrastructure/database/transaction.ts`)

**withTransaction()** - Execute operations in a transaction
```typescript
const result = await withTransaction(async (client) => {
  await client.query('INSERT INTO users ...');
  await client.query('INSERT INTO audit_logs ...');
  return result;
});
```

**withTransactionAndCleanup()** - Transaction with rollback cleanup
```typescript
const uploadedFiles = [];
const result = await withTransactionAndCleanup(
  async (client) => {
    // Database operations
    const record = await createRecord(client);
    // File operations
    uploadedFiles.push(await uploadFile());
    return record;
  },
  async () => {
    // Cleanup on rollback
    for (const file of uploadedFiles) {
      await deleteFile(file);
    }
  }
);
```

## Requirements Satisfied

- **18.1**: Database connection retry with exponential backoff (up to 3 times)
- **18.2**: Unhandled errors logged with details, generic message returned to user
- **18.5**: Never exposes sensitive information (database credentials, internal paths)
- **14.2**: Transaction rollback on failure
- **20.1**: Password hashing (bcrypt) - error classes support this
- **20.3**: Input sanitization - error handler sanitizes logged data

## Testing

All components have comprehensive unit tests:
- `__tests__/errors.test.ts` - Error class tests
- `presentation/middleware/__tests__/errorHandler.test.ts` - Error handler tests
- `infrastructure/database/__tests__/connection.test.ts` - Connection tests

Run tests:
```bash
npm test
```

## Best Practices

1. **Always use custom error classes** instead of generic Error
2. **Log errors at the source** with relevant context
3. **Never log sensitive data** (passwords, tokens, API keys)
4. **Use transactions** for multi-step operations
5. **Implement cleanup handlers** for operations involving external resources
6. **Test error paths** as thoroughly as success paths
