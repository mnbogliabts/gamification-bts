import { DeactivateUserUseCase, DeactivateUserContext } from '../DeactivateUserUseCase';
import { User, UserRole } from '../../../../domain/entities/User';
import { Email } from '../../../../domain/value-objects/Email';
import { IUserRepository } from '../../../../domain/repositories/IUserRepository';
import { IAuditLogRepository } from '../../../../domain/repositories/IAuditLogRepository';
import { NotFoundError } from '../../../../shared/errors';

describe('DeactivateUserUseCase', () => {
  let useCase: DeactivateUserUseCase;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockAuditRepo: jest.Mocked<IAuditLogRepository>;

  const activeUser = User.create({
    id: 'user-123',
    username: 'activeuser',
    email: new Email('active@example.com'),
    passwordHash: 'hash',
    role: UserRole.EMPLOYEE,
    isActive: true,
  });

  const context: DeactivateUserContext = {
    performedByUserId: 'admin-123',
    ipAddress: '127.0.0.1',
  };

  beforeEach(() => {
    mockUserRepo = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(activeUser),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn().mockResolvedValue(undefined),
      listAll: jest.fn(),
    };

    mockAuditRepo = {
      create: jest.fn().mockImplementation((log) => Promise.resolve(log)),
      findByUserId: jest.fn(),
      findByDateRange: jest.fn(),
      findByEntityId: jest.fn(),
    };

    useCase = new DeactivateUserUseCase(mockUserRepo, mockAuditRepo);
  });

  it('should deactivate an existing user', async () => {
    await useCase.execute('user-123', context);

    expect(mockUserRepo.deactivate).toHaveBeenCalledWith('user-123');
  });

  it('should create an audit log entry for deactivation', async () => {
    await useCase.execute('user-123', context);

    expect(mockAuditRepo.create).toHaveBeenCalledTimes(1);

    const auditLog = mockAuditRepo.create.mock.calls[0][0];
    expect(auditLog.action).toBe('UPDATE');
    expect(auditLog.entityType).toBe('User');
    expect(auditLog.entityId).toBe('user-123');
    expect(auditLog.userId).toBe('admin-123');
    expect(auditLog.changes).toEqual({ isActive: { from: true, to: false } });
    expect(auditLog.ipAddress).toBe('127.0.0.1');
  });

  it('should throw NotFoundError for non-existent user', async () => {
    mockUserRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent', context)).rejects.toThrow(NotFoundError);
    expect(mockUserRepo.deactivate).not.toHaveBeenCalled();
    expect(mockAuditRepo.create).not.toHaveBeenCalled();
  });

  it('should work without IP address in context', async () => {
    const contextNoIp: DeactivateUserContext = { performedByUserId: 'admin-123' };
    await useCase.execute('user-123', contextNoIp);

    const auditLog = mockAuditRepo.create.mock.calls[0][0];
    expect(auditLog.ipAddress).toBeNull();
  });
});
