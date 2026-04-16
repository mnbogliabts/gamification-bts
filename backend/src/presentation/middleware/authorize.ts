import { Request, Response, NextFunction } from 'express';
import { AuthenticationError, AuthorizationError } from '../../shared/errors';
import { UserRole } from '../../domain/entities/User';
import { JWTPayload } from '../../domain/services/AuthenticationService';

/**
 * Get the JWT payload from the request (set by authenticate middleware).
 */
function getUserPayload(req: Request): JWTPayload | undefined {
  return (req as any).__jwtPayload ?? (req as any).user;
}

/**
 * Middleware that requires the authenticated user to have a specific role.
 * Must be used after the authenticate middleware.
 * Requirements: 2.1, 2.2
 */
export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = getUserPayload(req);

    if (!user) {
      next(new AuthenticationError('Authentication required'));
      return;
    }

    if (!roles.includes(user.role)) {
      next(new AuthorizationError('Insufficient permissions'));
      return;
    }

    next();
  };
}

/**
 * Middleware that allows access if the user is an admin OR owns the resource.
 * Accepts a function that extracts the resource owner's userId from the request.
 * Must be used after the authenticate middleware.
 * Requirements: 2.4, 2.5
 */
export function requireOwnershipOrAdmin(
  getResourceUserId: (req: Request) => Promise<string>
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = getUserPayload(req);

      if (!user) {
        next(new AuthenticationError('Authentication required'));
        return;
      }

      // Admins always have access
      if (user.role === UserRole.ADMIN) {
        next();
        return;
      }

      const resourceUserId = await getResourceUserId(req);

      if (user.userId === resourceUserId) {
        next();
        return;
      }

      next(new AuthorizationError('Access denied. You can only access your own resources.'));
    } catch (error) {
      if (error instanceof AuthorizationError || error instanceof AuthenticationError) {
        next(error);
      } else {
        next(new AuthorizationError('Unable to verify resource ownership'));
      }
    }
  };
}
