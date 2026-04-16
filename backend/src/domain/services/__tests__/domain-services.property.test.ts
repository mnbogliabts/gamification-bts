import * as fc from 'fast-check';
import { AuthenticationService } from '../AuthenticationService';
import { AuthorizationService } from '../AuthorizationService';
import { User, UserRole, AuthProvider } from '../../entities/User';
import { Email } from '../../value-objects/Email';

describe('Domain Services - Property-Based Tests', () => {
  const testSecret = 'test-jwt-secret-for-property-tests';
  let authService: AuthenticationService;
  let authzService: AuthorizationService;

  beforeEach(() => {
    authService = new AuthenticationService(testSecret);
    authzService = new AuthorizationService();
  });

  describe('Property 2: Valid Credentials Create Sessions', () => {
    /**
     * **Validates: Requirements 1.1**
     * 
     * For any valid username and password combination, authentication must create
     * a session with a valid JWT token that contains the user's ID, email, and role.
     */
    it('should create valid JWT tokens for all authenticated users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 1, maxLength: 100 }),
            email: fc.emailAddress().map(email => 
              new Email(email.toLowerCase().replace(/@.*$/, '@bluetrailsoft.com'))
            ),
            password: fc.string({ minLength: 8, maxLength: 100 }),
            role: fc.constantFrom(UserRole.ADMIN, UserRole.EMPLOYEE),
            authProvider: fc.constantFrom(AuthProvider.LOCAL, AuthProvider.GOOGLE_OAUTH),
          }),
          async (userProps) => {
            // Hash the password
            const passwordHash = await authService.hashPassword(userProps.password);
            
            // Create user
            const user = User.create({
              id: userProps.id,
              username: userProps.username,
              email: userProps.email,
              passwordHash,
              role: userProps.role,
              isActive: true,
              authProvider: userProps.authProvider,
            });
            
            // Authenticate with valid credentials
            const isAuthenticated = await authService.authenticate(
              userProps.password,
              passwordHash
            );
            
            expect(isAuthenticated).toBe(true);
            
            // Generate JWT token
            const token = authService.generateJWT(user);
            
            // Token must be defined and non-empty
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.length).toBeGreaterThan(0);
            
            // Validate token and check payload
            const payload = authService.validateJWT(token);
            expect(payload).not.toBeNull();
            expect(payload?.userId).toBe(user.id);
            expect(payload?.email).toBe(user.email.getValue());
            expect(payload?.role).toBe(user.role);
            expect(payload?.authProvider).toBe(user.authProvider);
            
            // Token should have expiration set
            expect(payload?.exp).toBeDefined();
            expect(payload?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should create sessions with 24-hour expiration for all users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 1, maxLength: 100 }),
            email: fc.emailAddress().map(email => 
              new Email(email.toLowerCase().replace(/@.*$/, '@bluetrailsoft.com'))
            ),
            password: fc.string({ minLength: 8, maxLength: 100 }),
            role: fc.constantFrom(UserRole.ADMIN, UserRole.EMPLOYEE),
          }),
          async (userProps) => {
            const passwordHash = await authService.hashPassword(userProps.password);
            const user = User.create({
              ...userProps,
              passwordHash,
              isActive: true,
              authProvider: AuthProvider.LOCAL,
            });
            
            const token = authService.generateJWT(user);
            const payload = authService.validateJWT(token);
            
            expect(payload).not.toBeNull();
            
            // Calculate expected expiration (24 hours from now)
            const expectedExpiration = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
            const timeDifference = Math.abs(payload!.exp - expectedExpiration);
            
            // Allow 5 seconds difference for test execution time
            expect(timeDifference).toBeLessThan(5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Invalid Credentials Rejected', () => {
    /**
     * **Validates: Requirements 1.2**
     * 
     * For any invalid username or password combination, authentication must reject
     * the attempt and return an authentication error without creating a session.
     */
    it('should reject all invalid password attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            correctPassword: fc.string({ minLength: 8, maxLength: 100 }),
            wrongPassword: fc.string({ minLength: 1, maxLength: 100 }),
          }).filter(props => props.correctPassword !== props.wrongPassword),
          async (props) => {
            // Hash the correct password
            const passwordHash = await authService.hashPassword(props.correctPassword);
            
            // Attempt authentication with wrong password
            const isAuthenticated = await authService.authenticate(
              props.wrongPassword,
              passwordHash
            );
            
            // Authentication must fail
            expect(isAuthenticated).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    }, 30000);

    it('should reject empty passwords', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 100 }),
          async (password) => {
            const passwordHash = await authService.hashPassword(password);
            
            // Attempt authentication with empty password
            const isAuthenticated = await authService.authenticate('', passwordHash);
            
            expect(isAuthenticated).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject authentication with empty hash', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 8, maxLength: 100 }),
          async (password) => {
            // Attempt authentication with empty hash
            const isAuthenticated = await authService.authenticate(password, '');
            
            expect(isAuthenticated).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Role-Based Authorization', () => {
    /**
     * **Validates: Requirements 2.1**
     * 
     * For any authenticated user attempting to access a resource, access must be
     * granted only if the user's role meets the required permission level for that resource.
     */
    it('should grant admin access to all resources and actions', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 1, maxLength: 100 }),
            email: fc.emailAddress().map(email => 
              new Email(email.toLowerCase().replace(/@.*$/, '@bluetrailsoft.com'))
            ),
            resource: fc.string({ minLength: 1, maxLength: 50 }),
            action: fc.constantFrom('create', 'read', 'update', 'delete'),
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
            
            // Admin should have access to any resource with any action
            const hasAccess = authzService.canAccess(
              adminUser,
              props.resource,
              props.action as any
            );
            
            expect(hasAccess).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should grant employee read access only', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 1, maxLength: 100 }),
            email: fc.emailAddress().map(email => 
              new Email(email.toLowerCase().replace(/@.*$/, '@bluetrailsoft.com'))
            ),
            resource: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          (props) => {
            const employeeUser = User.create({
              id: props.id,
              username: props.username,
              email: props.email,
              passwordHash: 'hash',
              role: UserRole.EMPLOYEE,
              isActive: true,
              authProvider: AuthProvider.LOCAL,
            });
            
            // Employee should have read access
            expect(authzService.canAccess(employeeUser, props.resource, 'read')).toBe(true);
            
            // Employee should NOT have write access
            expect(authzService.canAccess(employeeUser, props.resource, 'create')).toBe(false);
            expect(authzService.canAccess(employeeUser, props.resource, 'update')).toBe(false);
            expect(authzService.canAccess(employeeUser, props.resource, 'delete')).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should deny access to inactive users regardless of role', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 1, maxLength: 100 }),
            email: fc.emailAddress().map(email => 
              new Email(email.toLowerCase().replace(/@.*$/, '@bluetrailsoft.com'))
            ),
            role: fc.constantFrom(UserRole.ADMIN, UserRole.EMPLOYEE),
            resource: fc.string({ minLength: 1, maxLength: 50 }),
            action: fc.constantFrom('create', 'read', 'update', 'delete'),
          }),
          (props) => {
            const inactiveUser = User.create({
              id: props.id,
              username: props.username,
              email: props.email,
              passwordHash: 'hash',
              role: props.role,
              isActive: false,
              authProvider: AuthProvider.LOCAL,
            });
            
            // Inactive users should have no access
            const hasAccess = authzService.canAccess(
              inactiveUser,
              props.resource,
              props.action as any
            );
            
            expect(hasAccess).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: Employee Admin Access Denial', () => {
    /**
     * **Validates: Requirements 2.2**
     * 
     * For any user with Employee role attempting to access admin-only endpoints,
     * the system must return a 403 Forbidden error and deny access.
     */
    it('should deny employee access to admin-only operations', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 1, maxLength: 100 }),
            email: fc.emailAddress().map(email => 
              new Email(email.toLowerCase().replace(/@.*$/, '@bluetrailsoft.com'))
            ),
            resource: fc.string({ minLength: 1, maxLength: 50 }),
          }),
          (props) => {
            const employeeUser = User.create({
              id: props.id,
              username: props.username,
              email: props.email,
              passwordHash: 'hash',
              role: UserRole.EMPLOYEE,
              isActive: true,
              authProvider: AuthProvider.LOCAL,
            });
            
            // Employee should not have admin role
            expect(authzService.requireRole(employeeUser, UserRole.ADMIN)).toBe(false);
            expect(authzService.isAdmin(employeeUser)).toBe(false);
            
            // Employee should not have create/update/delete access
            expect(authzService.canAccess(employeeUser, props.resource, 'create')).toBe(false);
            expect(authzService.canAccess(employeeUser, props.resource, 'update')).toBe(false);
            expect(authzService.canAccess(employeeUser, props.resource, 'delete')).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should deny employee access to other employees resources', () => {
      fc.assert(
        fc.property(
          fc.record({
            employeeId: fc.uuid(),
            otherEmployeeId: fc.uuid(),
            username: fc.string({ minLength: 1, maxLength: 100 }),
            email: fc.emailAddress().map(email => 
              new Email(email.toLowerCase().replace(/@.*$/, '@bluetrailsoft.com'))
            ),
          }).filter(props => props.employeeId !== props.otherEmployeeId),
          (props) => {
            const employeeUser = User.create({
              id: props.employeeId,
              username: props.username,
              email: props.email,
              passwordHash: 'hash',
              role: UserRole.EMPLOYEE,
              isActive: true,
              authProvider: AuthProvider.LOCAL,
            });
            
            // Employee should not have access to other employee's resources
            const hasAccess = authzService.requireOwnership(
              employeeUser,
              props.otherEmployeeId
            );
            
            expect(hasAccess).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should allow employee access only to their own resources', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            username: fc.string({ minLength: 1, maxLength: 100 }),
            email: fc.emailAddress().map(email => 
              new Email(email.toLowerCase().replace(/@.*$/, '@bluetrailsoft.com'))
            ),
          }),
          (props) => {
            const employeeUser = User.create({
              id: props.id,
              username: props.username,
              email: props.email,
              passwordHash: 'hash',
              role: UserRole.EMPLOYEE,
              isActive: true,
              authProvider: AuthProvider.LOCAL,
            });
            
            // Employee should have access to their own resources
            const hasAccess = authzService.requireOwnership(employeeUser, props.id);
            
            expect(hasAccess).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
