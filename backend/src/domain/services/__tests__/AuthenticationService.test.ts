import { AuthenticationService } from '../AuthenticationService';
import { User, UserRole, AuthProvider } from '../../entities/User';
import { Email } from '../../value-objects/Email';
import bcrypt from 'bcrypt';

describe('AuthenticationService', () => {
  let authService: AuthenticationService;
  const testSecret = 'test-jwt-secret-key';

  beforeEach(() => {
    authService = new AuthenticationService(testSecret);
  });

  const createTestUser = (overrides?: Partial<{
    id: string;
    username: string;
    email: string;
    role: UserRole;
    authProvider: AuthProvider;
  }>): User => {
    return User.create({
      id: overrides?.id || 'user-123',
      username: overrides?.username || 'testuser',
      email: new Email(overrides?.email || 'test@bluetrailsoft.com'),
      passwordHash: 'hash',
      role: overrides?.role || UserRole.EMPLOYEE,
      isActive: true,
      authProvider: overrides?.authProvider || AuthProvider.LOCAL,
    });
  };

  describe('constructor', () => {
    it('should throw error if JWT secret is not provided', () => {
      expect(() => new AuthenticationService('')).toThrow('JWT secret is required');
    });
  });

  describe('hashPassword', () => {
    it('should hash password using bcrypt with cost factor 10', async () => {
      const password = 'testPassword123';
      const hash = await authService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.startsWith('$2b$10$')).toBe(true);
    });

    it('should throw error for empty password', async () => {
      await expect(authService.hashPassword('')).rejects.toThrow('Password cannot be empty');
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword123';
      const hash1 = await authService.hashPassword(password);
      const hash2 = await authService.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('authenticate', () => {
    it('should return true for valid password', async () => {
      const password = 'testPassword123';
      const hash = await bcrypt.hash(password, 10);

      const result = await authService.authenticate(password, hash);
      expect(result).toBe(true);
    });

    it('should return false for invalid password', async () => {
      const password = 'testPassword123';
      const hash = await bcrypt.hash(password, 10);

      const result = await authService.authenticate('wrongPassword', hash);
      expect(result).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hash = await bcrypt.hash('test', 10);
      const result = await authService.authenticate('', hash);
      expect(result).toBe(false);
    });

    it('should return false for empty hash', async () => {
      const result = await authService.authenticate('password', '');
      expect(result).toBe(false);
    });
  });

  describe('generateJWT', () => {
    it('should generate valid JWT token with correct payload', () => {
      const user = createTestUser();

      const token = authService.generateJWT(user);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should include user information in token payload', () => {
      const user = createTestUser({
        id: 'user-123',
        username: 'testuser',
        email: 'test@bluetrailsoft.com',
        role: UserRole.ADMIN,
        authProvider: AuthProvider.GOOGLE_OAUTH,
      });

      const token = authService.generateJWT(user);
      const payload = authService.validateJWT(token);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(user.id);
      expect(payload?.email).toBe(user.email.getValue());
      expect(payload?.role).toBe(user.role);
      expect(payload?.authProvider).toBe(user.authProvider);
    });

    it('should set expiration to 24 hours from now', () => {
      const user = createTestUser();

      const token = authService.generateJWT(user);
      const payload = authService.validateJWT(token);

      expect(payload).not.toBeNull();
      
      const expectedExpiration = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
      const timeDifference = Math.abs(payload!.exp - expectedExpiration);
      
      // Allow 5 seconds difference for test execution time
      expect(timeDifference).toBeLessThan(5);
    });
  });

  describe('validateJWT', () => {
    it('should validate and decode valid token', () => {
      const user = createTestUser();

      const token = authService.generateJWT(user);
      const payload = authService.validateJWT(token);

      expect(payload).not.toBeNull();
      expect(payload?.userId).toBe(user.id);
    });

    it('should return null for invalid token', () => {
      const payload = authService.validateJWT('invalid.token.here');
      expect(payload).toBeNull();
    });

    it('should return null for token with wrong secret', () => {
      const otherService = new AuthenticationService('different-secret');
      const user = createTestUser();

      const token = otherService.generateJWT(user);
      const payload = authService.validateJWT(token);

      expect(payload).toBeNull();
    });

    it('should return null for empty token', () => {
      const payload = authService.validateJWT('');
      expect(payload).toBeNull();
    });
  });

  describe('validateOAuthDomain', () => {
    it('should return true for valid bluetrailsoft.com email', () => {
      const result = authService.validateOAuthDomain('user@bluetrailsoft.com');
      expect(result).toBe(true);
    });

    it('should return false for invalid domain', () => {
      const result = authService.validateOAuthDomain('user@gmail.com');
      expect(result).toBe(false);
    });

    it('should be case insensitive', () => {
      const result1 = authService.validateOAuthDomain('user@BLUETRAILSOFT.COM');
      const result2 = authService.validateOAuthDomain('user@BlueTrailSoft.com');
      
      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it('should return false for email without @ symbol', () => {
      const result = authService.validateOAuthDomain('userbluetrailsoft.com');
      expect(result).toBe(false);
    });

    it('should return false for empty email', () => {
      const result = authService.validateOAuthDomain('');
      expect(result).toBe(false);
    });

    it('should support custom domain validation', () => {
      const result = authService.validateOAuthDomain('user@example.com', 'example.com');
      expect(result).toBe(true);
    });
  });
});
