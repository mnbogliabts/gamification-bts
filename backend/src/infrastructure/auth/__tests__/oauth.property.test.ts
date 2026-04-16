import * as fc from 'fast-check';
import { GoogleOAuthService } from '../GoogleOAuthService';
import { AuthenticationService } from '../../../domain/services/AuthenticationService';
import { User, UserRole, AuthProvider } from '../../../domain/entities/User';
import { Email } from '../../../domain/value-objects/Email';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { Profile } from 'passport-google-oauth20';

describe('OAuth - Property-Based Tests', () => {
  let oauthService: GoogleOAuthService;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let authService: AuthenticationService;

  beforeEach(() => {
    // Create mock user repository
    mockUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
      listAll: jest.fn(),
    };

    // Create real auth service
    authService = new AuthenticationService('test-jwt-secret-for-oauth-property-tests');

    // Create OAuth service
    oauthService = new GoogleOAuthService(
      {
        clientID: 'test-client-id',
        clientSecret: 'test-client-secret',
        callbackURL: 'http://localhost:8000/api/auth/oauth/callback',
        allowedDomain: 'bluetrailsoft.com',
      },
      mockUserRepository,
      authService
    );
  });

  describe('Property 4: OAuth Domain Validation', () => {
    /**
     * **Validates: Requirements 1.4, 1.5**
     * 
     * For any OAuth authentication response with an email address, the system must
     * grant access only if the email domain is @bluetrailsoft.com, and reject all other domains.
     */
    it('should accept all valid @bluetrailsoft.com emails regardless of case', () => {
      fc.assert(
        fc.property(
          fc.record({
            localPart: fc.string({ minLength: 1, maxLength: 64 })
              .filter(s => /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/.test(s) || /^[a-zA-Z0-9]$/.test(s)),
            caseVariant: fc.constantFrom(
              'bluetrailsoft.com',
              'BlueTrailSoft.com',
              'BLUETRAILSOFT.COM',
              'BlueTrailSoft.COM',
              'bluetrailsoft.COM'
            ),
          }),
          (props) => {
            const email = `${props.localPart}@${props.caseVariant}`;
            
            // Domain validation should accept all case variants
            const isValid = oauthService.validateEmailDomain(email);
            
            expect(isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject all emails from non-bluetrailsoft.com domains', () => {
      fc.assert(
        fc.property(
          fc.record({
            localPart: fc.string({ minLength: 1, maxLength: 64 })
              .filter(s => /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/.test(s) || /^[a-zA-Z0-9]$/.test(s)),
            domain: fc.domain()
              .filter(d => d.toLowerCase() !== 'bluetrailsoft.com'),
          }),
          (props) => {
            const email = `${props.localPart}@${props.domain}`;
            
            // Domain validation should reject all non-bluetrailsoft.com domains
            const isValid = oauthService.validateEmailDomain(email);
            
            expect(isValid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject OAuth callback for all non-bluetrailsoft.com emails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            googleId: fc.string({ minLength: 1, maxLength: 50 }),
            displayName: fc.string({ minLength: 1, maxLength: 100 }),
            localPart: fc.string({ minLength: 1, maxLength: 64 })
              .filter(s => /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/.test(s) || /^[a-zA-Z0-9]$/.test(s)),
            domain: fc.domain()
              .filter(d => d.toLowerCase() !== 'bluetrailsoft.com'),
          }),
          async (props) => {
            const email = `${props.localPart}@${props.domain}`;
            
            const profile: Partial<Profile> = {
              id: props.googleId,
              displayName: props.displayName,
              emails: [{ value: email, verified: true }],
            };

            // OAuth callback should reject non-bluetrailsoft.com emails
            await expect(
              oauthService.handleOAuthCallback(profile as Profile)
            ).rejects.toThrow('Email domain must be @bluetrailsoft.com');
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);

    it('should accept OAuth callback for all valid @bluetrailsoft.com emails', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            googleId: fc.string({ minLength: 1, maxLength: 50 }),
            displayName: fc.string({ minLength: 1, maxLength: 100 }),
            localPart: fc.string({ minLength: 1, maxLength: 64 })
              .filter(s => /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/.test(s) || /^[a-zA-Z0-9]$/.test(s)),
            userId: fc.uuid(),
            username: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          async (props) => {
            const email = `${props.localPart}@bluetrailsoft.com`;
            
            const profile: Partial<Profile> = {
              id: props.googleId,
              displayName: props.displayName,
              emails: [{ value: email, verified: true }],
            };

            // Mock existing user
            const existingUser = User.create({
              id: props.userId,
              username: props.username,
              email: new Email(email),
              passwordHash: null,
              role: UserRole.EMPLOYEE,
              authProvider: AuthProvider.GOOGLE_OAUTH,
            });

            mockUserRepository.findByEmail.mockResolvedValue(existingUser);

            // OAuth callback should accept bluetrailsoft.com emails
            const result = await oauthService.handleOAuthCallback(profile as Profile);
            
            expect(result.user).toBe(existingUser);
            expect(result.token).toBeDefined();
            expect(typeof result.token).toBe('string');
            expect(result.token.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);
  });

  describe('Property 5: OAuth Auto-Provisioning', () => {
    /**
     * **Validates: Requirements 1.6**
     * 
     * For any first-time OAuth user with a valid @bluetrailsoft.com email, the system
     * must automatically create a user account with the email address and OAuth provider information.
     */
    it('should auto-provision new users for all first-time OAuth logins with valid domain', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            googleId: fc.string({ minLength: 1, maxLength: 50 }),
            displayName: fc.string({ minLength: 1, maxLength: 100 }),
            localPart: fc.string({ minLength: 1, maxLength: 64 })
              .filter(s => /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/.test(s) || /^[a-zA-Z0-9]$/.test(s)),
          }),
          async (props) => {
            // Reset mocks for each property test run
            mockUserRepository.findByEmail.mockReset();
            mockUserRepository.findByUsername.mockReset();
            mockUserRepository.create.mockReset();
            
            const email = `${props.localPart}@bluetrailsoft.com`;
            
            const profile: Partial<Profile> = {
              id: props.googleId,
              displayName: props.displayName,
              emails: [{ value: email, verified: true }],
            };

            // Mock: user doesn't exist yet
            mockUserRepository.findByEmail.mockResolvedValue(null);
            mockUserRepository.findByUsername.mockResolvedValue(null);

            // Mock: create returns the new user
            mockUserRepository.create.mockImplementation(async (user: User) => user);

            // Act
            const result = await oauthService.handleOAuthCallback(profile as Profile);

            // Assert: user was created
            expect(mockUserRepository.create).toHaveBeenCalled();
            
            const createdUser = mockUserRepository.create.mock.calls[0][0];
            
            // Verify auto-provisioned user properties
            expect(createdUser.email.getValue()).toBe(email.toLowerCase());
            expect(createdUser.authProvider).toBe(AuthProvider.GOOGLE_OAUTH);
            expect(createdUser.role).toBe(UserRole.EMPLOYEE); // Default role
            expect(createdUser.passwordHash).toBeNull(); // OAuth users have no password
            expect(createdUser.isActive).toBe(true);
            expect(createdUser.username).toBeDefined();
            expect(createdUser.username.length).toBeGreaterThan(0);
            
            // Token should be generated
            expect(result.token).toBeDefined();
            expect(typeof result.token).toBe('string');
            expect(result.token.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);

    it('should not create duplicate users for existing OAuth users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            googleId: fc.string({ minLength: 1, maxLength: 50 }),
            displayName: fc.string({ minLength: 1, maxLength: 100 }),
            localPart: fc.string({ minLength: 1, maxLength: 64 })
              .filter(s => /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/.test(s) || /^[a-zA-Z0-9]$/.test(s)),
            userId: fc.uuid(),
            username: fc.string({ minLength: 1, maxLength: 100 }),
          }),
          async (props) => {
            // Reset mocks for each property test run
            mockUserRepository.findByEmail.mockReset();
            mockUserRepository.create.mockReset();
            
            const email = `${props.localPart}@bluetrailsoft.com`;
            
            const profile: Partial<Profile> = {
              id: props.googleId,
              displayName: props.displayName,
              emails: [{ value: email, verified: true }],
            };

            // Mock: user already exists
            const existingUser = User.create({
              id: props.userId,
              username: props.username,
              email: new Email(email),
              passwordHash: null,
              role: UserRole.EMPLOYEE,
              authProvider: AuthProvider.GOOGLE_OAUTH,
            });

            mockUserRepository.findByEmail.mockResolvedValue(existingUser);

            // Act
            const result = await oauthService.handleOAuthCallback(profile as Profile);

            // Assert: create should NOT be called for existing users
            expect(mockUserRepository.create).not.toHaveBeenCalled();
            expect(result.user).toBe(existingUser);
            expect(result.token).toBeDefined();
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);

    it('should generate valid username from email for all auto-provisioned users', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            googleId: fc.string({ minLength: 1, maxLength: 50 }),
            displayName: fc.string({ minLength: 1, maxLength: 100 }),
            localPart: fc.string({ minLength: 1, maxLength: 64 })
              .filter(s => /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/.test(s) || /^[a-zA-Z0-9]$/.test(s)),
          }),
          async (props) => {
            // Reset mocks for each property test run
            mockUserRepository.findByEmail.mockReset();
            mockUserRepository.findByUsername.mockReset();
            mockUserRepository.create.mockReset();
            
            const email = `${props.localPart}@bluetrailsoft.com`;
            
            const profile: Partial<Profile> = {
              id: props.googleId,
              displayName: props.displayName,
              emails: [{ value: email, verified: true }],
            };

            // Mock: user doesn't exist
            mockUserRepository.findByEmail.mockResolvedValue(null);
            mockUserRepository.findByUsername.mockResolvedValue(null);
            mockUserRepository.create.mockImplementation(async (user: User) => user);

            // Act
            await oauthService.handleOAuthCallback(profile as Profile);

            // Assert: username should be derived from email local part
            expect(mockUserRepository.create).toHaveBeenCalled();
            const createdUser = mockUserRepository.create.mock.calls[0][0];
            
            // Username should be the local part of the email (before @)
            expect(createdUser.username).toBe(props.localPart);
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);

    it('should handle username collisions by appending unique identifier', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            googleId: fc.string({ minLength: 1, maxLength: 50 }),
            displayName: fc.string({ minLength: 1, maxLength: 100 }),
            localPart: fc.string({ minLength: 1, maxLength: 64 })
              .filter(s => /^[a-zA-Z0-9][a-zA-Z0-9._-]*[a-zA-Z0-9]$/.test(s) || /^[a-zA-Z0-9]$/.test(s)),
            existingUserId: fc.uuid(),
          }),
          async (props) => {
            // Reset mocks for each property test run
            mockUserRepository.findByEmail.mockReset();
            mockUserRepository.findByUsername.mockReset();
            mockUserRepository.create.mockReset();
            
            const email = `${props.localPart}@bluetrailsoft.com`;
            
            const profile: Partial<Profile> = {
              id: props.googleId,
              displayName: props.displayName,
              emails: [{ value: email, verified: true }],
            };

            // Mock: email doesn't exist but username does
            mockUserRepository.findByEmail.mockResolvedValue(null);
            
            const existingUser = User.create({
              id: props.existingUserId,
              username: props.localPart,
              email: new Email('existing@bluetrailsoft.com'),
              passwordHash: 'hash',
              role: UserRole.EMPLOYEE,
            });
            
            mockUserRepository.findByUsername.mockResolvedValue(existingUser);
            mockUserRepository.create.mockImplementation(async (user: User) => user);

            // Act
            await oauthService.handleOAuthCallback(profile as Profile);

            // Assert: username should be modified to avoid collision
            expect(mockUserRepository.create).toHaveBeenCalled();
            const createdUser = mockUserRepository.create.mock.calls[0][0];
            
            // Username should start with the local part but have a suffix (8 hex chars)
            expect(createdUser.username).toMatch(new RegExp(`^${props.localPart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-[a-f0-9]{8}$`));
            expect(createdUser.username).not.toBe(props.localPart);
          }
        ),
        { numRuns: 50 }
      );
    }, 30000);
  });
});
