import { UpdateUserUseCase, UpdateUserDTO, UpdateUserContext } from '../UpdateUserUseCase';
import { User, UserRole } from '../../../../domain/entities/User';
import { Email } from '../../../../domain/value-objects/Email';
import { IUserRepository } from '../../../../domain/repositories/IUserRepository';
import { IAuditLogRepository } from '../../../../domain/repositories/IAuditLogRepository';
import { AuthenticationService } from '../../../../domain/services/AuthenticationService';
import { ValidationError, NotFoundError, ConflictError } from '../../../../shared/errors';

describe('UpdateUserUseCase', () => {
  let useCase: UpdateUserUseCase;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let mockAuditRepo: jest.Mocked<IAuditLogRepository>;
  let authService: AuthenticationService;

  const existingUser = User.create({
    id: 'user-123',
    username: 'existinguser',
    email: new Email('existing@example.com'),
    passwordHash: '$2b$10$hashedpassword',
    role: UserRole.EMPLOYEE,
  });

  const context: UpdateUserContext = {
    performedByUserId: 'admin-123',
    ipAddress: '127.0.0.1',
  };

  beforeEach(() => {
    mockUserRepo = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(existingUser),
      findByEmail: jest.fn().mockResolvedValue(null),
      findByUsername: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockImplementation((id, updates) => {
        return Promise.resolve(User.create({
          id,
          email: updates.email || existingUser.email,
          passwordHash: updates.passwordHash || existingUser.passwordHash,
          username: updates.username || existingUser.username,
          role: updates.role || existingUser.role,
        }));
      }),
      deactivate: jest.fn(),
      listAll: jest.fn(),
    };

    mockAuditRepo = {
      create: jest.fn().mockImplementation((log) => Promise.resolve(log)),
      findByUserId: jest.fn(),
      findByDateRange: jest.fn(),
      findByEntityId: jest.fn(),
    };

    authService = new AuthenticationService('test-secret');
    useCase = new UpdateUserUseCase(mockUserRepo, mockAuditRepo, authService);
  });

  it('should update username and create audit log', async () => {
    const dto: UpdateUserDTO = { username: 'updateduser' };
    await useCase.execute('user-123', dto, context);

    expect(mockUserRepo.update).toHaveBeenCalledWith('user-123', expect.objectContaining({ username: 'updateduser' }));
    expect(mockAuditRepo.create).toHaveBeenCalledTimes(1);

    const auditLog = mockAuditRepo.create.mock.calls[0][0];
    expect(auditLog.action).toBe('UPDATE');
    expect(auditLog.entityType).toBe('User');
    expect(auditLog.entityId).toBe('user-123');
    expect(auditLog.userId).toBe('admin-123');
    expect(auditLog.changes).toEqual({ username: { from: 'existinguser', to: 'updateduser' } });
  });

  it('should update email and create audit log', async () => {
    const dto: UpdateUserDTO = { email: 'newemail@example.com' };
    await useCase.execute('user-123', dto, context);

    expect(mockUserRepo.update).toHaveBeenCalledWith('user-123', expect.objectContaining({
      email: expect.any(Email),
    }));
    expect(mockAuditRepo.create).toHaveBeenCalledTimes(1);
  });

  it('should update role and create audit log', async () => {
    const dto: UpdateUserDTO = { role: UserRole.ADMIN };
    await useCase.execute('user-123', dto, context);

    expect(mockUserRepo.update).toHaveBeenCalledWith('user-123', expect.objectContaining({ role: UserRole.ADMIN }));

    const auditLog = mockAuditRepo.create.mock.calls[0][0];
    expect(auditLog.changes).toEqual({ role: { from: UserRole.EMPLOYEE, to: UserRole.ADMIN } });
  });

  it('should update password with hashing and redact in audit log', async () => {
    const dto: UpdateUserDTO = { password: 'NewSecurePass123' };
    await useCase.execute('user-123', dto, context);

    const updateCall = mockUserRepo.update.mock.calls[0][1];
    expect(updateCall.passwordHash).toBeDefined();
    expect(updateCall.passwordHash!.startsWith('$2b$10$')).toBe(true);

    const auditLog = mockAuditRepo.create.mock.calls[0][0];
    expect(auditLog.changes).toEqual({ password: { from: '[REDACTED]', to: '[REDACTED]' } });
  });

  it('should throw NotFoundError for non-existent user', async () => {
    mockUserRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent', { username: 'test' }, context)).rejects.toThrow(NotFoundError);
  });

  it('should throw ConflictError for duplicate username', async () => {
    mockUserRepo.findByUsername.mockResolvedValue(existingUser);

    await expect(useCase.execute('user-123', { username: 'taken' }, context)).rejects.toThrow(ConflictError);
  });

  it('should throw ConflictError for duplicate email', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(existingUser);

    await expect(useCase.execute('user-123', { email: 'taken@example.com' }, context)).rejects.toThrow(ConflictError);
  });

  it('should throw ValidationError for empty username', async () => {
    await expect(useCase.execute('user-123', { username: '' }, context)).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid role', async () => {
    await expect(useCase.execute('user-123', { role: 'SUPERADMIN' as UserRole }, context)).rejects.toThrow(ValidationError);
  });

  it('should return existing user if no changes are made', async () => {
    const dto: UpdateUserDTO = { username: 'existinguser' }; // same as current
    const result = await useCase.execute('user-123', dto, context);

    expect(mockUserRepo.update).not.toHaveBeenCalled();
    expect(mockAuditRepo.create).not.toHaveBeenCalled();
    expect(result).toBe(existingUser);
  });

  it('should include IP address in audit log', async () => {
    await useCase.execute('user-123', { username: 'newname' }, context);

    const auditLog = mockAuditRepo.create.mock.calls[0][0];
    expect(auditLog.ipAddress).toBe('127.0.0.1');
  });

  it('should update firstName and create audit log', async () => {
    const dto: UpdateUserDTO = { firstName: 'John' };
    await useCase.execute('user-123', dto, context);

    expect(mockUserRepo.update).toHaveBeenCalledWith('user-123', expect.objectContaining({ firstName: 'John' }));
    expect(mockAuditRepo.create).toHaveBeenCalledTimes(1);

    const auditLog = mockAuditRepo.create.mock.calls[0][0];
    expect(auditLog.changes).toEqual({ firstName: { from: '', to: 'John' } });
  });

  it('should update lastName and create audit log', async () => {
    const dto: UpdateUserDTO = { lastName: 'Doe' };
    await useCase.execute('user-123', dto, context);

    expect(mockUserRepo.update).toHaveBeenCalledWith('user-123', expect.objectContaining({ lastName: 'Doe' }));

    const auditLog = mockAuditRepo.create.mock.calls[0][0];
    expect(auditLog.changes).toEqual({ lastName: { from: '', to: 'Doe' } });
  });

  it('should update both firstName and lastName together', async () => {
    const dto: UpdateUserDTO = { firstName: 'John', lastName: 'Doe' };
    await useCase.execute('user-123', dto, context);

    expect(mockUserRepo.update).toHaveBeenCalledWith('user-123', expect.objectContaining({
      firstName: 'John',
      lastName: 'Doe',
    }));
  });

  it('should throw ValidationError when firstName exceeds 100 characters', async () => {
    const dto: UpdateUserDTO = { firstName: 'a'.repeat(101) };
    await expect(useCase.execute('user-123', dto, context)).rejects.toThrow(ValidationError);
    await expect(useCase.execute('user-123', dto, context)).rejects.toThrow('First name must not exceed 100 characters');
  });

  it('should throw ValidationError when lastName exceeds 100 characters', async () => {
    const dto: UpdateUserDTO = { lastName: 'a'.repeat(101) };
    await expect(useCase.execute('user-123', dto, context)).rejects.toThrow(ValidationError);
    await expect(useCase.execute('user-123', dto, context)).rejects.toThrow('Last name must not exceed 100 characters');
  });

  it('should not update firstName if value is unchanged', async () => {
    const dto: UpdateUserDTO = { firstName: '' }; // same as default
    const result = await useCase.execute('user-123', dto, context);

    expect(mockUserRepo.update).not.toHaveBeenCalled();
    expect(mockAuditRepo.create).not.toHaveBeenCalled();
    expect(result).toBe(existingUser);
  });
});
