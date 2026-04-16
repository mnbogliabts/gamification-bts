import { Request, Response, NextFunction } from 'express';
import { AuthenticationError } from '../../shared/errors';
import { TokenManagementService } from '../../domain/services/TokenManagementService';
import { JWTPayload } from '../../domain/services/AuthenticationService';

/**
 * Helper to get the typed user payload from a request.
 * Use this in route handlers: const user = getAuthUser(req);
 */
export function getAuthUser(req: Request): JWTPayload {
  const user = (req as any).__jwtPayload as JWTPayload | undefined;
  if (!user) {
    throw new AuthenticationError('Authentication required');
  }
  return user;
}

/**
 * Authentication middleware factory.
 * Extracts Bearer token from Authorization header, validates it via TokenManagementService,
 * and attaches the decoded payload to the request.
 * Requirements: 1.1, 1.7
 */
export function createAuthenticateMiddleware(tokenService: TokenManagementService) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        throw new AuthenticationError('No authorization header provided');
      }

      if (!authHeader.startsWith('Bearer ')) {
        throw new AuthenticationError('Invalid authorization format. Expected: Bearer <token>');
      }

      const token = authHeader.slice(7);

      if (!token) {
        throw new AuthenticationError('No token provided');
      }

      const payload = await tokenService.validateToken(token);

      if (!payload) {
        throw new AuthenticationError('Invalid or expired token');
      }

      // Store JWT payload on request — use a private property to avoid passport type conflicts
      (req as any).__jwtPayload = payload as JWTPayload;
      // Also set req.user for compatibility with downstream middleware
      (req as any).user = payload as JWTPayload;
      next();
    } catch (error) {
      if (error instanceof AuthenticationError) {
        next(error);
      } else {
        next(new AuthenticationError('Authentication failed'));
      }
    }
  };
}
