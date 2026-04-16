/**
 * Integration tests for OAuth flow
 * These tests demonstrate the complete OAuth authentication flow
 * Validates: Requirements 1.3, 1.4, 1.5, 1.6
 */

import { GoogleOAuthService } from '../GoogleOAuthService';
import { AuthenticationService } from '../../../domain/services/AuthenticationService';
import { User, UserRole, AuthProvider } from '../../../domain/entities/User';
import { Email } from '../../../domain/value-objects/Email';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { Profile } from 'passport-google-oauth20';

describe('OAuth Integration Flow', () => {
  let oauthService: GoogleOAuthService;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let authService: AuthenticationService;

  beforeEach(() => {
    mockUserRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
      listAll: jest.fn(),
    };

    authService = new AuthenticationService('test-jwt-secret');

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

  describe('Complete OAuth Flow - Existing User', () => {
    it('should authenticate existing OAuth user and return valid JWT', async () => {
      // Arrange - Simulate existing OAuth user
      const existingUser = User.create({
        id: 'existing-user-123',
        username: 'john.doe',
        email: new Email('john.doe@bluetrailsoft.com'),
        passwordHash: null,
        role: UserRole.EMPLOYEE,
        authProvider: AuthProvider.GOOGLE_OAUTH,
      });

      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      const googleProfile: Partial<Profile> = {
        id: 'google-id-123',
        displayName: 'John Doe',
        emails: [{ value: 'john.doe@bluetrailsoft.com', verified: true }],
      };

      // Act - Simulate OAuth callback
      const result = await oauthService.handleOAuthCallback(googleProfile as Profile);

      // Assert - Verify user and token
      expect(result.user.id).toBe('existing-user-123');
      expect(result.user.email.getValue()).toBe('john.doe@bluetrailsoft.com');
      expect(result.user.authProvider).toBe(AuthProvider.GOOGLE_OAUTH);
      expect(result.token).toBeDefined();

      // Verify JWT token is valid
      const decodedToken = authService.validateJWT(result.token);
      expect(decodedToken).not.toBeNull();
      expect(decodedToken?.userId).toBe('existing-user-123');
      expect(decodedToken?.email).toBe('john.doe@bluetrailsoft.com');
      expect(decodedToken?.role).toBe(UserRole.EMPLOYEE);
      expect(decodedToken?.authProvider).toBe(AuthProvider.GOOGLE_OAUTH);
    });
  });

  describe('Complete OAuth Flow - New User Auto-Provisioning', () => {
    it('should create new user account for first-time OAuth login', async () => {
      // Arrange - No existing user
      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);

      const googleProfile: Partial<Profile> = {
        id: 'google-new-user',
        displayName: 'New Employee',
        emails: [{ value: 'newemployee@bluetrailsoft.com', verified: true }],
      };

      // Mock the create to return a user
      mockUserRepository.create.mockImplementation(async (user: User) => user);

      // Act - Simulate OAuth callback for new user
      const result = await oauthService.handleOAuthCallback(googleProfile as Profile);

      // Assert - Verify new user was created
      expect(mockUserRepository.create).toHaveBeenCalledTimes(1);
      
      const createdUser = mockUserRepository.create.mock.calls[0][0];
      expect(createdUser.username).toBe('newemployee');
      expect(createdUser.email.getValue()).toBe('newemployee@bluetrailsoft.com');
      expect(createdUser.passwordHash).toBeNull();
      expect(createdUser.role).toBe(UserRole.EMPLOYEE);
      expect(createdUser.authProvider).toBe(AuthProvider.GOOGLE_OAUTH);
      expect(createdUser.isActive).toBe(true);

      // Verify JWT token is valid
      expect(result.token).toBeDefined();
      const decodedToken = authService.validateJWT(result.token);
      expect(decodedToken).not.toBeNull();
      expect(decodedToken?.authProvider).toBe(AuthProvider.GOOGLE_OAUTH);
    });
  });

  describe('OAuth Domain Validation', () => {
    it('should reject OAuth login with non-bluetrailsoft.com email', async () => {
      // Arrange
      const googleProfile: Partial<Profile> = {
        id: 'google-external',
        displayName: 'External User',
        emails: [{ value: 'external@gmail.com', verified: true }],
      };

      // Act & Assert
      await expect(
        oauthService.handleOAuthCallback(googleProfile as Profile)
      ).rejects.toThrow('Email domain must be @bluetrailsoft.com');

      // Verify no user was created
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should reject OAuth login with corporate email from different company', async () => {
      // Arrange
      const googleProfile: Partial<Profile> = {
        id: 'google-competitor',
        displayName: 'Competitor Employee',
        emails: [{ value: 'employee@competitor.com', verified: true }],
      };

      // Act & Assert
      await expect(
        oauthService.handleOAuthCallback(googleProfile as Profile)
      ).rejects.toThrow('Email domain must be @bluetrailsoft.com');
    });
  });

  describe('OAuth Security Checks', () => {
    it('should reject OAuth login for deactivated user account', async () => {
      // Arrange - Deactivated user
      const deactivatedUser = User.create({
        id: 'deactivated-123',
        username: 'deactivated.user',
        email: new Email('deactivated.user@bluetrailsoft.com'),
        passwordHash: null,
        role: UserRole.EMPLOYEE,
        isActive: false,
        authProvider: AuthProvider.GOOGLE_OAUTH,
      });

      mockUserRepository.findByEmail.mockResolvedValue(deactivatedUser);

      const googleProfile: Partial<Profile> = {
        id: 'google-deactivated',
        displayName: 'Deactivated User',
        emails: [{ value: 'deactivated.user@bluetrailsoft.com', verified: true }],
      };

      // Act & Assert
      await expect(
        oauthService.handleOAuthCallback(googleProfile as Profile)
      ).rejects.toThrow('User account is deactivated');
    });

    it('should handle missing email in OAuth profile', async () => {
      // Arrange
      const googleProfile: Partial<Profile> = {
        id: 'google-no-email',
        displayName: 'No Email User',
        emails: undefined,
      };

      // Act & Assert
      await expect(
        oauthService.handleOAuthCallback(googleProfile as Profile)
      ).rejects.toThrow('No email provided by OAuth provider');
    });
  });

  describe('Username Collision Handling', () => {
    it('should append UUID suffix when username already exists', async () => {
      // Arrange - Existing user with same username
      const existingUser = User.create({
        id: 'existing-123',
        username: 'john.smith',
        email: new Email('john.smith@bluetrailsoft.com'),
        passwordHash: 'hash',
        role: UserRole.EMPLOYEE,
      });

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(existingUser);
      mockUserRepository.create.mockImplementation(async (user: User) => user);

      const googleProfile: Partial<Profile> = {
        id: 'google-john-smith-2',
        displayName: 'John Smith',
        emails: [{ value: 'john.smith2@bluetrailsoft.com', verified: true }],
      };

      // Act
      await oauthService.handleOAuthCallback(googleProfile as Profile);

      // Assert
      expect(mockUserRepository.create).toHaveBeenCalled();
      const createdUser = mockUserRepository.create.mock.calls[0][0];
      
      // Username should have UUID suffix
      expect(createdUser.username).toMatch(/^john\.smith2-[a-f0-9]{8}$/);
      expect(createdUser.username).not.toBe('john.smith2');
    });
  });
});
