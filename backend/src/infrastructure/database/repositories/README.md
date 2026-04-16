# Repository Implementations

This directory contains PostgreSQL implementations of all repository interfaces defined in the domain layer.

## Overview

All repositories use the `pg` (node-postgres) client directly with connection pooling from `connection.ts`. They implement the repository pattern to provide data access abstraction.

## Repositories

### UserRepository
- **Interface**: `IUserRepository`
- **Entity**: `User`
- **Operations**: create, findById, findByEmail, findByUsername, update, deactivate, listAll
- **Requirements**: 3.1, 4.1

### TechnologyRepository
- **Interface**: `ITechnologyRepository`
- **Entity**: `Technology`
- **Operations**: create, findById, findByName, listAll, update, delete
- **Requirements**: 4.1

### TrainingRecordRepository
- **Interface**: `ITrainingRecordRepository`
- **Entity**: `TrainingRecord`
- **Operations**: create, findById, update, delete, findByUserId, search, findByDateRange
- **Requirements**: 4.1, 5.4
- **Features**: 
  - Full-text search on title and description (case-insensitive)
  - Multiple filter criteria support (technology, user, date range)
  - Chronological ordering

### TrainingFileRepository
- **Interface**: `ITrainingFileRepository`
- **Entity**: `TrainingFile`
- **Operations**: create, findById, findByTrainingRecordId, delete
- **Requirements**: 5.4

### AuditLogRepository
- **Interface**: `IAuditLogRepository`
- **Entity**: `AuditLog`
- **Operations**: create, findByUserId, findByDateRange, findByEntityId
- **Requirements**: 17.1
- **Features**: Pagination support, chronological ordering

### SessionRepository
- **Interface**: `ISessionRepository`
- **Entity**: `Session`
- **Operations**: create, findByTokenHash, delete, deleteExpired
- **Requirements**: 1.7, 1.9
- **Features**: Automatic cleanup of expired sessions

## Usage Example

```typescript
import { getDatabasePool, createDatabasePool } from '../connection';
import { UserRepository } from './repositories';
import { User, UserRole, AuthProvider } from '../../domain/entities/User';
import { Email } from '../../domain/value-objects/Email';

// Initialize database pool
createDatabasePool();

// Create repository instance
const userRepository = new UserRepository();

// Create a new user
const user = User.create({
  id: 'uuid-here',
  username: 'john.doe',
  email: new Email('john.doe@bluetrailsoft.com'),
  passwordHash: 'hashed_password',
  role: UserRole.EMPLOYEE,
  isActive: true,
  authProvider: AuthProvider.LOCAL
});

await userRepository.create(user);

// Find user by email
const foundUser = await userRepository.findByEmail(new Email('john.doe@bluetrailsoft.com'));
```

## Database Schema

All repositories expect the following database schema (see `database/init.sql`):

- `users` table
- `technologies` table
- `training_records` table
- `training_files` table
- `audit_logs` table
- `sessions` table

## Error Handling

Repositories throw errors in the following cases:
- Database connection failures (handled by connection pool)
- Constraint violations (unique constraints, foreign keys)
- Not found errors when updating non-existent records
- Invalid data that violates domain rules

## Testing

Unit tests are provided in `__tests__/` directory. Tests use mocked database connections.

To run tests:
```bash
npm test -- UserRepository.test.ts
```

## Performance Considerations

- All queries use parameterized statements to prevent SQL injection
- Indexes are defined in the database schema for optimal query performance
- Connection pooling is used to manage database connections efficiently
- Search operations use ILIKE for case-insensitive matching (PostgreSQL-specific)

## Future Enhancements

- Add transaction support for multi-repository operations
- Implement caching layer for frequently accessed data
- Add query result pagination for large datasets
- Implement soft delete for audit trail preservation
