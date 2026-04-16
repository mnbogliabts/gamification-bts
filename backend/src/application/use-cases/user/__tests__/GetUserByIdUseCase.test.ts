import { GetUserByIdUseCase } from '../GetUserByIdUseCase';
import { User, UserRole } from '../../../../domain/entities/User';
import { Email } from '../../../../domain/value-objects/Email';
import { IUserRepository } from '../../../../domain/repositories/IUserRepository';
import { NotFoundError } from '../../../../shared/errors';

describe('GetUserByIdUseCase', () => {
  let useCase: GetUserByIdUseCase;
  let mockUserRepo: jest.Mocked<IUserRepository>;

  const testUser = User.create({
    id: 'user-123',
    username: 'testuser',
    email: new Email('test@example.com'),
    passwordHash: 'hash',
    role: UserRole.EMPLOYEE,
  });

  const testUserWithName = User.create({
    id: 'user-456',
    username: 'nameduser',
    firstName: 'Jane',
    lastName: 'Smith',
    email: new Email('jane@example.com'),
    passwordHash: 'hash',
    role: UserRole.EMPLOYEE,
  });

  beforeEach(() => {
    mockUserRepo = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue(testUser),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
      listAll: jest.fn(),
    };

    useCase = new GetUserByIdUseCase(mockUserRepo);
  });

  it('should return user when found', async () => {
    const result = await useCase.execute('user-123');

    expect(result).toBe(testUser);
    expect(mockUserRepo.findById).toHaveBeenCalledWith('user-123');
  });

  it('should throw NotFoundError when user does not exist', async () => {
    mockUserRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('nonexistent')).rejects.toThrow(NotFoundError);
    await expect(useCase.execute('nonexistent')).rejects.toThrow('User not found');
  });

  it('should return displayName derived from firstName/lastName via toJSON', async () => {
    mockUserRepo.findById.mockResolvedValue(testUserWithName);
    const result = await useCase.execute('user-456');

    const json = result.toJSON();
    expect(json.displayName).toBe('Jane Smith');
    expect(json.firstName).toBe('Jane');
    expect(json.lastName).toBe('Smith');
  });

  it('should fallback displayName to username when firstName/lastName are empty', async () => {
    const result = await useCase.execute('user-123');

    const json = result.toJSON();
    expect(json.displayName).toBe('testuser');
  });

  it('should return response DTO with displayName via executeWithDisplayName', async () => {
    mockUserRepo.findById.mockResolvedValue(testUserWithName);
    const result = await useCase.executeWithDisplayName('user-456');

    expect(result.displayName).toBe('Jane Smith');
    expect(result.firstName).toBe('Jane');
    expect(result.lastName).toBe('Smith');
    expect(result.id).toBe('user-456');
  });
});
