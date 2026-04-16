import { LoginWithGoogleOAuthUseCase, GoogleOAuthDTO } from '../LoginWithGoogleOAuthUseCase';
import { User, UserRole, AuthProvider } from '../../../../domain/entities/User';
import { Email } from '../../../../domain/value-objects/Email';
import { AuthenticationService } from '../../../../domain/services/AuthenticationService';
import { TokenManagementService } from '../../../../domain/services/TokenManagementService';
import { IUserRepository } from '../../../../domain/repositories/IUserRepository';
import { IAuditLogRepository } from '../../../../domain/repositories/IAuditLogRepository';
import { ISessionRepository, Session } from '../../../../domain/repositories/ISessionRepository';
import { AuthenticationError, ValidationError } from '../../../../shared/errors';

describe('LoginWithGoogleOAuthUseCase', () => {
  let useCase: LoginWithGoogleOAuthUseCase;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockAuditLogRepo: jest.Mocked<IAuditLogRepository>;
  let mockSessionRepo: jest.Mocked<ISessionRepository>;
  let authService: AuthenticationService;
  let tokenManagementService: TokenManagementService;

  const createTestUser = (overrides?: Partial<{ isActive: boolean; username: string }>): User => {
    return User.create({
      id: 'user-123',
      username: overrides?.username ?? 'john.doe',
      email: new Email('john.doe@bluetrailsoft.com'),
      passwordHash: null,
      role: UserRole.EMPLOYEE,
      isActive: overrides?.isActive ?? true,
      authProvider: AuthProvider.GOOGLE_OAUTH,
    });
  };

  const createMockSession = (): Session => ({
    id: 'session-123',
    userId: 'user-123',
    tokenHash: 'hash-123',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  });

  beforeEach(() => {
    mockUserRepo = {
      create: jest.fn().mockImplementation((user: User) => Promise.resolve(user)),
      findById: jest.fn(),
      findByEmail: jest.fn().mockResolvedValue(null),
      findByUsername: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
      deactivate: jest.fn(),
      listAll: jest.fn(),
    };

    mockAuditLogRepo = {
      create: jest.fn().mockImplementation((log) => Promise.resolve(log)),
      findByUserId: jest.fn(),
      findByDateRange: jest.fn(),
      findByEntityId: jest.fn(),
    };

    mockSessionRepo = {
      create: jest.fn().mockImplementation((session) => Promise.resolve(session)),
      findByTokenHash: jest.fn().mockResolvedValue(createMockSession()),
      delete: jest.fn(),
      deleteExpired: jest.fn(),
    };

    authService = new AuthenticationService('test-jwt-secret');
    tokenManagementService = new TokenManagementService(mockSessionRepo, authService);
    useCase = new LoginWithGoogleOAuthUseCase(
      mockUserRepo,
      authService,
      tokenManagementService,
      mockAuditLogRepo,
      'bluetrailsoft.com'
    );
  });

  const validDTO: GoogleOAuthDTO = {
    email: 'john.doe@bluetrailsoft.com',
    displayName: 'John Doe',
    googleId: 'google-123',
    ipAddress: '127.0.0.1',
  };

  it('should login existing user with valid @bluetrailsoft.com email', async () => {
    const existingUser = createTestUser();
    mockUserRepo.findByEmail.mockResolvedValue(existingUser);

    const result = await useCase.execute(validDTO);

    expect(result.token).toBeDefined();
    expect(result.user.username).toBe('john.doe');
    expect(result.isNewUser).toBe(false);
  });

  it('should auto-provision new user on first OAuth login', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);

    const result = await useCase.execute(validDTO);

    expect(result.isNewUser).toBe(true);
    expect(result.user.authProvider).toBe(AuthProvider.GOOGLE_OAUTH);
    expect(result.user.role).toBe(UserRole.EMPLOYEE);
    expect(mockUserRepo.create).toHaveBeenCalledTimes(1);
  });

  it('should generate unique username if username already exists', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);
    mockUserRepo.findByUsername.mockResolvedValueOnce(createTestUser());

    const result = await useCase.execute(validDTO);

    expect(result.user.username).toMatch(/^john\.doe-[0-9a-f]{8}$/);
  });

  it('should create audit log on successful login', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(createTestUser());

    await useCase.execute(validDTO);

    expect(mockAuditLogRepo.create).toHaveBeenCalledTimes(1);
    const auditLog = mockAuditLogRepo.create.mock.calls[0][0];
    expect(auditLog.action).toBe('LOGIN');
    expect(auditLog.changes).toEqual(expect.objectContaining({ method: 'google_oauth' }));
  });

  it('should throw AuthenticationError for non-bluetrailsoft.com email', async () => {
    const dto = { ...validDTO, email: 'john@gmail.com' };

    await expect(useCase.execute(dto))
      .rejects.toThrow(AuthenticationError);
    await expect(useCase.execute(dto))
      .rejects.toThrow('Email domain must be @bluetrailsoft.com');
  });

  it('should throw ValidationError for empty email', async () => {
    await expect(useCase.execute({ ...validDTO, email: '' }))
      .rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for empty display name', async () => {
    await expect(useCase.execute({ ...validDTO, displayName: '' }))
      .rejects.toThrow(ValidationError);
  });

  it('should throw AuthenticationError for deactivated user', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(createTestUser({ isActive: false }));

    await expect(useCase.execute(validDTO))
      .rejects.toThrow(AuthenticationError);
    await expect(useCase.execute(validDTO))
      .rejects.toThrow('Account is deactivated');
  });

  it('should set passwordHash to null for OAuth users', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);

    const result = await useCase.execute(validDTO);

    expect(result.user.passwordHash).toBeNull();
  });
});
