/**
 * Example OAuth routes implementation
 * This file demonstrates how to integrate GoogleOAuthService with Express routes
 * 
 * To use in your application:
 * 1. Import this in your main Express app
 * 2. Initialize GoogleOAuthService with proper configuration
 * 3. Mount these routes on your Express app
 */

import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { GoogleOAuthService } from './GoogleOAuthService';
import { UserRepository } from '../database/repositories/UserRepository';
import { AuthenticationService } from '../../domain/services/AuthenticationService';

/**
 * Create OAuth routes
 * Validates: Requirements 1.3, 1.4, 1.5, 1.6
 */
export function createOAuthRoutes(): Router {
  const router = Router();

  // Initialize services
  const userRepository = new UserRepository();
  const authService = new AuthenticationService(process.env.JWT_SECRET || 'secret');
  
  const oauthService = new GoogleOAuthService(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:8000/api/auth/oauth/callback',
      allowedDomain: 'bluetrailsoft.com',
    },
    userRepository,
    authService
  );

  const passportInstance = oauthService.getPassport();

  /**
   * Initiate Google OAuth flow
   * Validates: Requirement 1.3
   */
  router.get(
    '/google',
    passportInstance.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
    })
  );

  /**
   * OAuth callback handler
   * Validates: Requirements 1.4, 1.5, 1.6
   */
  router.get(
    '/callback',
    passportInstance.authenticate('google', { 
      session: false,
      failureRedirect: '/login?error=oauth_failed'
    }),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        // The user object is attached by passport after successful authentication
        const { user, token } = req.user as any;

        // In production, you might want to redirect to frontend with token
        // For API-only, return JSON response
        res.json({
          success: true,
          token,
          user: user.toJSON(),
        });
      } catch (error) {
        next(error);
      }
    }
  );

  return router;
}

/**
 * Example usage in main Express app:
 * 
 * import express from 'express';
 * import session from 'express-session';
 * import { createOAuthRoutes } from './infrastructure/auth/oauthRoutes.example';
 * 
 * const app = express();
 * 
 * // Session middleware required by Passport
 * app.use(session({
 *   secret: process.env.SESSION_SECRET || 'session-secret',
 *   resave: false,
 *   saveUninitialized: false,
 * }));
 * 
 * // Initialize Passport
 * app.use(passport.initialize());
 * 
 * // Mount OAuth routes
 * app.use('/api/auth/oauth', createOAuthRoutes());
 * 
 * // Start server
 * app.listen(8000, () => {
 *   console.log('Server running on port 8000');
 * });
 */
