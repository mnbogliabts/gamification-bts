import { AuthorizationService } from '../AuthorizationService';
import { User, UserRole, AuthProvider } from '../../entities/User';
import { Email } from '../../value-objects/Email';

describe('AuthorizationService', () => {
  let authzService: AuthorizationService;
  let adminUser: User;
  let employeeUser: User;
  let inactiveUser: User;

  beforeEach(() => {
    authzService = new AuthorizationService();

    adminUser = User.create({
      id: 'admin-123',
      username: 'admin',
      email: new Email('admin@bluetrailsoft.com'),
      passwordHash: 'hash',
      role: UserRole.ADMIN,
      isActive: true,
      authProvider: AuthProvider.LOCAL,
    });

    employeeUser = User.create({
      id: 'employee-123',
      username: 'employee',
      email: new Email('employee@bluetrailsoft.com'),
      passwordHash: 'hash',
      role: UserRole.EMPLOYEE,
      isActive: true,
      authProvider: AuthProvider.LOCAL,
    });

    inactiveUser = User.create({
      id: 'inactive-123',
      username: 'inactive',
      email: new Email('inactive@bluetrailsoft.com'),
      passwordHash: 'hash',
      role: UserRole.EMPLOYEE,
      isActive: false,
      authProvider: AuthProvider.LOCAL,
    });
  });

  describe('canAccess', () => {
    it('should grant admin access to any resource with any action', () => {
      expect(authzService.canAccess(adminUser, 'training-record', 'create')).toBe(true);
      expect(authzService.canAccess(adminUser, 'training-record', 'read')).toBe(true);
      expect(authzService.canAccess(adminUser, 'training-record', 'update')).toBe(true);
      expect(authzService.canAccess(adminUser, 'training-record', 'delete')).toBe(true);
    });

    it('should grant employee read access only', () => {
      expect(authzService.canAccess(employeeUser, 'training-record', 'read')).toBe(true);
      expect(authzService.canAccess(employeeUser, 'training-record', 'create')).toBe(false);
      expect(authzService.canAccess(employeeUser, 'training-record', 'update')).toBe(false);
      expect(authzService.canAccess(employeeUser, 'training-record', 'delete')).toBe(false);
    });

    it('should deny access to inactive users', () => {
      expect(authzService.canAccess(inactiveUser, 'training-record', 'read')).toBe(false);
      expect(authzService.canAccess(inactiveUser, 'training-record', 'create')).toBe(false);
    });

    it('should deny access to null user', () => {
      expect(authzService.canAccess(null as any, 'training-record', 'read')).toBe(false);
    });
  });

  describe('requireRole', () => {
    it('should return true when user has required role', () => {
      expect(authzService.requireRole(adminUser, UserRole.ADMIN)).toBe(true);
      expect(authzService.requireRole(employeeUser, UserRole.EMPLOYEE)).toBe(true);
    });

    it('should return false when user does not have required role', () => {
      expect(authzService.requireRole(adminUser, UserRole.EMPLOYEE)).toBe(false);
      expect(authzService.requireRole(employeeUser, UserRole.ADMIN)).toBe(false);
    });

    it('should return false for inactive users', () => {
      expect(authzService.requireRole(inactiveUser, UserRole.EMPLOYEE)).toBe(false);
    });

    it('should return false for null user', () => {
      expect(authzService.requireRole(null as any, UserRole.ADMIN)).toBe(false);
    });
  });

  describe('requireOwnership', () => {
    it('should grant admin access to any resource', () => {
      expect(authzService.requireOwnership(adminUser, 'other-user-id')).toBe(true);
      expect(authzService.requireOwnership(adminUser, 'employee-123')).toBe(true);
    });

    it('should grant employee access to their own resources', () => {
      expect(authzService.requireOwnership(employeeUser, 'employee-123')).toBe(true);
    });

    it('should deny employee access to other users resources', () => {
      expect(authzService.requireOwnership(employeeUser, 'other-user-id')).toBe(false);
      expect(authzService.requireOwnership(employeeUser, 'admin-123')).toBe(false);
    });

    it('should deny access to inactive users', () => {
      expect(authzService.requireOwnership(inactiveUser, 'inactive-123')).toBe(false);
    });

    it('should deny access to null user', () => {
      expect(authzService.requireOwnership(null as any, 'some-id')).toBe(false);
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin users', () => {
      expect(authzService.isAdmin(adminUser)).toBe(true);
    });

    it('should return false for employee users', () => {
      expect(authzService.isAdmin(employeeUser)).toBe(false);
    });

    it('should return false for inactive admin users', () => {
      const inactiveAdmin = User.create({
        id: 'admin-inactive',
        username: 'admin',
        email: new Email('admin@bluetrailsoft.com'),
        passwordHash: 'hash',
        role: UserRole.ADMIN,
        isActive: false,
        authProvider: AuthProvider.LOCAL,
      });
      expect(authzService.isAdmin(inactiveAdmin)).toBe(false);
    });

    it('should return false for null user', () => {
      expect(authzService.isAdmin(null as any)).toBe(false);
    });
  });

  describe('isEmployee', () => {
    it('should return true for employee users', () => {
      expect(authzService.isEmployee(employeeUser)).toBe(true);
    });

    it('should return false for admin users', () => {
      expect(authzService.isEmployee(adminUser)).toBe(false);
    });

    it('should return false for inactive employee users', () => {
      expect(authzService.isEmployee(inactiveUser)).toBe(false);
    });

    it('should return false for null user', () => {
      expect(authzService.isEmployee(null as any)).toBe(false);
    });
  });
});
