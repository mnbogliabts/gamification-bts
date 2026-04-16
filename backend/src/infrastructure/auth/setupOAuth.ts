/**
 * OAuth setup utility
 * Helper function to initialize and configure OAuth in Express app
 */

import { Express } from 'express';
import session from 'express-session';
import { GoogleOAuthService } from './GoogleOAuthService';
import { UserRepository } from '../database/repositories/UserRepository';
import { AuthenticationService } from '../../domain/services/AuthenticationService';

export interface OAuthSetupConfig {
  googleClientId: string;
  googleClientSecret: string;
  googleCallbackUrl: string;
  jwtSecret: string;
  sessionSecret: string;
  allowedDomain?: string;
}

/**
 * Setup OAuth authentication in Express app
 * This function configures session middleware, initializes OAuth service,
 * and sets up Passport
 * 
 * @param app Express application instance
 * @param config OAuth configuration
 * @returns GoogleOAuthService instance for use in routes
 */
export function setupOAuth(app: Express, config: OAuthSetupConfig): GoogleOAuthService {
  // Validate required configuration
  if (!config.googleClientId || !config.googleClientSecret || !config.googleCallbackUrl) {
    throw new Error('Google OAuth credentials are required');
  }

  if (!config.jwtSecret || !config.sessionSecret) {
    throw new Error('JWT and session secrets are required');
  }

  // Configure session middleware (required by Passport)
  app.use(
    session({
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Initialize services
  const userRepository = new UserRepository();
  const authService = new AuthenticationService(config.jwtSecret);

  // Create OAuth service
  const oauthService = new GoogleOAuthService(
    {
      clientID: config.googleClientId,
      clientSecret: config.googleClientSecret,
      callbackURL: config.googleCallbackUrl,
      allowedDomain: config.allowedDomain || 'bluetrailsoft.com',
    },
    userRepository,
    authService
  );

  // Initialize Passport
  const passport = oauthService.getPassport();
  app.use(passport.initialize());

  return oauthService;
}
