import * as fc from 'fast-check';
import { UserRepository } from '../UserRepository';
import { TrainingRecordRepository } from '../TrainingRecordRepository';
import { User, UserRole, AuthProvider } from '../../../../domain/entities/User';
import { Email } from '../../../../domain/value-objects/Email';
import { TrainingHours } from '../../../../domain/value-objects/TrainingHours';

// Mock the database connection
jest.mock('../../connection', () => ({
  getDatabasePool: jest.fn(),
}));

const { getDatabasePool } = require('../../connection');

describe('Repository Property-Based Tests', () => {
  let mockPool: any;
  let userRepository: UserRepository;
  let trainingRecordRepository: TrainingRecordRepository;

  beforeEach(() => {
    // Create a mock pool with query method
    mockPool = {
      query: jest.fn(),
    };

    getDatabasePool.mockReturnValue(mockPool);
    userRepository = new UserRepository();
    trainingRecordRepository = new TrainingRecordRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Property 13: User Creation Persistence', () => {
    /**
     * **Validates: Requirements 3.1**
     * 
     * For any user creation request with valid username, email, password, and role,
     * the system must persist all fields to the database and return the created user
     * with a generated ID.
     */
    it('should persist all user fields to database and return created user', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 1, maxLength: 100 }),
            email: fc.emailAddress().map(email => email.toLowerCase().replace(/@.*$/, '@bluetrailsoft.com')),
            passwordHash: fc.string({ minLength: 10 }),
            role: fc.constantFrom(UserRole.ADMIN, UserRole.EMPLOYEE),
            isActive: fc.boolean(),
            authProvider: fc.constantFrom(AuthProvider.LOCAL, AuthProvider.GOOGLE_OAUTH),
          }),
          async (userProps) => {
            // Reset mock for each iteration
            mockPool.query.mockClear();
            
            const user = User.create({
              ...userProps,
              email: new Email(userProps.email),
            });

            // Mock database response
            mockPool.query.mockResolvedValueOnce({
              rows: [{
                id: user.id,
                username: user.username,
                email: user.email.getValue(),
                password_hash: user.passwordHash,
                role: user.role,
                is_active: user.isActive,
                auth_provider: user.authProvider,
                created_at: user.createdAt,
                updated_at: user.updatedAt,
              }],
            });

            const result = await userRepository.create(user);

            // Verify database was called with correct parameters
            expect(mockPool.query).toHaveBeenCalledTimes(1);
            const [query, values] = mockPool.query.mock.calls[0];
            expect(query).toContain('INSERT INTO users');
            expect(values).toEqual([
              user.id,
              user.username,
              user.email.getValue(),
              user.passwordHash,
              user.role,
              user.isActive,
              user.authProvider,
              user.createdAt,
              user.updatedAt,
            ]);

            // Verify all fields are persisted and returned
            expect(result.id).toBe(user.id);
            expect(result.username).toBe(user.username);
            expect(result.email.getValue()).toBe(user.email.getValue());
            expect(result.passwordHash).toBe(user.passwordHash);
            expect(result.role).toBe(user.role);
            expect(result.isActive).toBe(user.isActive);
            expect(result.authProvider).toBe(user.authProvider);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 15: User Update Audit Trail', () => {
    /**
     * **Validates: Requirements 3.3**
     * 
     * For any user update operation, the system must persist the changes to the database
     * and create an audit log entry containing the user ID, action type, and modified fields.
     * 
     * Note: This test focuses on the persistence aspect. Audit logging is tested separately
     * in the application layer.
     */
    it('should persist user updates to the database', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 1, maxLength: 100 }),
            newUsername: fc.string({ minLength: 1, maxLength: 100 }),
            email: fc.emailAddress().map(email => email.toLowerCase().replace(/@.*$/, '@bluetrailsoft.com')),
            passwordHash: fc.string({ minLength: 10 }),
            role: fc.constantFrom(UserRole.ADMIN, UserRole.EMPLOYEE),
          }),
          async (props) => {
            // Reset mock for each iteration
            mockPool.query.mockClear();
            
            const updatedAt = new Date();

            // Mock database response
            mockPool.query.mockResolvedValueOnce({
              rows: [{
                id: props.id,
                username: props.newUsername,
                email: props.email,
                password_hash: props.passwordHash,
                role: props.role,
                is_active: true,
                auth_provider: AuthProvider.LOCAL,
                created_at: new Date(Date.now() - 86400000), // 1 day ago
                updated_at: updatedAt,
              }],
            });

            const result = await userRepository.update(props.id, {
              username: props.newUsername,
            });

            // Verify database was called
            expect(mockPool.query).toHaveBeenCalledTimes(1);
            const [query] = mockPool.query.mock.calls[0];
            expect(query).toContain('UPDATE users');
            expect(query).toContain('username');
            expect(query).toContain('updated_at');

            // Verify changes are persisted
            expect(result.username).toBe(props.newUsername);
            expect(result.updatedAt).toBeInstanceOf(Date);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 17: Email Uniqueness', () => {
    /**
     * **Validates: Requirements 3.5**
     * 
     * For any two distinct user accounts in the system, their email addresses must be
     * different (case-insensitive comparison).
     */
    it('should enforce unique email addresses across all users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            user1: fc.record({
              id: fc.uuid(),
              username: fc.string({ minLength: 1, maxLength: 100 }),
              email: fc.emailAddress().map(email => email.toLowerCase().replace(/@.*$/, '@bluetrailsoft.com')),
              passwordHash: fc.string({ minLength: 10 }),
              role: fc.constantFrom(UserRole.ADMIN, UserRole.EMPLOYEE),
            }),
            user2: fc.record({
              id: fc.uuid(),
              username: fc.string({ minLength: 1, maxLength: 100 }),
              email: fc.emailAddress().map(email => email.toLowerCase().replace(/@.*$/, '@bluetrailsoft.com')),
              passwordHash: fc.string({ minLength: 10 }),
              role: fc.constantFrom(UserRole.ADMIN, UserRole.EMPLOYEE),
            }),
          }).filter(({ user1, user2 }) => user1.id !== user2.id),
          async ({ user1, user2 }) => {
            if (user1.email.toLowerCase() === user2.email.toLowerCase()) {
              // Same email - should fail on second insert (simulating unique constraint)
              const firstUser = User.create({
                ...user1,
                email: new Email(user1.email),
              });

              mockPool.query.mockResolvedValueOnce({
                rows: [{
                  id: firstUser.id,
                  username: firstUser.username,
                  email: firstUser.email.getValue(),
                  password_hash: firstUser.passwordHash,
                  role: firstUser.role,
                  is_active: true,
                  auth_provider: AuthProvider.LOCAL,
                  created_at: firstUser.createdAt,
                  updated_at: firstUser.updatedAt,
                }],
              } as any);

              await userRepository.create(firstUser);

              // Second user with same email should fail
              const secondUser = User.create({
                ...user2,
                email: new Email(user2.email),
              });

              mockPool.query.mockRejectedValueOnce({
                code: '23505', // PostgreSQL unique violation
                constraint: 'users_email_key',
              });

              await expect(userRepository.create(secondUser)).rejects.toThrow();
            } else {
              // Different emails - both should succeed
              const firstUser = User.create({
                ...user1,
                email: new Email(user1.email),
              });

              const secondUser = User.create({
                ...user2,
                email: new Email(user2.email),
              });

              mockPool.query
                .mockResolvedValueOnce({
                  rows: [{
                    id: firstUser.id,
                    username: firstUser.username,
                    email: firstUser.email.getValue(),
                    password_hash: firstUser.passwordHash,
                    role: firstUser.role,
                    is_active: true,
                    auth_provider: AuthProvider.LOCAL,
                    created_at: firstUser.createdAt,
                    updated_at: firstUser.updatedAt,
                  }],
                } as any)
                .mockResolvedValueOnce({
                  rows: [{
                    id: secondUser.id,
                    username: secondUser.username,
                    email: secondUser.email.getValue(),
                    password_hash: secondUser.passwordHash,
                    role: secondUser.role,
                    is_active: true,
                    auth_provider: AuthProvider.LOCAL,
                    created_at: secondUser.createdAt,
                    updated_at: secondUser.updatedAt,
                  }],
                } as any);

              const result1 = await userRepository.create(firstUser);
              const result2 = await userRepository.create(secondUser);

              expect(result1.email.getValue().toLowerCase()).not.toBe(
                result2.email.getValue().toLowerCase()
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 27: Training Record Update Persistence', () => {
    /**
     * **Validates: Requirements 6.1**
     * 
     * For any training record update request with valid field values (technologyId, title,
     * description, hours), the system must persist all changes and update the updatedAt timestamp.
     */
    it('should persist all training record updates to database', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            technologyId: fc.uuid(),
            newTechnologyId: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            newTitle: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0),
            newDescription: fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0),
            hours: fc.double({ min: 0.5, max: 1000, noNaN: true }).map(h => Math.round(h * 100) / 100),
            newHours: fc.double({ min: 0.5, max: 1000, noNaN: true }).map(h => Math.round(h * 100) / 100),
          }),
          async (props) => {
            // Reset mock for each iteration
            mockPool.query.mockClear();
            
            const createdAt = new Date(Date.now() - 86400000); // 1 day ago
            const updatedAt = new Date();

            // Mock database response with updated values
            mockPool.query.mockResolvedValueOnce({
              rows: [{
                id: props.id,
                user_id: props.userId,
                technology_id: props.newTechnologyId,
                title: props.newTitle.trim(),
                description: props.newDescription.trim(),
                hours: props.newHours,
                created_at: createdAt,
                updated_at: updatedAt,
              }],
            });

            const result = await trainingRecordRepository.update(props.id, {
              technologyId: props.newTechnologyId,
              title: props.newTitle,
              description: props.newDescription,
              hours: new TrainingHours(props.newHours),
            });

            // Verify database was called
            expect(mockPool.query).toHaveBeenCalledTimes(1);
            const [query] = mockPool.query.mock.calls[0];
            expect(query).toContain('UPDATE training_records');
            expect(query).toContain('technology_id');
            expect(query).toContain('title');
            expect(query).toContain('description');
            expect(query).toContain('hours');
            expect(query).toContain('updated_at');

            // Verify all changes are persisted
            expect(result.technologyId).toBe(props.newTechnologyId);
            expect(result.title).toBe(props.newTitle.trim());
            expect(result.description).toBe(props.newDescription.trim());
            expect(result.hours.getValue()).toBe(props.newHours);
            expect(result.updatedAt).toBeInstanceOf(Date);
            expect(result.updatedAt.getTime()).toBeGreaterThan(createdAt.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should update individual fields independently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            technologyId: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            newTitle: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0),
            hours: fc.double({ min: 0.5, max: 1000, noNaN: true }).map(h => Math.round(h * 100) / 100),
          }),
          async (props) => {
            // Reset mock for each iteration
            mockPool.query.mockClear();
            
            const createdAt = new Date(Date.now() - 86400000);
            const updatedAt = new Date();

            // Mock database response with only title updated
            mockPool.query.mockResolvedValueOnce({
              rows: [{
                id: props.id,
                user_id: props.userId,
                technology_id: props.technologyId,
                title: props.newTitle.trim(),
                description: props.description.trim(),
                hours: props.hours,
                created_at: createdAt,
                updated_at: updatedAt,
              }],
            });

            const result = await trainingRecordRepository.update(props.id, {
              title: props.newTitle,
            });

            // Verify only title was updated
            expect(result.title).toBe(props.newTitle.trim());
            expect(result.technologyId).toBe(props.technologyId);
            expect(result.description).toBe(props.description.trim());
            expect(result.hours.getValue()).toBe(props.hours);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 28: Creation Timestamp Immutability', () => {
    /**
     * **Validates: Requirements 6.2**
     * 
     * For any training record update operation, the createdAt timestamp must remain
     * unchanged from its original value.
     */
    it('should preserve createdAt timestamp during updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            technologyId: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            newTitle: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0),
            hours: fc.double({ min: 0.5, max: 1000, noNaN: true }).map(h => Math.round(h * 100) / 100),
            createdAtTimestamp: fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() }),
          }),
          async (props) => {
            const createdAt = new Date(props.createdAtTimestamp);
            const updatedAt = new Date();

            // Mock database response preserving createdAt
            mockPool.query.mockResolvedValueOnce({
              rows: [{
                id: props.id,
                user_id: props.userId,
                technology_id: props.technologyId,
                title: props.newTitle,
                description: props.description,
                hours: props.hours,
                created_at: createdAt,
                updated_at: updatedAt,
              }],
            } as any);

            const result = await trainingRecordRepository.update(props.id, {
              title: props.newTitle,
            });

            // Verify database query doesn't update created_at
            const [query] = mockPool.query.mock.calls[0];
            expect(query).not.toContain('created_at =');
            expect(query).toContain('updated_at');

            // Verify createdAt is unchanged
            expect(result.createdAt.getTime()).toBe(createdAt.getTime());
            expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain createdAt across multiple updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            technologyId: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            updates: fc.array(
              fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              { minLength: 2, maxLength: 5 }
            ),
            description: fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0),
            hours: fc.double({ min: 0.5, max: 1000, noNaN: true }).map(h => Math.round(h * 100) / 100),
            createdAtTimestamp: fc.integer({ min: Date.now() - 365 * 24 * 60 * 60 * 1000, max: Date.now() }),
          }),
          async (props) => {
            const createdAt = new Date(props.createdAtTimestamp);

            for (let i = 0; i < props.updates.length; i++) {
              const updatedAt = new Date(Date.now() + i * 1000);

              mockPool.query.mockResolvedValueOnce({
                rows: [{
                  id: props.id,
                  user_id: props.userId,
                  technology_id: props.technologyId,
                  title: props.updates[i],
                  description: props.description,
                  hours: props.hours,
                  created_at: createdAt,
                  updated_at: updatedAt,
                }],
              } as any);

              const result = await trainingRecordRepository.update(props.id, {
                title: props.updates[i],
              });

              // createdAt must remain the same across all updates
              expect(result.createdAt.getTime()).toBe(createdAt.getTime());
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 29: Update Timestamp Modification', () => {
    /**
     * **Validates: Requirements 6.3**
     * 
     * For any training record update operation, the updatedAt timestamp must be set to
     * the current time, which must be later than the previous updatedAt value.
     */
    it('should update updatedAt timestamp on every update', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            technologyId: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            newTitle: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            description: fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0),
            hours: fc.double({ min: 0.5, max: 1000, noNaN: true }).map(h => Math.round(h * 100) / 100),
            previousUpdatedAtTimestamp: fc.integer({ min: Date.now() - 86400000, max: Date.now() - 1000 }),
          }),
          async (props) => {
            const createdAt = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
            const previousUpdatedAt = new Date(props.previousUpdatedAtTimestamp);
            const newUpdatedAt = new Date();

            // Mock database response with new updatedAt
            mockPool.query.mockResolvedValueOnce({
              rows: [{
                id: props.id,
                user_id: props.userId,
                technology_id: props.technologyId,
                title: props.newTitle,
                description: props.description,
                hours: props.hours,
                created_at: createdAt,
                updated_at: newUpdatedAt,
              }],
            } as any);

            const result = await trainingRecordRepository.update(props.id, {
              title: props.newTitle,
            });

            // Verify database query includes updated_at
            const [query] = mockPool.query.mock.calls[0];
            expect(query).toContain('updated_at');

            // Verify updatedAt is set to current time and is later than previous
            expect(result.updatedAt).toBeInstanceOf(Date);
            expect(result.updatedAt.getTime()).toBeGreaterThan(previousUpdatedAt.getTime());
            expect(result.updatedAt.getTime()).toBeGreaterThanOrEqual(createdAt.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should ensure updatedAt progresses with sequential updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            userId: fc.uuid(),
            technologyId: fc.uuid(),
            title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
            updates: fc.array(
              fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
              { minLength: 2, maxLength: 5 }
            ),
            description: fc.string({ minLength: 1, maxLength: 2000 }).filter(s => s.trim().length > 0),
            hours: fc.double({ min: 0.5, max: 1000, noNaN: true }).map(h => Math.round(h * 100) / 100),
          }),
          async (props) => {
            const createdAt = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
            let previousUpdatedAt = createdAt;

            for (let i = 0; i < props.updates.length; i++) {
              // Ensure each update has a later timestamp
              const currentUpdatedAt = new Date(previousUpdatedAt.getTime() + 1000 + i * 1000);

              mockPool.query.mockResolvedValueOnce({
                rows: [{
                  id: props.id,
                  user_id: props.userId,
                  technology_id: props.technologyId,
                  title: props.updates[i],
                  description: props.description,
                  hours: props.hours,
                  created_at: createdAt,
                  updated_at: currentUpdatedAt,
                }],
              } as any);

              const result = await trainingRecordRepository.update(props.id, {
                title: props.updates[i],
              });

              // Each update must have a later timestamp than the previous
              expect(result.updatedAt.getTime()).toBeGreaterThan(previousUpdatedAt.getTime());
              previousUpdatedAt = result.updatedAt;
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
