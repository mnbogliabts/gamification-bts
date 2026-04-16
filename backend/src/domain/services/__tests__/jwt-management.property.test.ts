import * as fc from 'fast-check';
import { TokenManagementService } from '../TokenManagementService';
import { AuthenticationService } from '../AuthenticationService';
import { ISessionRepository, Session } from '../../repositories/ISessionRepository';
import { User, UserRole, AuthProvider } from '../../entities/User';
import { Email } from '../../value-objects/Email';

describe('JWT Management - Property-Based Tests', () => {
  const testSecret = 'test-jwt-secret-for-jwt-property-tests';
  let authService: AuthenticationService;
  let mockSessionRepository: jest.Mocked<ISessionRepository>;
  let tokenManagementService: TokenManagementService;

  // Helper to create a valid user from arbitrary properties
  function createTestUser(props: {
    id: string;
    username: string;
    email: Email;
    role: UserRole;
    authProvider: AuthProvider;
  }): User {
    return User.create({
      id: props.id,
      username: props.username,
      email: props.email,
      passwordHash: 'hashed-password',
      role: props.role,
      isActive: true,
      authProvider: props.authProvider,
    });
  }

  // Reusable arbitrary for generating valid user properties
  const userPropsArb = fc.record({
    id: fc.uuid(),
    username: fc.string({ minLength: 1, maxLength: 100 }),
    email: fc.emailAddress().map(
      (email) => new Email(email.toLowerCase().replace(/@.*$/, '@bluetrailsoft.com'))
    ),
    role: fc.constantFrom(UserRole.ADMIN, UserRole.EMPLOYEE),
    authProvider: fc.constantFrom(AuthProvider.LOCAL, AuthProvider.GOOGLE_OAUTH),
  });

  beforeEach(() => {
    authService = new AuthenticationService(testSecret);
    mockSessionRepository = {
      create: jest.fn(),
      findByTokenHash: jest.fn(),
      delete: jest.fn(),
      deleteExpired: jest.fn(),
    };
    tokenManagementService = new TokenManagementService(
      mockSessionRepository,
      authService
    );
  });

  describe('Property 6: Session Expiration', () => {
    /**
     * **Validates: Requirements 1.7**
     *
     * For any session token with an expiration timestamp more than 24 hours in the past,
     * authentication attempts using that token must be rejected and require re-authentication.
     */
    it('should reject tokens whose session has expired past 24 hours', async () => {
      await fc.assert(
        fc.asyncProperty(
          userPropsArb,
          // Generate hours past expiration (between 1ms and 48 hours past)
          fc.integer({ min: 1, max: 48 * 60 * 60 * 1000 }),
          async (userProps, msPastExpiration) => {
            const user = createTestUser(userProps);
            const token = authService.generateJWT(user);
            const tokenHash = authService.hashToken(token);

            // Simulate an expired session: expiresAt is in the past
            const expiredSession: Session = {
              id: 'session-' + userProps.id,
              userId: user.id,
              tokenHash,
              expiresAt: new Date(Date.now() - msPastExpiration),
              createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
            };

            mockSessionRepository.findByTokenHash.mockResolvedValue(expiredSession);

            const payload = await tokenManagementService.validateToken(token);

            // Expired sessions must be rejected
            expect(payload).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept tokens whose session has not yet expired', async () => {
      await fc.assert(
        fc.asyncProperty(
          userPropsArb,
          // Generate time remaining until expiration (1 second to 24 hours)
          fc.integer({ min: 1000, max: 24 * 60 * 60 * 1000 }),
          async (userProps, msUntilExpiration) => {
            const user = createTestUser(userProps);
            const token = authService.generateJWT(user);
            const tokenHash = authService.hashToken(token);

            // Session that has not yet expired
            const validSession: Session = {
              id: 'session-' + userProps.id,
              userId: user.id,
              tokenHash,
              expiresAt: new Date(Date.now() + msUntilExpiration),
              createdAt: new Date(),
            };

            mockSessionRepository.findByTokenHash.mockResolvedValue(validSession);

            const payload = await tokenManagementService.validateToken(token);

            // Valid sessions must be accepted
            expect(payload).not.toBeNull();
            expect(payload.userId).toBe(user.id);
            expect(payload.email).toBe(user.email.getValue());
            expect(payload.role).toBe(user.role);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create sessions with 24-hour expiration window', async () => {
      await fc.assert(
        fc.asyncProperty(
          userPropsArb,
          async (userProps) => {
            const user = createTestUser(userProps);

            mockSessionRepository.create.mockImplementation(async (s) => s);

            const beforeCreate = Date.now();
            const { session } = await tokenManagementService.createSession(user);
            const afterCreate = Date.now();

            // Session expiration should be ~24 hours from creation
            const expectedMinExpiry = beforeCreate + 24 * 60 * 60 * 1000;
            const expectedMaxExpiry = afterCreate + 24 * 60 * 60 * 1000;

            expect(session.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry - 1000);
            expect(session.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpiry + 1000);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 7: Logout Invalidation', () => {
    /**
     * **Validates: Requirements 1.9**
     *
     * For any active session, logging out must immediately invalidate the session token
     * so that subsequent requests using that token are rejected.
     */
    it('should invalidate token on logout so subsequent validation fails', async () => {
      await fc.assert(
        fc.asyncProperty(
          userPropsArb,
          async (userProps) => {
            const user = createTestUser(userProps);

            // Create a session
            mockSessionRepository.create.mockImplementation(async (s) => s);
            const { token } = await tokenManagementService.createSession(user);
            const tokenHash = authService.hashToken(token);

            const activeSession: Session = {
              id: 'session-' + userProps.id,
              userId: user.id,
              tokenHash,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              createdAt: new Date(),
            };

            // Before logout: session exists and is valid
            mockSessionRepository.findByTokenHash.mockResolvedValue(activeSession);
            const payloadBeforeLogout = await tokenManagementService.validateToken(token);
            expect(payloadBeforeLogout).not.toBeNull();

            // Perform logout (invalidate token)
            mockSessionRepository.findByTokenHash.mockResolvedValue(activeSession);
            await tokenManagementService.invalidateToken(token);

            // Verify delete was called with the session id
            expect(mockSessionRepository.delete).toHaveBeenCalledWith(activeSession.id);

            // After logout: session no longer exists (deleted)
            mockSessionRepository.findByTokenHash.mockResolvedValue(null);
            const payloadAfterLogout = await tokenManagementService.validateToken(token);

            // Token must be rejected after logout
            expect(payloadAfterLogout).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call session repository delete for every logout regardless of user role', async () => {
      await fc.assert(
        fc.asyncProperty(
          userPropsArb,
          async (userProps) => {
            // Reset mocks for each run
            mockSessionRepository.findByTokenHash.mockReset();
            mockSessionRepository.delete.mockReset();

            const user = createTestUser(userProps);
            const token = authService.generateJWT(user);
            const tokenHash = authService.hashToken(token);

            const session: Session = {
              id: 'session-' + userProps.id,
              userId: user.id,
              tokenHash,
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
              createdAt: new Date(),
            };

            mockSessionRepository.findByTokenHash.mockResolvedValue(session);

            await tokenManagementService.invalidateToken(token);

            // Session must be deleted regardless of user role
            expect(mockSessionRepository.findByTokenHash).toHaveBeenCalledWith(tokenHash);
            expect(mockSessionRepository.delete).toHaveBeenCalledTimes(1);
            expect(mockSessionRepository.delete).toHaveBeenCalledWith(session.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle logout gracefully when session does not exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          userPropsArb,
          async (userProps) => {
            mockSessionRepository.findByTokenHash.mockReset();
            mockSessionRepository.delete.mockReset();

            const user = createTestUser(userProps);
            const token = authService.generateJWT(user);

            // Session doesn't exist (already invalidated or never created)
            mockSessionRepository.findByTokenHash.mockResolvedValue(null);

            // Should not throw
            await expect(
              tokenManagementService.invalidateToken(token)
            ).resolves.not.toThrow();

            // Delete should not be called when session doesn't exist
            expect(mockSessionRepository.delete).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
