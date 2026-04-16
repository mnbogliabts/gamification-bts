import { User, UserRole, AuthProvider } from '../User';
import { Email } from '../../value-objects/Email';
import { ValidationError } from '../../../shared/errors';

describe('User Entity', () => {
  describe('create', () => {
    it('should create a user with all required fields', () => {
      const email = new Email('test@bluetrailsoft.com');
      const user = User.create({
        id: '123',
        username: 'testuser',
        email,
        passwordHash: 'hashedpassword',
        role: UserRole.EMPLOYEE,
      });

      expect(user.id).toBe('123');
      expect(user.username).toBe('testuser');
      expect(user.email).toBe(email);
      expect(user.passwordHash).toBe('hashedpassword');
      expect(user.role).toBe(UserRole.EMPLOYEE);
      expect(user.isActive).toBe(true);
      expect(user.authProvider).toBe(AuthProvider.LOCAL);
      expect(user.firstName).toBe('');
      expect(user.lastName).toBe('');
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a user with firstName and lastName', () => {
      const email = new Email('test@bluetrailsoft.com');
      const user = User.create({
        id: '123',
        username: 'testuser',
        firstName: 'John',
        lastName: 'Doe',
        email,
        passwordHash: 'hash',
        role: UserRole.EMPLOYEE,
      });

      expect(user.firstName).toBe('John');
      expect(user.lastName).toBe('Doe');
    });

    it('should create a user with OAuth provider and null password', () => {
      const email = new Email('oauth@bluetrailsoft.com');
      const user = User.create({
        id: '456',
        username: 'oauthuser',
        email,
        passwordHash: null,
        role: UserRole.ADMIN,
        authProvider: AuthProvider.GOOGLE_OAUTH,
      });

      expect(user.passwordHash).toBeNull();
      expect(user.authProvider).toBe(AuthProvider.GOOGLE_OAUTH);
    });

    it('should create a user with custom timestamps', () => {
      const email = new Email('test@bluetrailsoft.com');
      const createdAt = new Date('2024-01-01');
      const updatedAt = new Date('2024-01-02');

      const user = User.create({
        id: '789',
        username: 'testuser',
        email,
        passwordHash: 'hash',
        role: UserRole.EMPLOYEE,
        createdAt,
        updatedAt,
      });

      expect(user.createdAt).toBe(createdAt);
      expect(user.updatedAt).toBe(updatedAt);
    });

    it('should create an inactive user when specified', () => {
      const email = new Email('test@bluetrailsoft.com');
      const user = User.create({
        id: '999',
        username: 'inactiveuser',
        email,
        passwordHash: 'hash',
        role: UserRole.EMPLOYEE,
        isActive: false,
      });

      expect(user.isActive).toBe(false);
    });

    it('should throw ValidationError when firstName exceeds 100 characters', () => {
      const email = new Email('test@bluetrailsoft.com');
      expect(() =>
        User.create({
          id: '123',
          username: 'testuser',
          firstName: 'a'.repeat(101),
          email,
          passwordHash: 'hash',
          role: UserRole.EMPLOYEE,
        })
      ).toThrow(ValidationError);
    });

    it('should throw ValidationError when lastName exceeds 100 characters', () => {
      const email = new Email('test@bluetrailsoft.com');
      expect(() =>
        User.create({
          id: '123',
          username: 'testuser',
          lastName: 'b'.repeat(101),
          email,
          passwordHash: 'hash',
          role: UserRole.EMPLOYEE,
        })
      ).toThrow(ValidationError);
    });

    it('should allow firstName and lastName of exactly 100 characters', () => {
      const email = new Email('test@bluetrailsoft.com');
      const user = User.create({
        id: '123',
        username: 'testuser',
        firstName: 'a'.repeat(100),
        lastName: 'b'.repeat(100),
        email,
        passwordHash: 'hash',
        role: UserRole.EMPLOYEE,
      });

      expect(user.firstName).toHaveLength(100);
      expect(user.lastName).toHaveLength(100);
    });
  });

  describe('getDisplayName', () => {
    it('should return "firstName lastName" when both are present', () => {
      const email = new Email('test@bluetrailsoft.com');
      const user = User.create({
        id: '1',
        username: 'jdoe',
        firstName: 'John',
        lastName: 'Doe',
        email,
        passwordHash: 'hash',
        role: UserRole.EMPLOYEE,
      });

      expect(user.getDisplayName()).toBe('John Doe');
    });

    it('should return firstName only when lastName is empty', () => {
      const email = new Email('test@bluetrailsoft.com');
      const user = User.create({
        id: '1',
        username: 'jdoe',
        firstName: 'John',
        email,
        passwordHash: 'hash',
        role: UserRole.EMPLOYEE,
      });

      expect(user.getDisplayName()).toBe('John');
    });

    it('should return lastName only when firstName is empty', () => {
      const email = new Email('test@bluetrailsoft.com');
      const user = User.create({
        id: '1',
        username: 'jdoe',
        lastName: 'Doe',
        email,
        passwordHash: 'hash',
        role: UserRole.EMPLOYEE,
      });

      expect(user.getDisplayName()).toBe('Doe');
    });

    it('should return username when both firstName and lastName are empty', () => {
      const email = new Email('test@bluetrailsoft.com');
      const user = User.create({
        id: '1',
        username: 'jdoe',
        email,
        passwordHash: 'hash',
        role: UserRole.EMPLOYEE,
      });

      expect(user.getDisplayName()).toBe('jdoe');
    });
  });

  describe('deactivate', () => {
    it('should deactivate an active user', () => {
      const email = new Email('test@bluetrailsoft.com');
      const user = User.create({
        id: '123',
        username: 'testuser',
        email,
        passwordHash: 'hash',
        role: UserRole.EMPLOYEE,
      });

      const originalUpdatedAt = user.updatedAt;
      
      // Wait a bit to ensure timestamp changes
      setTimeout(() => {
        user.deactivate();
        
        expect(user.isActive).toBe(false);
        expect(user.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
      }, 10);
    });
  });

  describe('updatePassword', () => {
    it('should update the password hash', () => {
      const email = new Email('test@bluetrailsoft.com');
      const user = User.create({
        id: '123',
        username: 'testuser',
        email,
        passwordHash: 'oldhash',
        role: UserRole.EMPLOYEE,
      });

      user.updatePassword('newhash');

      expect(user.passwordHash).toBe('newhash');
    });
  });

  describe('updateRole', () => {
    it('should update the user role', () => {
      const email = new Email('test@bluetrailsoft.com');
      const user = User.create({
        id: '123',
        username: 'testuser',
        email,
        passwordHash: 'hash',
        role: UserRole.EMPLOYEE,
      });

      user.updateRole(UserRole.ADMIN);

      expect(user.role).toBe(UserRole.ADMIN);
    });
  });

  describe('toJSON', () => {
    it('should serialize user to JSON with displayName and without password hash', () => {
      const email = new Email('test@bluetrailsoft.com');
      const user = User.create({
        id: '123',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        email,
        passwordHash: 'secrethash',
        role: UserRole.EMPLOYEE,
      });

      const json = user.toJSON();

      expect(json).toEqual({
        id: '123',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        displayName: 'Test User',
        email: 'test@bluetrailsoft.com',
        role: UserRole.EMPLOYEE,
        isActive: true,
        authProvider: AuthProvider.LOCAL,
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
      expect(json).not.toHaveProperty('passwordHash');
    });

    it('should use username as displayName when names are empty', () => {
      const email = new Email('test@bluetrailsoft.com');
      const user = User.create({
        id: '123',
        username: 'testuser',
        email,
        passwordHash: 'secrethash',
        role: UserRole.EMPLOYEE,
      });

      const json = user.toJSON();
      expect(json.displayName).toBe('testuser');
    });
  });
});
