import { ListUsersUseCase } from '../ListUsersUseCase';
import { User, UserRole } from '../../../../domain/entities/User';
import { Email } from '../../../../domain/value-objects/Email';
import { IUserRepository } from '../../../../domain/repositories/IUserRepository';
import { AuthorizationService } from '../../../../domain/services/AuthorizationService';
import { AuthorizationError } from '../../../../shared/errors';

describe('ListUsersUseCase', () => {
  let useCase: ListUsersUseCase;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let authorizationService: AuthorizationService;

  const adminUser = User.create({
    id: 'admin-123',
    username: 'admin',
    email: new Email('admin@example.com'),
    passwordHash: 'hash',
    role: UserRole.ADMIN,
  });

  const employeeUser = User.create({
    id: 'emp-123',
    username: 'employee',
    email: new Email('employee@example.com'),
    passwordHash: 'hash',
    role: UserRole.EMPLOYEE,
  });

  const namedUser = User.create({
    id: 'named-123',
    username: 'nameduser',
    firstName: 'Alice',
    lastName: 'Johnson',
    email: new Email('alice@example.com'),
    passwordHash: 'hash',
    role: UserRole.EMPLOYEE,
  });

  const allUsers = [adminUser, employeeUser, namedUser];

  beforeEach(() => {
    mockUserRepo = {
      create: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
      listAll: jest.fn().mockResolvedValue(allUsers),
    };

    authorizationService = new AuthorizationService();
    useCase = new ListUsersUseCase(mockUserRepo, authorizationService);
  });

  it('should return all users when requested by admin', async () => {
    const result = await useCase.execute(adminUser);

    expect(result).toEqual(allUsers);
    expect(mockUserRepo.listAll).toHaveBeenCalledTimes(1);
  });

  it('should throw AuthorizationError when requested by employee', async () => {
    await expect(useCase.execute(employeeUser)).rejects.toThrow(AuthorizationError);
    await expect(useCase.execute(employeeUser)).rejects.toThrow('Only administrators can list all users');
    expect(mockUserRepo.listAll).not.toHaveBeenCalled();
  });

  it('should throw AuthorizationError for inactive admin', async () => {
    const inactiveAdmin = User.create({
      id: 'admin-inactive',
      username: 'inactiveadmin',
      email: new Email('inactive@example.com'),
      passwordHash: 'hash',
      role: UserRole.ADMIN,
      isActive: false,
    });

    await expect(useCase.execute(inactiveAdmin)).rejects.toThrow(AuthorizationError);
  });

  it('should include displayName for each user via toJSON', async () => {
    const result = await useCase.execute(adminUser);

    const jsonResults = result.map(u => u.toJSON());
    expect(jsonResults[0].displayName).toBe('admin'); // no firstName/lastName, falls back to username
    expect(jsonResults[1].displayName).toBe('employee'); // no firstName/lastName, falls back to username
    expect(jsonResults[2].displayName).toBe('Alice Johnson'); // has firstName and lastName
  });

  it('should return response DTOs with displayName via executeWithDisplayName', async () => {
    const result = await useCase.executeWithDisplayName(adminUser);

    expect(result).toHaveLength(3);
    expect(result[0].displayName).toBe('admin');
    expect(result[2].displayName).toBe('Alice Johnson');
    expect(result[2].firstName).toBe('Alice');
    expect(result[2].lastName).toBe('Johnson');
  });
});
