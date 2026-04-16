import { GoogleOAuthService } from '../GoogleOAuthService';
import { AuthenticationService } from '../../../domain/services/AuthenticationService';
import { User, UserRole, AuthProvider } from '../../../domain/entities/User';
import { Email } from '../../../domain/value-objects/Email';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { Profile } from 'passport-google-oauth20';

describe('GoogleOAuthService', () => {
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
    authService = new AuthenticationService('test-secret');

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

  describe('handleOAuthCallback', () => {
    it('should accept valid @bluetrailsoft.com email and return user with token', async () => {
      // Arrange
      const profile: Partial<Profile> = {
        id: 'google-123',
        displayName: 'John Doe',
        emails: [{ value: 'john.doe@bluetrailsoft.com', verified: true }],
      };

      const existingUser = User.create({
        id: 'user-123',
        username: 'john.doe',
        email: new Email('john.doe@bluetrailsoft.com'),
        passwordHash: null,
        role: UserRole.EMPLOYEE,
        authProvider: AuthProvider.GOOGLE_OAUTH,
      });

      mockUserRepository.findByEmail.mockResolvedValue(existingUser);

      // Act
      const result = await oauthService.handleOAuthCallback(profile as Profile);

      // Assert
      expect(result.user).toBe(existingUser);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
        expect.objectContaining({ value: 'john.doe@bluetrailsoft.com' })
      );
    });

    it('should reject email from non-bluetrailsoft.com domain', async () => {
      // Arrange
      const profile: Partial<Profile> = {
        id: 'google-456',
        displayName: 'Jane Smith',
        emails: [{ value: 'jane.smith@otherdomain.com', verified: true }],
      };

      // Act & Assert
      await expect(
        oauthService.handleOAuthCallback(profile as Profile)
      ).rejects.toThrow('Email domain must be @bluetrailsoft.com');
    });

    it('should auto-provision new user with valid email domain', async () => {
      // Arrange
      const profile: Partial<Profile> = {
        id: 'google-789',
        displayName: 'New User',
        emails: [{ value: 'newuser@bluetrailsoft.com', verified: true }],
      };

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(null);

      const newUser = User.create({
        id: 'new-user-id',
        username: 'newuser',
        email: new Email('newuser@bluetrailsoft.com'),
        passwordHash: null,
        role: UserRole.EMPLOYEE,
        authProvider: AuthProvider.GOOGLE_OAUTH,
      });

      mockUserRepository.create.mockResolvedValue(newUser);

      // Act
      const result = await oauthService.handleOAuthCallback(profile as Profile);

      // Assert
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(result.user.authProvider).toBe(AuthProvider.GOOGLE_OAUTH);
      expect(result.user.role).toBe(UserRole.EMPLOYEE);
      expect(result.user.passwordHash).toBeNull();
      expect(result.token).toBeDefined();
    });

    it('should reject authentication for deactivated user', async () => {
      // Arrange
      const profile: Partial<Profile> = {
        id: 'google-999',
        displayName: 'Deactivated User',
        emails: [{ value: 'deactivated@bluetrailsoft.com', verified: true }],
      };

      const deactivatedUser = User.create({
        id: 'user-999',
        username: 'deactivated',
        email: new Email('deactivated@bluetrailsoft.com'),
        passwordHash: null,
        role: UserRole.EMPLOYEE,
        isActive: false,
        authProvider: AuthProvider.GOOGLE_OAUTH,
      });

      mockUserRepository.findByEmail.mockResolvedValue(deactivatedUser);

      // Act & Assert
      await expect(
        oauthService.handleOAuthCallback(profile as Profile)
      ).rejects.toThrow('User account is deactivated');
    });

    it('should throw error when no email is provided', async () => {
      // Arrange
      const profile: Partial<Profile> = {
        id: 'google-000',
        displayName: 'No Email User',
        emails: [],
      };

      // Act & Assert
      await expect(
        oauthService.handleOAuthCallback(profile as Profile)
      ).rejects.toThrow('No email provided by OAuth provider');
    });

    it('should handle username collision by appending UUID', async () => {
      // Arrange
      const profile: Partial<Profile> = {
        id: 'google-collision',
        displayName: 'Collision User',
        emails: [{ value: 'collision@bluetrailsoft.com', verified: true }],
      };

      const existingUser = User.create({
        id: 'existing-user',
        username: 'collision',
        email: new Email('existing@bluetrailsoft.com'),
        passwordHash: 'hash',
        role: UserRole.EMPLOYEE,
      });

      mockUserRepository.findByEmail.mockResolvedValue(null);
      mockUserRepository.findByUsername.mockResolvedValue(existingUser);

      const newUser = User.create({
        id: 'new-collision-user',
        username: 'collision-12345678',
        email: new Email('collision@bluetrailsoft.com'),
        passwordHash: null,
        role: UserRole.EMPLOYEE,
        authProvider: AuthProvider.GOOGLE_OAUTH,
      });

      mockUserRepository.create.mockResolvedValue(newUser);

      // Act
      await oauthService.handleOAuthCallback(profile as Profile);

      // Assert
      expect(mockUserRepository.create).toHaveBeenCalled();
      const createCall = mockUserRepository.create.mock.calls[0][0];
      expect(createCall.username).toMatch(/^collision-[a-f0-9]{8}$/);
    });
  });

  describe('validateEmailDomain', () => {
    it('should return true for valid @bluetrailsoft.com email', () => {
      expect(oauthService.validateEmailDomain('user@bluetrailsoft.com')).toBe(true);
    });

    it('should return false for email from other domain', () => {
      expect(oauthService.validateEmailDomain('user@otherdomain.com')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(oauthService.validateEmailDomain('user@BlueTrailSoft.com')).toBe(true);
      expect(oauthService.validateEmailDomain('user@BLUETRAILSOFT.COM')).toBe(true);
    });

    it('should return false for invalid email format', () => {
      expect(oauthService.validateEmailDomain('not-an-email')).toBe(false);
      expect(oauthService.validateEmailDomain('')).toBe(false);
    });
  });
});
