import { LoginWithCredentialsUseCase, LoginWithCredentialsDTO } from '../LoginWithCredentialsUseCase';
import { User, UserRole, AuthProvider } from '../../../../domain/entities/User';
import { Email } from '../../../../domain/value-objects/Email';
import { AuthenticationService } from '../../../../domain/services/AuthenticationService';
import { TokenManagementService } from '../../../../domain/services/TokenManagementService';
import { IUserRepository } from '../../../../domain/repositories/IUserRepository';
import { IAuditLogRepository } from '../../../../domain/repositories/IAuditLogRepository';
import { ISessionRepository, Session } from '../../../../domain/repositories/ISessionRepository';
import { AuthenticationError, ValidationError } from '../../../../shared/errors';

describe('LoginWithCredentialsUseCase', () => {
  let useCase: LoginWithCredentialsUseCase;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockAuditLogRepo: jest.Mocked<IAuditLogRepository>;
  let mockSessionRepo: jest.Mocked<ISessionRepository>;
  let authService: AuthenticationService;
  let tokenManagementService: TokenManagementService;

  let hashedPassword: string;

  const createTestUser = (overrides?: Partial<{ isActive: boolean; passwordHash: string | null; authProvider: AuthProvider }>): User => {
    return User.create({
      id: 'user-123',
      username: 'testuser',
      email: new Email('test@example.com'),
      passwordHash: overrides?.passwordHash !== undefined ? overrides.passwordHash : hashedPassword,
      role: UserRole.EMPLOYEE,
      isActive: overrides?.isActive ?? true,
      authProvider: overrides?.authProvider ?? AuthProvider.LOCAL,
    });
  };

  const createMockSession = (): Session => ({
    id: 'session-123',
    userId: 'user-123',
    tokenHash: 'hash-123',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  });

  beforeAll(async () => {
    const tempAuthService = new AuthenticationService('test-secret');
    hashedPassword = await tempAuthService.hashPassword('ValidPassword123');
  });

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
    useCase = new LoginWithCredentialsUseCase(
      mockUserRepo,
      authService,
      tokenManagementService,
      mockAuditLogRepo
    );
  });

  const validDTO: LoginWithCredentialsDTO = {
    username: 'testuser',
    password: 'ValidPassword123',
    ipAddress: '127.0.0.1',
  };

  it('should login successfully with valid credentials', async () => {
    mockUserRepo.findByUsername.mockResolvedValue(createTestUser());

    const result = await useCase.execute(validDTO);

    expect(result.token).toBeDefined();
    expect(result.user.username).toBe('testuser');
    expect(result.session).toBeDefined();
  });

  it('should create an audit log entry on successful login', async () => {
    mockUserRepo.findByUsername.mockResolvedValue(createTestUser());

    await useCase.execute(validDTO);

    expect(mockAuditLogRepo.create).toHaveBeenCalledTimes(1);
    const auditLog = mockAuditLogRepo.create.mock.calls[0][0];
    expect(auditLog.action).toBe('LOGIN');
    expect(auditLog.entityType).toBe('Session');
    expect(auditLog.userId).toBe('user-123');
  });

  it('should throw ValidationError for empty username', async () => {
    await expect(useCase.execute({ ...validDTO, username: '' }))
      .rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for empty password', async () => {
    await expect(useCase.execute({ ...validDTO, password: '' }))
      .rejects.toThrow(ValidationError);
  });

  it('should throw AuthenticationError for non-existent user', async () => {
    mockUserRepo.findByUsername.mockResolvedValue(null);

    await expect(useCase.execute(validDTO))
      .rejects.toThrow(AuthenticationError);
    await expect(useCase.execute(validDTO))
      .rejects.toThrow('Invalid credentials');
  });

  it('should throw AuthenticationError for deactivated user', async () => {
    mockUserRepo.findByUsername.mockResolvedValue(createTestUser({ isActive: false }));

    await expect(useCase.execute(validDTO))
      .rejects.toThrow(AuthenticationError);
    await expect(useCase.execute(validDTO))
      .rejects.toThrow('Account is deactivated');
  });

  it('should throw AuthenticationError for wrong password', async () => {
    mockUserRepo.findByUsername.mockResolvedValue(createTestUser());

    await expect(useCase.execute({ ...validDTO, password: 'WrongPassword' }))
      .rejects.toThrow(AuthenticationError);
    await expect(useCase.execute({ ...validDTO, password: 'WrongPassword' }))
      .rejects.toThrow('Invalid credentials');
  });

  it('should throw AuthenticationError for OAuth user without password', async () => {
    mockUserRepo.findByUsername.mockResolvedValue(
      createTestUser({ passwordHash: null, authProvider: AuthProvider.GOOGLE_OAUTH })
    );

    await expect(useCase.execute(validDTO))
      .rejects.toThrow(AuthenticationError);
  });

  it('should include IP address in audit log', async () => {
    mockUserRepo.findByUsername.mockResolvedValue(createTestUser());

    await useCase.execute({ ...validDTO, ipAddress: '192.168.1.1' });

    const auditLog = mockAuditLogRepo.create.mock.calls[0][0];
    expect(auditLog.ipAddress).toBe('192.168.1.1');
  });
});
