import { User, UserRole } from '../entities/User';

export type ResourceAction = 'create' | 'read' | 'update' | 'delete';

export class AuthorizationService {
  /**
   * Check if user can access a resource with a specific action
   * Validates: Requirements 2.1, 2.4
   */
  canAccess(user: User, _resource: string, action: ResourceAction): boolean {
    if (!user || !user.isActive) {
      return false;
    }

    // Admins have universal access
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Employees have limited access
    if (user.role === UserRole.EMPLOYEE) {
      // Employees can only read their own data
      return action === 'read';
    }

    return false;
  }

  /**
   * Require specific role for access
   * Validates: Requirements 2.1, 2.2
   */
  requireRole(user: User, requiredRole: UserRole): boolean {
    if (!user || !user.isActive) {
      return false;
    }

    return user.role === requiredRole;
  }

  /**
   * Check if user owns a resource or is an admin
   * Validates: Requirements 2.5, 7.5
   */
  requireOwnership(user: User, resourceOwnerId: string): boolean {
    if (!user || !user.isActive) {
      return false;
    }

    // Admins can access any resource
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Employees can only access their own resources
    return user.id === resourceOwnerId;
  }

  /**
   * Check if user is an admin
   * Validates: Requirements 2.4
   */
  isAdmin(user: User): boolean {
    if (!user || !user.isActive) {
      return false;
    }

    return user.role === UserRole.ADMIN;
  }

  /**
   * Check if user is an employee
   */
  isEmployee(user: User): boolean {
    if (!user || !user.isActive) {
      return false;
    }

    return user.role === UserRole.EMPLOYEE;
  }
}
