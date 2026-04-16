---
name: ddl-entity
description: >
  Generate DDD entities with value objects, repositories, and tests following Clean Architecture patterns.
  Trigger: When creating new domain entities, adding database tables, or modifying existing entity logic.
license: Apache-2.0
metadata:
  author: gamification-bts
  version: '1.0'
---

## When to Use

- Creating new domain entity (e.g., `Bonus`, `Achievement`, `Reward`)
- Adding new database table
- Modifying existing entity logic or adding fields
- Creating value objects for domain modeling
- Writing repository implementation

## Critical Patterns

### Entity Structure

```typescript
// backend/src/domain/entities/EntityName.ts
import { v4 as uuidv4 } from 'uuid';

export class EntityName {
  private readonly _id: string;
  private _field1: string;
  private _field2: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: EntityNameProps) {
    this._id = props.id || uuidv4();
    this._field1 = props.field1;
    this._field2 = props.field2;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  static create(props: CreateEntityNameProps): EntityName {
    // Validation logic here
    return new EntityName(props);
  }

  static fromPersistence(row: EntityNameRow): EntityName {
    return new EntityName({
      id: row.id,
      field1: row.field1,
      field2: row.field2,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    });
  }

  // Getters
  get id(): string {
    return this._id;
  }
  get field1(): string {
    return this._field1;
  }

  // Business methods
  updateField1(value: string): void {
    this._field1 = value;
    this._updatedAt = new Date();
  }

  toJSON(): EntityNameJSON {
    return {
      id: this._id,
      field1: this._field1,
      field2: this._field2,
      createdAt: this._createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
```

### Value Object Structure

```typescript
// backend/src/domain/value-objects/EntityField.ts
import { ValidationError } from '../../shared/errors';

export class EntityField {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(value: string): EntityField {
    if (!value || value.trim().length === 0) {
      throw new ValidationError('Field cannot be empty');
    }
    if (value.length > 100) {
      throw new ValidationError('Field must be less than 100 characters');
    }
    return new EntityField(value.trim());
  }

  equals(other: EntityField): boolean {
    return this.value === other.value;
  }
}
```

### Repository Interface

```typescript
// backend/src/domain/repositories/IEntityNameRepository.ts
import { EntityName } from '../entities/EntityName';

export interface SearchCriteria {
  searchTerm?: string;
  limit?: number;
  offset?: number;
}

export interface IEntityNameRepository {
  create(entity: EntityName): Promise<EntityName>;
  findById(id: string): Promise<EntityName | null>;
  search(criteria: SearchCriteria): Promise<EntityName[]>;
  update(entity: EntityName): Promise<EntityName>;
  delete(id: string): Promise<void>;
}
```

### Repository Implementation

```typescript
// backend/src/infrastructure/database/repositories/EntityNameRepository.ts
import { getDatabasePool } from '../connection';
import { EntityName } from '../../../domain/entities/EntityName';
import {
  IEntityNameRepository,
  SearchCriteria,
} from '../../../domain/repositories/IEntityNameRepository';

export class EntityNameRepository implements IEntityNameRepository {
  async create(entity: EntityName): Promise<EntityName> {
    const pool = getDatabasePool();
    const json = entity.toJSON();
    await pool.query(
      `INSERT INTO entity_names (id, field1, field2, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [json.id, json.field1, json.field2, json.createdAt, json.updatedAt]
    );
    return entity;
  }

  async findById(id: string): Promise<EntityName | null> {
    const pool = getDatabasePool();
    const result = await pool.query('SELECT * FROM entity_names WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return EntityName.fromPersistence(result.rows[0]);
  }

  async search(criteria: SearchCriteria): Promise<EntityName[]> {
    const pool = getDatabasePool();
    // Implementation with pagination
    const result = await pool.query(
      'SELECT * FROM entity_names ORDER BY created_at DESC LIMIT $1 OFFSET $2',
      [criteria.limit || 50, criteria.offset || 0]
    );
    return result.rows.map((row) => EntityName.fromPersistence(row));
  }

  async update(entity: EntityName): Promise<EntityName> {
    const pool = getDatabasePool();
    const json = entity.toJSON();
    await pool.query(
      `UPDATE entity_names SET field1 = $1, field2 = $2, updated_at = $3 WHERE id = $4`,
      [json.field1, json.field2, json.updatedAt, json.id]
    );
    return entity;
  }

  async delete(id: string): Promise<void> {
    const pool = getDatabasePool();
    await pool.query('DELETE FROM entity_names WHERE id = $1', [id]);
  }
}
```

### Use Case Structure

```typescript
// backend/src/application/use-cases/entity-name/CreateEntityNameUseCase.ts
import { EntityName } from '../../../domain/entities/EntityName';
import { IEntityNameRepository } from '../../../domain/repositories/IEntityNameRepository';
import { ValidationError } from '../../../shared/errors';

export interface CreateEntityNameDTO {
  field1: string;
  field2: number;
}

export class CreateEntityNameUseCase {
  constructor(private repository: IEntityNameRepository) {}

  async execute(dto: CreateEntityNameDTO): Promise<EntityName> {
    // Business validation
    if (!dto.field1) {
      throw new ValidationError('field1 is required');
    }

    // Create entity
    const entity = EntityName.create({
      field1: dto.field1,
      field2: dto.field2,
    });

    // Persist
    return await this.repository.create(entity);
  }
}
```

### Routes Structure

```typescript
// backend/src/presentation/routes/entityNameRoutes.ts
import { Router } from 'express';
import { createEntityNameUseCase, listEntityNamesUseCase } from '../container';

const router = Router();

router.post('/', async (req, res) => {
  const entity = await createEntityNameUseCase.execute(req.body);
  res.status(201).json(entity.toJSON());
});

router.get('/', async (req, res) => {
  const entities = await listEntityNamesUseCase.execute();
  res.json(entities.map((e) => e.toJSON()));
});

export default router;
```

## Database Migration Pattern

```sql
-- database/migrations/xxx_create_entity_names.sql
CREATE TABLE entity_names (
  id UUID PRIMARY KEY,
  field1 VARCHAR(100) NOT NULL,
  field2 INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_entity_names_field1 ON entity_names(field1);
CREATE INDEX idx_entity_names_created_at ON entity_names(created_at);
```

## Commands

```bash
# Run tests
npm test -- --testPathPattern=EntityName

# Lint
npm run lint -- backend/src/domain/entities/EntityName.ts

# Type check
cd backend && npx tsc --noEmit
```

## Resources

- **Entity examples**: `backend/src/domain/entities/User.ts`, `TrainingRecord.ts`
- **Repository examples**: `backend/src/infrastructure/database/repositories/UserRepository.ts`
- **Use case examples**: `backend/src/application/use-cases/user/CreateUserUseCase.ts`
- **Init SQL**: `database/init.sql` (add new table here)
