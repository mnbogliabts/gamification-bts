import { TokenManagementService } from '../TokenManagementService';
import { AuthenticationService } from '../AuthenticationService';
import { ISessionRepository, Session } from '../../repositories/ISessionRepository';
import { User, UserRole, AuthProvider } from '../../entities/User';
import { Email } from '../../value-objects/Email';

describe('TokenManagementService', () => {
  let tokenManagementService: TokenManagementService;
  let mockSessionRepository: jest.Mocked<ISessionRepository>;
  let authService: AuthenticationService;
  let testUser: User;

  beforeEach(() => {
    mockSessionRepository = {
      create: jest.fn(),
      findByTokenHash: jest.fn(),
      delete: jest.fn(),
      deleteExpired: jest.fn(),
    };

    authService = new AuthenticationService('test-secret-key');
    tokenManagementService = new TokenManagementService(mockSessionRepository, authService);

    testUser = User.create({
      id: 'user-123',
      username: 'testuser',
      email: new Email('test@bluetrailsoft.com'),
      passwordHash: 'hashedpassword',
      role: UserRole.EMPLOYEE,
      isActive: true,
      authProvider: AuthProvider.LOCAL,
    });
  });

  describe('createSession', () => {
    it('should create a new session with JWT token', async () => {
      const mockSession: Session = {
        id: 'session-123',
        userId: testUser.id,
        tokenHash: 'hash123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockSessionRepository.create.mockResolvedValue(mockSession);

      const result = await tokenManagementService.createSession(testUser);

      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.session).toEqual(mockSession);
      expect(mockSessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: testUser.id,
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
          createdAt: expect.any(Date),
        })
      );
    });

    it('should set session expiration to 24 hours from now', async () => {
      const mockSession: Session = {
        id: 'session-123',
        userId: testUser.id,
        tokenHash: 'hash123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockSessionRepository.create.mockResolvedValue(mockSession);

      await tokenManagementService.createSession(testUser);

      const createCall = mockSessionRepository.create.mock.calls[0][0];
      const expiresAt = createCall.expiresAt;
      const expectedExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      // Allow 1 second tolerance for test execution time
      expect(Math.abs(expiresAt.getTime() - expectedExpiration.getTime())).toBeLessThan(1000);
    });
  });

  describe('validateToken', () => {
    it('should return payload for valid, non-blacklisted token', async () => {
      // Set up create mock first so createSession works
      mockSessionRepository.create.mockImplementation(async (s) => s);
      const { token } = await tokenManagementService.createSession(testUser);
      const tokenHash = authService.hashToken(token);

      const mockSession: Session = {
        id: 'session-123',
        userId: testUser.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockSessionRepository.findByTokenHash.mockResolvedValue(mockSession);

      const payload = await tokenManagementService.validateToken(token);

      expect(payload).not.toBeNull();
      expect(payload.userId).toBe(testUser.id);
      expect(payload.email).toBe(testUser.email.getValue());
      expect(payload.role).toBe(testUser.role);
    });

    it('should return null for blacklisted token', async () => {
      mockSessionRepository.create.mockImplementation(async (s) => s);
      const { token } = await tokenManagementService.createSession(testUser);

      mockSessionRepository.findByTokenHash.mockResolvedValue(null);

      const payload = await tokenManagementService.validateToken(token);

      expect(payload).toBeNull();
    });

    it('should return null for expired session', async () => {
      mockSessionRepository.create.mockImplementation(async (s) => s);
      const { token } = await tokenManagementService.createSession(testUser);
      const tokenHash = authService.hashToken(token);

      const expiredSession: Session = {
        id: 'session-123',
        userId: testUser.id,
        tokenHash,
        expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      };

      mockSessionRepository.findByTokenHash.mockResolvedValue(expiredSession);

      const payload = await tokenManagementService.validateToken(token);

      expect(payload).toBeNull();
    });

    it('should return null for invalid token', async () => {
      const invalidToken = 'invalid.token.here';

      const payload = await tokenManagementService.validateToken(invalidToken);

      expect(payload).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should invalidate old token and create new session', async () => {
      const oldSession: Session = {
        id: 'old-session',
        userId: testUser.id,
        tokenHash: 'old-hash',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      const newSession: Session = {
        id: 'new-session',
        userId: testUser.id,
        tokenHash: 'new-hash',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockSessionRepository.findByTokenHash.mockResolvedValue(oldSession);
      mockSessionRepository.create.mockResolvedValue(newSession);

      const oldToken = authService.generateJWT(testUser);
      const result = await tokenManagementService.refreshToken(testUser, oldToken);

      expect(result.token).toBeDefined();
      expect(result.session.id).toBe('new-session');
      expect(mockSessionRepository.delete).toHaveBeenCalledWith(oldSession.id);
      expect(mockSessionRepository.create).toHaveBeenCalled();
    });
  });

  describe('invalidateToken', () => {
    it('should delete session for given token', async () => {
      const token = authService.generateJWT(testUser);
      const tokenHash = authService.hashToken(token);

      const mockSession: Session = {
        id: 'session-123',
        userId: testUser.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockSessionRepository.findByTokenHash.mockResolvedValue(mockSession);

      await tokenManagementService.invalidateToken(token);

      expect(mockSessionRepository.findByTokenHash).toHaveBeenCalledWith(tokenHash);
      expect(mockSessionRepository.delete).toHaveBeenCalledWith(mockSession.id);
    });

    it('should handle invalidation of non-existent token gracefully', async () => {
      const token = authService.generateJWT(testUser);

      mockSessionRepository.findByTokenHash.mockResolvedValue(null);

      await expect(tokenManagementService.invalidateToken(token)).resolves.not.toThrow();
      expect(mockSessionRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should delete expired sessions and return count', async () => {
      mockSessionRepository.deleteExpired.mockResolvedValue(5);

      const deletedCount = await tokenManagementService.cleanupExpiredSessions();

      expect(deletedCount).toBe(5);
      expect(mockSessionRepository.deleteExpired).toHaveBeenCalled();
    });

    it('should return 0 when no expired sessions exist', async () => {
      mockSessionRepository.deleteExpired.mockResolvedValue(0);

      const deletedCount = await tokenManagementService.cleanupExpiredSessions();

      expect(deletedCount).toBe(0);
    });
  });
});
