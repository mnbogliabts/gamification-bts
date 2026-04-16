import { UserRepository } from '../UserRepository';
import { User, UserRole, AuthProvider } from '../../../../domain/entities/User';
import { Email } from '../../../../domain/value-objects/Email';

// Mock the database pool
jest.mock('../../connection', () => ({
  getDatabasePool: jest.fn()
}));

import { getDatabasePool } from '../../connection';

describe('UserRepository', () => {
  let repository: UserRepository;
  let mockPool: any;

  beforeEach(() => {
    mockPool = {
      query: jest.fn()
    };

    (getDatabasePool as jest.Mock).mockReturnValue(mockPool);
    repository = new UserRepository();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a user and return the created user', async () => {
      const user = User.create({
        id: 'user-123',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        email: new Email('test@bluetrailsoft.com'),
        passwordHash: 'hashed_password',
        role: UserRole.EMPLOYEE,
        isActive: true,
        authProvider: AuthProvider.LOCAL
      });

      const mockRow = {
        id: 'user-123',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        email: 'test@bluetrailsoft.com',
        password_hash: 'hashed_password',
        role: 'EMPLOYEE',
        is_active: true,
        auth_provider: 'LOCAL',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPool.query.mockResolvedValue({ rows: [mockRow] } as any);

      const result = await repository.create(user);

      expect(result).toBeDefined();
      expect(result.id).toBe('user-123');
      expect(result.username).toBe('testuser');
      expect(result.firstName).toBe('Test');
      expect(result.lastName).toBe('User');
      expect(result.email.getValue()).toBe('test@bluetrailsoft.com');
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('findById', () => {
    it('should return a user when found', async () => {
      const mockRow = {
        id: 'user-123',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        email: 'test@bluetrailsoft.com',
        password_hash: 'hashed_password',
        role: 'EMPLOYEE',
        is_active: true,
        auth_provider: 'LOCAL',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPool.query.mockResolvedValue({ rows: [mockRow] } as any);

      const result = await repository.findById('user-123');

      expect(result).toBeDefined();
      expect(result?.id).toBe('user-123');
      expect(result?.firstName).toBe('Test');
      expect(result?.lastName).toBe('User');
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        ['user-123']
      );
    });

    it('should return null when user not found', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      const result = await repository.findById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should return a user when found by email', async () => {
      const email = new Email('test@bluetrailsoft.com');
      const mockRow = {
        id: 'user-123',
        username: 'testuser',
        first_name: 'Test',
        last_name: 'User',
        email: 'test@bluetrailsoft.com',
        password_hash: 'hashed_password',
        role: 'EMPLOYEE',
        is_active: true,
        auth_provider: 'LOCAL',
        created_at: new Date(),
        updated_at: new Date()
      };

      mockPool.query.mockResolvedValue({ rows: [mockRow] } as any);

      const result = await repository.findByEmail(email);

      expect(result).toBeDefined();
      expect(result?.email.getValue()).toBe('test@bluetrailsoft.com');
    });
  });

  describe('deactivate', () => {
    it('should deactivate a user', async () => {
      mockPool.query.mockResolvedValue({ rows: [] } as any);

      await repository.deactivate('user-123');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining(['user-123'])
      );
    });
  });

  describe('listAll', () => {
    it('should return all users', async () => {
      const mockRows = [
        {
          id: 'user-1',
          username: 'user1',
          first_name: 'First',
          last_name: 'One',
          email: 'user1@bluetrailsoft.com',
          password_hash: 'hash1',
          role: 'EMPLOYEE',
          is_active: true,
          auth_provider: 'LOCAL',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'user-2',
          username: 'user2',
          first_name: 'Second',
          last_name: 'Two',
          email: 'user2@bluetrailsoft.com',
          password_hash: 'hash2',
          role: 'ADMIN',
          is_active: true,
          auth_provider: 'LOCAL',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockPool.query.mockResolvedValue({ rows: mockRows } as any);

      const result = await repository.listAll();

      expect(result).toHaveLength(2);
      expect(result[0].username).toBe('user1');
      expect(result[1].username).toBe('user2');
    });
  });
});
