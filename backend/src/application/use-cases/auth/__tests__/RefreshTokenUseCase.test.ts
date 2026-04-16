import { RefreshTokenUseCase } from '../RefreshTokenUseCase';
import { User, UserRole, AuthProvider } from '../../../../domain/entities/User';
import { Email } from '../../../../domain/value-objects/Email';
import { AuthenticationService } from '../../../../domain/services/AuthenticationService';
import { TokenManagementService } from '../../../../domain/services/TokenManagementService';
import { IUserRepository } from '../../../../domain/repositories/IUserRepository';
import { ISessionRepository, Session } from '../../../../domain/repositories/ISessionRepository';
import { AuthenticationError, ValidationError } from '../../../../shared/errors';

describe('RefreshTokenUseCase', () => {
  let useCase: RefreshTokenUseCase;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockSessionRepo: jest.Mocked<ISessionRepository>;
  let authService: AuthenticationService;
  let tokenManagementService: TokenManagementService;

  const createTestUser = (overrides?: Partial<{ isActive: boolean }>): User => {
    return User.create({
      id: 'user-123',
      username: 'testuser',
      email: new Email('test@example.com'),
      passwordHash: 'hash',
      role: UserRole.EMPLOYEE,
      isActive: overrides?.isActive ?? true,
      authProvider: AuthProvider.LOCAL,
    });
  };

  const createMockSession = (): Session => ({
    id: 'session-123',
    userId: 'user-123',
    tokenHash: 'hash-123',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  });

  let validToken: string;

  beforeEach(() => {
    mockUserRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
      listAll: jest.fn(),
    };

    mockSessionRepo = {
      create: jest.fn().mockImplementation((session) => Promise.resolve(session)),
      findByTokenHash: jest.fn().mockResolvedValue(createMockSession()),
      delete: jest.fn(),
      deleteExpired: jest.fn(),
    };

    authService = new AuthenticationService('test-jwt-secret');
    tokenManagementService = new TokenManagementService(mockSessionRepo, authService);
    useCase = new RefreshTokenUseCase(mockUserRepo, tokenManagementService);

    // Generate a valid token for testing
    const user = createTestUser();
    validToken = authService.generateJWT(user);
  });

  it('should refresh a valid token and return new token', async () => {
    mockUserRepo.findById.mockResolvedValue(createTestUser());

    const result = await useCase.execute({ token: validToken });

    expect(result.token).toBeDefined();
    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
    expect(result.user.id).toBe('user-123');
    expect(result.session).toBeDefined();
  });

  it('should invalidate the old token when refreshing', async () => {
    mockUserRepo.findById.mockResolvedValue(createTestUser());

    await useCase.execute({ token: validToken });

    // Old session should be deleted
    expect(mockSessionRepo.delete).toHaveBeenCalled();
  });

  it('should throw ValidationError for empty token', async () => {
    await expect(useCase.execute({ token: '' }))
      .rejects.toThrow(ValidationError);
  });

  it('should throw AuthenticationError for invalid token', async () => {
    mockSessionRepo.findByTokenHash.mockResolvedValue(null);

    await expect(useCase.execute({ token: 'invalid-token' }))
      .rejects.toThrow(AuthenticationError);
    await expect(useCase.execute({ token: 'invalid-token' }))
      .rejects.toThrow('Invalid or expired token');
  });

  it('should throw AuthenticationError when user not found', async () => {
    mockUserRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute({ token: validToken }))
      .rejects.toThrow(AuthenticationError);
    await expect(useCase.execute({ token: validToken }))
      .rejects.toThrow('User not found');
  });

  it('should throw AuthenticationError for deactivated user', async () => {
    mockUserRepo.findById.mockResolvedValue(createTestUser({ isActive: false }));

    await expect(useCase.execute({ token: validToken }))
      .rejects.toThrow(AuthenticationError);
    await expect(useCase.execute({ token: validToken }))
      .rejects.toThrow('Account is deactivated');
  });
});
