---
name: db-migrate
description: >
  Database migrations and initialization. Trigger: When creating new tables, modifying schema, or resetting the database.
license: Apache-2.0
metadata:
  author: gamification-bts
  version: '1.0'
---

## When to Use

- Adding new tables to the database
- Modifying existing schema
- Running database migrations
- Resetting/reseeding database
- Checking current schema

## Database Location

- **Init script**: `database/init.sql`
- **PostgreSQL**: Port 5432

## Adding New Tables

### Step 1: Add to init.sql

Add new table to `database/init.sql`:

```sql
CREATE TABLE new_entities (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_new_entities_name ON new_entities(name);
```

### Step 2: Add to Connection Pool

If needed, modify `backend/src/infrastructure/database/connection.ts`.

### Step 3: Create Entity

Use `ddl-entity` skill to create entity, repository, and use case.

## Commands

### Run Init Script

```bash
# With Docker
docker-compose exec database psql -U postgres -d training_platform -f /docker-entrypoint-initdb.d/init.sql

# Direct connection
docker-compose exec database psql -U postgres -d training_platform
```

### Reset Database

```bash
# Warning: All data will be lost!
docker-compose down -v           # Remove volumes
docker-compose up -d             # Recreate
```

### View Schema

```bash
docker-compose exec database psql -U postgres -d training_platform -c "\dt"
docker-compose exec database psql -U postgres -d training_platform -c "\d table_name"
```

### Backups

```bash
# Backup
docker-compose exec database pg_dump -U postgres training_platform > backup.sql

# Restore
docker-compose exec -T database psql -U postgres training_platform < backup.sql
```

## Tables

Current tables in `database/init.sql`:

- `users` - User accounts
- `technologies` - Technology categories
- `training_records` - Employee training records
- `training_files` - File attachments
- `sessions` - JWT sessions
- `audit_logs` - Audit trail

## Common Issues

| Issue                | Solution                                    |
| -------------------- | ------------------------------------------- |
| Table already exists | Drop first: `DROP TABLE table_name CASCADE` |
| Foreign key error    | Check referenced table exists               |
| UUID not found       | Load `pgcrypto` extension first             |
