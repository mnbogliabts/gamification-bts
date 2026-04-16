# AGENTS.md - Backend

## Structure

```
backend/src/
├── domain/           # Business logic (entities, value objects, repositories interfaces, services)
├── application/      # Use cases (application layer)
├── infrastructure/   # Implementations (DB, auth, storage)
├── presentation/     # Routes, middleware
├── shared/          # Errors, utils
└── index.ts         # Entry point
```

## Architecture

- **DDD Pattern**: domain → application → infrastructure → presentation
- **Entry point**: `backend/src/index.ts`
- **Layers**: cada layer solo puede depender de capas inferiores

## Naming

| Type            | Pattern                    | Example                        |
| --------------- | -------------------------- | ------------------------------ |
| Entity          | `EntityName.ts`            | `User.ts`, `TrainingRecord.ts` |
| Value Object    | `EntityField.ts`           | `Email.ts`, `TrainingHours.ts` |
| Repository      | `IEntityNameRepository.ts` | `IUserRepository.ts`           |
| Repository Impl | `EntityNameRepository.ts`  | `UserRepository.ts`            |
| Use Case        | `VerbEntityNameUseCase.ts` | `CreateUserUseCase.ts`         |
| Route           | `entityNameRoutes.ts`      | `userRoutes.ts`                |

## Code Patterns

### Entity

```typescript
export class User {
  private readonly _id: string;

  static create(props: CreateUserProps): User { ... }
  static fromPersistence(row: UserRow): User { ... }

  toJSON(): UserJSON { ... }
}
```

### Value Object

```typescript
export class Email {
  readonly value: string;

  static create(value: string): Email {
    if (!value.includes('@')) throw new ValidationError(...);
    return new Email(value.toLowerCase());
  }
}
```

### Use Case

```typescript
export class CreateUserUseCase {
  constructor(private repository: IUserRepository) {}

  async execute(dto: CreateUserDTO): Promise<User> {
    // Validation
    // Business logic
    // Persist
  }
}
```

## Testing

```bash
npm test                         # All tests
npm test -- --testPathPattern=User  # Specific entity
npm run test:coverage            # With coverage
```

## Commands

```bash
npm run dev          # Hot reload (ts-node-dev)
npm run build        # Compile to dist/
npm run lint         # ESLint
npm run format       # Prettier
```

## Environment

- Variables en `backend/.env` (ver `.env.example`)
- Puerto: 8000
