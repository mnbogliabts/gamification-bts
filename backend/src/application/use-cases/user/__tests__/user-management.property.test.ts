import * as fc from 'fast-check';
import { CreateUserUseCase, CreateUserDTO } from '../CreateUserUseCase';
import { DeactivateUserUseCase } from '../DeactivateUserUseCase';
import { ListUsersUseCase } from '../ListUsersUseCase';

import { User, UserRole, AuthProvider } from '../../../../domain/entities/User';
import { Email } from '../../../../domain/value-objects/Email';
import { AuthenticationService } from '../../../../domain/services/AuthenticationService';
import { AuthorizationService } from '../../../../domain/services/AuthorizationService';
import { IUserRepository } from '../../../../domain/repositories/IUserRepository';
import { IAuditLogRepository } from '../../../../domain/repositories/IAuditLogRepository';
import { AuditLog } from '../../../../domain/entities/AuditLog';

describe('User Management - Property-Based Tests', () => {
  const testSecret = 'test-jwt-secret-for-property-tests';
  let authService: AuthenticationService;
  let authzService: AuthorizationService;

  // Reusable email arbitrary that generates valid emails
  const validEmailArb = fc.emailAddress().map(email =>
    email.toLowerCase().replace(/@.*$/, '@bluetrailsoft.com')
  );

  // Reusable username arbitrary
  const usernameArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

  // Reusable password arbitrary (non-empty)
  const passwordArb = fc.string({ minLength: 1, maxLength: 72 }).filter(s => s.length > 0);

  beforeEach(() => {
    authService = new AuthenticationService(testSecret);
    authzService = new AuthorizationService();
  });

  /**
   * Helper to create a mock user repository
   */
  function createMockUserRepo(overrides?: Partial<jest.Mocked<IUserRepository>>): jest.Mocked<IUserRepository> {
    return {
      create: jest.fn().mockImplementation((user: User) => Promise.resolve(user)),
      findById: jest.fn().mockResolvedValue(null),
      findByEmail: jest.fn().mockResolvedValue(null),
      findByUsername: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockImplementation((_id, _updates) => Promise.resolve(null)),
      deactivate: jest.fn().mockResolvedValue(undefined),
      listAll: jest.fn().mockResolvedValue([]),
      ...overrides,
    };
  }

  /**
   * Helper to create a mock audit log repository
   */
  function createMockAuditLogRepo(): jest.Mocked<IAuditLogRepository> {
    return {
      create: jest.fn().mockImplementation((log: AuditLog) => Promise.resolve(log)),
      findByUserId: jest.fn().mockResolvedValue([]),
      findByDateRange: jest.fn().mockResolvedValue([]),
      findByEntityId: jest.fn().mockResolvedValue([]),
    };
  }

  describe('Property 1: Password Hashing Security', () => {
    /**
     * **Validates: Requirements 1.8, 20.1**
     *
     * For any password stored in the system, it must be hashed using bcrypt
     * with a cost factor of at least 10, and the original plaintext password
     * must never be stored.
     */
    it('should hash all passwords with bcrypt cost factor >= 10 and never store plaintext', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            username: usernameArb,
            email: validEmailArb,
            password: passwordArb,
            role: fc.constantFrom(UserRole.ADMIN, UserRole.EMPLOYEE),
          }),
          async (props) => {
            const mockUserRepo = createMockUserRepo();
            const useCase = new CreateUserUseCase(mockUserRepo, authService);

            const dto: CreateUserDTO = {
              username: props.username,
              email: props.email,
              password: props.password,
              role: props.role,
            };

            const createdUser = await useCase.execute(dto);

            // Password hash must exist
            expect(createdUser.passwordHash).toBeDefined();
            expect(createdUser.passwordHash).not.toBeNull();

            // Plaintext password must never be stored
            expect(createdUser.passwordHash).not.toBe(props.password);

            // Hash must be a bcrypt hash (starts with $2b$)
            expect(createdUser.passwordHash!.startsWith('$2b$')).toBe(true);

            // Cost factor must be at least 10 (bcrypt format: $2b$XX$ where XX is cost)
            const costFactor = parseInt(createdUser.passwordHash!.split('$')[2], 10);
            expect(costFactor).toBeGreaterThanOrEqual(10);

            // The hash must verify against the original password
            const isValid = await authService.authenticate(props.password, createdUser.passwordHash!);
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    }, 60000);

    it('should produce different hashes for the same password (salt uniqueness)', async () => {
      await fc.assert(
        fc.asyncProperty(
          passwordArb,
          async (password) => {
            const hash1 = await authService.hashPassword(password);
            const hash2 = await authService.hashPassword(password);

            // Same password should produce different hashes due to unique salts
            expect(hash1).not.toBe(hash2);

            // Both hashes should still verify against the original password
            expect(await authService.authenticate(password, hash1)).toBe(true);
            expect(await authService.authenticate(password, hash2)).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    }, 30000);
  });

  describe('Property 11: Admin Universal Access', () => {
    /**
     * **Validates: Requirements 2.4**
     *
     * For any user with Admin role, access must be granted to all features
     * and endpoints in the system.
     */
    it('should grant admin users access to all use cases and operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            adminId: fc.uuid(),
            adminUsername: usernameArb,
            adminEmail: validEmailArb,
            targetUserId: fc.uuid(),
          }),
          async (props) => {
            const adminUser = User.create({
              id: props.adminId,
              username: props.adminUsername,
              email: new Email(props.adminEmail),
              passwordHash: 'hash',
              role: UserRole.ADMIN,
              isActive: true,
              authProvider: AuthProvider.LOCAL,
            });

            // Admin should pass all authorization checks
            expect(authzService.isAdmin(adminUser)).toBe(true);
            expect(authzService.requireRole(adminUser, UserRole.ADMIN)).toBe(true);
            expect(authzService.canAccess(adminUser, 'users', 'create')).toBe(true);
            expect(authzService.canAccess(adminUser, 'users', 'read')).toBe(true);
            expect(authzService.canAccess(adminUser, 'users', 'update')).toBe(true);
            expect(authzService.canAccess(adminUser, 'users', 'delete')).toBe(true);

            // Admin should have ownership access to any resource
            expect(authzService.requireOwnership(adminUser, props.targetUserId)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow admin to list all users via ListUsersUseCase', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            adminId: fc.uuid(),
            adminUsername: usernameArb,
            adminEmail: validEmailArb,
          }),
          async (props) => {
            const adminUser = User.create({
              id: props.adminId,
              username: props.adminUsername,
              email: new Email(props.adminEmail),
              passwordHash: 'hash',
              role: UserRole.ADMIN,
              isActive: true,
              authProvider: AuthProvider.LOCAL,
            });

            const mockUserRepo = createMockUserRepo({
              listAll: jest.fn().mockResolvedValue([adminUser]),
            });
            const listUseCase = new ListUsersUseCase(mockUserRepo, authzService);

            // Admin should be able to list users without error
            const result = await listUseCase.execute(adminUser);
            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should grant admin access to any resource regardless of resource type', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            username: usernameArb,
            email: validEmailArb.map(e => new Email(e)),
            resource: fc.string({ minLength: 1, maxLength: 100 }),
            action: fc.constantFrom('create' as const, 'read' as const, 'update' as const, 'delete' as const),
          }),
          (props) => {
            const adminUser = User.create({
              id: props.id,
              username: props.username,
              email: props.email,
              passwordHash: 'hash',
              role: UserRole.ADMIN,
              isActive: true,
              authProvider: AuthProvider.LOCAL,
            });

            expect(authzService.canAccess(adminUser, props.resource, props.action)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 16: Deactivation Prevents Authentication', () => {
    /**
     * **Validates: Requirements 3.4**
     *
     * For any user account that has been deactivated, all authentication
     * attempts using that account's credentials must be rejected.
     */
    it('should prevent deactivated users from passing authorization checks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            username: usernameArb,
            email: validEmailArb,
            password: passwordArb,
            role: fc.constantFrom(UserRole.ADMIN, UserRole.EMPLOYEE),
          }),
          async (props) => {
            const passwordHash = await authService.hashPassword(props.password);

            // Create an active user
            const activeUser = User.create({
              id: props.userId,
              username: props.username,
              email: new Email(props.email),
              passwordHash,
              role: props.role,
              isActive: true,
              authProvider: AuthProvider.LOCAL,
            });

            // Active user should pass authorization
            expect(authzService.canAccess(activeUser, 'any-resource', 'read')).toBe(true);

            // Deactivate the user
            activeUser.deactivate();
            expect(activeUser.isActive).toBe(false);

            // Deactivated user must fail all authorization checks
            expect(authzService.canAccess(activeUser, 'any-resource', 'read')).toBe(false);
            expect(authzService.canAccess(activeUser, 'any-resource', 'create')).toBe(false);
            expect(authzService.canAccess(activeUser, 'any-resource', 'update')).toBe(false);
            expect(authzService.canAccess(activeUser, 'any-resource', 'delete')).toBe(false);
            expect(authzService.isAdmin(activeUser)).toBe(false);
            expect(authzService.requireRole(activeUser, props.role)).toBe(false);
            expect(authzService.requireOwnership(activeUser, props.userId)).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    }, 60000);

    it('should reject deactivated users via DeactivateUserUseCase flow', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            adminId: fc.uuid(),
            username: usernameArb,
            email: validEmailArb,
            password: passwordArb,
            role: fc.constantFrom(UserRole.ADMIN, UserRole.EMPLOYEE),
          }),
          async (props) => {
            const passwordHash = await authService.hashPassword(props.password);

            const user = User.create({
              id: props.userId,
              username: props.username,
              email: new Email(props.email),
              passwordHash,
              role: props.role,
              isActive: true,
              authProvider: AuthProvider.LOCAL,
            });

            // Mock repo returns the user, then deactivates
            const mockUserRepo = createMockUserRepo({
              findById: jest.fn().mockResolvedValue(user),
              deactivate: jest.fn().mockImplementation(async () => {
                user.deactivate();
              }),
            });
            const mockAuditRepo = createMockAuditLogRepo();

            const deactivateUseCase = new DeactivateUserUseCase(mockUserRepo, mockAuditRepo);

            // Deactivate the user
            await deactivateUseCase.execute(props.userId, {
              performedByUserId: props.adminId,
            });

            // User should now be inactive
            expect(user.isActive).toBe(false);

            // Even though password still verifies, authorization must fail
            const passwordStillValid = await authService.authenticate(props.password, passwordHash);
            expect(passwordStillValid).toBe(true);

            // But all access checks must be denied
            expect(authzService.canAccess(user, 'any-resource', 'read')).toBe(false);
            expect(authzService.isAdmin(user)).toBe(false);
            expect(authzService.requireRole(user, props.role)).toBe(false);
          }
        ),
        { numRuns: 30 }
      );
    }, 60000);
  });
});
