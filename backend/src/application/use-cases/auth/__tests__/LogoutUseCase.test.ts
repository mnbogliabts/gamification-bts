import { LogoutUseCase, LogoutDTO } from '../LogoutUseCase';
import { TokenManagementService } from '../../../../domain/services/TokenManagementService';
import { AuthenticationService } from '../../../../domain/services/AuthenticationService';
import { IAuditLogRepository } from '../../../../domain/repositories/IAuditLogRepository';
import { ISessionRepository, Session } from '../../../../domain/repositories/ISessionRepository';
import { ValidationError } from '../../../../shared/errors';

describe('LogoutUseCase', () => {
  let useCase: LogoutUseCase;
  let mockAuditLogRepo: jest.Mocked<IAuditLogRepository>;
  let mockSessionRepo: jest.Mocked<ISessionRepository>;
  let tokenManagementService: TokenManagementService;

  const createMockSession = (): Session => ({
    id: 'session-123',
    userId: 'user-123',
    tokenHash: 'hash-123',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  });

  beforeEach(() => {
    mockAuditLogRepo = {
      create: jest.fn().mockImplementation((log) => Promise.resolve(log)),
      findByUserId: jest.fn(),
      findByDateRange: jest.fn(),
      findByEntityId: jest.fn(),
    };

    mockSessionRepo = {
      create: jest.fn(),
      findByTokenHash: jest.fn().mockResolvedValue(createMockSession()),
      delete: jest.fn(),
      deleteExpired: jest.fn(),
    };

    const authService = new AuthenticationService('test-jwt-secret');
    tokenManagementService = new TokenManagementService(mockSessionRepo, authService);
    useCase = new LogoutUseCase(tokenManagementService, mockAuditLogRepo);
  });

  const validDTO: LogoutDTO = {
    token: 'valid-jwt-token',
    userId: 'user-123',
    ipAddress: '127.0.0.1',
  };

  it('should invalidate the token on logout', async () => {
    await useCase.execute(validDTO);

    expect(mockSessionRepo.delete).toHaveBeenCalledWith('session-123');
  });

  it('should create an audit log entry on logout', async () => {
    await useCase.execute(validDTO);

    expect(mockAuditLogRepo.create).toHaveBeenCalledTimes(1);
    const auditLog = mockAuditLogRepo.create.mock.calls[0][0];
    expect(auditLog.action).toBe('LOGOUT');
    expect(auditLog.userId).toBe('user-123');
    expect(auditLog.entityType).toBe('Session');
  });

  it('should include IP address in audit log', async () => {
    await useCase.execute({ ...validDTO, ipAddress: '192.168.1.1' });

    const auditLog = mockAuditLogRepo.create.mock.calls[0][0];
    expect(auditLog.ipAddress).toBe('192.168.1.1');
  });

  it('should throw ValidationError for empty token', async () => {
    await expect(useCase.execute({ ...validDTO, token: '' }))
      .rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for empty userId', async () => {
    await expect(useCase.execute({ ...validDTO, userId: '' }))
      .rejects.toThrow(ValidationError);
  });

  it('should handle logout when session not found gracefully', async () => {
    mockSessionRepo.findByTokenHash.mockResolvedValue(null);

    // Should not throw - just logs the event
    await expect(useCase.execute(validDTO)).resolves.toBeUndefined();
    expect(mockAuditLogRepo.create).toHaveBeenCalledTimes(1);
  });
});
