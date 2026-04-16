import { CreateUserUseCase, CreateUserDTO } from '../CreateUserUseCase';
import { User, UserRole, AuthProvider } from '../../../../domain/entities/User';
import { Email } from '../../../../domain/value-objects/Email';
import { AuthenticationService } from '../../../../domain/services/AuthenticationService';
import { IUserRepository } from '../../../../domain/repositories/IUserRepository';
import { ValidationError, ConflictError } from '../../../../shared/errors';

describe('CreateUserUseCase', () => {
  let useCase: CreateUserUseCase;
  let mockUserRepo: jest.Mocked<IUserRepository>;
  let authService: AuthenticationService;

  const createTestUser = (overrides?: Partial<{ id: string; username: string; email: string; role: UserRole }>): User => {
    return User.create({
      id: overrides?.id || 'existing-user-id',
      username: overrides?.username || 'existinguser',
      email: new Email(overrides?.email || 'existing@example.com'),
      passwordHash: 'hash',
      role: overrides?.role || UserRole.EMPLOYEE,
    });
  };

  beforeEach(() => {
    mockUserRepo = {
      create: jest.fn().mockImplementation((user: User) => Promise.resolve(user)),
      findById: jest.fn().mockResolvedValue(null),
      findByEmail: jest.fn().mockResolvedValue(null),
      findByUsername: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
      deactivate: jest.fn(),
      listAll: jest.fn(),
    };

    authService = new AuthenticationService('test-secret');
    useCase = new CreateUserUseCase(mockUserRepo, authService);
  });

  const validDTO: CreateUserDTO = {
    username: 'newuser',
    email: 'newuser@example.com',
    password: 'SecurePass123',
    role: UserRole.EMPLOYEE,
  };

  it('should create a user with valid data', async () => {
    const result = await useCase.execute(validDTO);

    expect(result).toBeDefined();
    expect(result.username).toBe('newuser');
    expect(result.email.getValue()).toBe('newuser@example.com');
    expect(result.role).toBe(UserRole.EMPLOYEE);
    expect(result.isActive).toBe(true);
    expect(result.authProvider).toBe(AuthProvider.LOCAL);
    expect(mockUserRepo.create).toHaveBeenCalledTimes(1);
  });

  it('should hash the password with bcrypt cost factor 10', async () => {
    const result = await useCase.execute(validDTO);

    expect(result.passwordHash).toBeDefined();
    expect(result.passwordHash).not.toBe(validDTO.password);
    expect(result.passwordHash!.startsWith('$2b$10$')).toBe(true);
  });

  it('should create admin users', async () => {
    const dto = { ...validDTO, role: UserRole.ADMIN };
    const result = await useCase.execute(dto);

    expect(result.role).toBe(UserRole.ADMIN);
  });

  it('should throw ValidationError for empty username', async () => {
    const dto = { ...validDTO, username: '' };
    await expect(useCase.execute(dto)).rejects.toThrow(ValidationError);
    await expect(useCase.execute(dto)).rejects.toThrow('Username is required');
  });

  it('should throw ValidationError for empty email', async () => {
    const dto = { ...validDTO, email: '' };
    await expect(useCase.execute(dto)).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for empty password', async () => {
    const dto = { ...validDTO, password: '' };
    await expect(useCase.execute(dto)).rejects.toThrow(ValidationError);
  });

  it('should throw ValidationError for invalid role', async () => {
    const dto = { ...validDTO, role: 'SUPERADMIN' as UserRole };
    await expect(useCase.execute(dto)).rejects.toThrow(ValidationError);
  });

  it('should throw error for invalid email format', async () => {
    const dto = { ...validDTO, email: 'not-an-email' };
    await expect(useCase.execute(dto)).rejects.toThrow('Invalid email format');
  });

  it('should throw ConflictError for duplicate email', async () => {
    mockUserRepo.findByEmail.mockResolvedValue(createTestUser());

    await expect(useCase.execute(validDTO)).rejects.toThrow(ConflictError);
    await expect(useCase.execute(validDTO)).rejects.toThrow('A user with this email already exists');
  });

  it('should throw ConflictError for duplicate username', async () => {
    mockUserRepo.findByUsername.mockResolvedValue(createTestUser({ username: 'newuser' }));

    await expect(useCase.execute(validDTO)).rejects.toThrow(ConflictError);
    await expect(useCase.execute(validDTO)).rejects.toThrow('A user with this username already exists');
  });

  it('should trim username before saving', async () => {
    const dto = { ...validDTO, username: '  newuser  ' };
    const result = await useCase.execute(dto);

    expect(result.username).toBe('newuser');
  });

  it('should generate a UUID for the user id', async () => {
    const result = await useCase.execute(validDTO);

    // UUID v4 format
    expect(result.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  });

  it('should create a user with optional firstName and lastName', async () => {
    const dto = { ...validDTO, firstName: 'John', lastName: 'Doe' };
    const result = await useCase.execute(dto);

    expect(result.firstName).toBe('John');
    expect(result.lastName).toBe('Doe');
    expect(result.getDisplayName()).toBe('John Doe');
  });

  it('should create a user without firstName/lastName and fallback displayName to username', async () => {
    const result = await useCase.execute(validDTO);

    expect(result.firstName).toBe('');
    expect(result.lastName).toBe('');
    expect(result.getDisplayName()).toBe('newuser');
  });

  it('should trim firstName and lastName', async () => {
    const dto = { ...validDTO, firstName: '  John  ', lastName: '  Doe  ' };
    const result = await useCase.execute(dto);

    expect(result.firstName).toBe('John');
    expect(result.lastName).toBe('Doe');
  });

  it('should throw ValidationError when firstName exceeds 100 characters', async () => {
    const dto = { ...validDTO, firstName: 'a'.repeat(101) };
    await expect(useCase.execute(dto)).rejects.toThrow(ValidationError);
    await expect(useCase.execute(dto)).rejects.toThrow('First name must not exceed 100 characters');
  });

  it('should throw ValidationError when lastName exceeds 100 characters', async () => {
    const dto = { ...validDTO, lastName: 'a'.repeat(101) };
    await expect(useCase.execute(dto)).rejects.toThrow(ValidationError);
    await expect(useCase.execute(dto)).rejects.toThrow('Last name must not exceed 100 characters');
  });

  it('should accept firstName/lastName at exactly 100 characters', async () => {
    const dto = { ...validDTO, firstName: 'a'.repeat(100), lastName: 'b'.repeat(100) };
    const result = await useCase.execute(dto);

    expect(result.firstName).toBe('a'.repeat(100));
    expect(result.lastName).toBe('b'.repeat(100));
  });
});
