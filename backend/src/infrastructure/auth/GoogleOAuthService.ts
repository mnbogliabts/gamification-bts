import passport from 'passport';
import { Strategy as GoogleStrategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { User, AuthProvider, UserRole } from '../../domain/entities/User';
import { Email } from '../../domain/value-objects/Email';
import { IUserRepository } from '../../domain/repositories/IUserRepository';
import { AuthenticationService } from '../../domain/services/AuthenticationService';
import { v4 as uuidv4 } from 'uuid';

export interface GoogleOAuthConfig {
  clientID: string;
  clientSecret: string;
  callbackURL: string;
  allowedDomain: string;
}

export interface OAuthUserInfo {
  email: string;
  displayName: string;
  googleId: string;
}

/**
 * Google OAuth 2.0 integration service
 * Validates: Requirements 1.3, 1.4, 1.5, 1.6
 */
export class GoogleOAuthService {
  private readonly config: GoogleOAuthConfig;
  private readonly userRepository: IUserRepository;
  private readonly authService: AuthenticationService;

  constructor(
    config: GoogleOAuthConfig,
    userRepository: IUserRepository,
    authService: AuthenticationService
  ) {
    this.config = config;
    this.userRepository = userRepository;
    this.authService = authService;
    this.configurePassport();
  }

  /**
   * Configure Passport with Google OAuth strategy
   * Validates: Requirements 1.3
   */
  private configurePassport(): void {
    passport.use(
      new GoogleStrategy(
        {
          clientID: this.config.clientID,
          clientSecret: this.config.clientSecret,
          callbackURL: this.config.callbackURL,
        },
        async (
          _accessToken: string,
          _refreshToken: string,
          profile: Profile,
          done: VerifyCallback
        ) => {
          try {
            const result = await this.handleOAuthCallback(profile);
            done(null, result);
          } catch (error) {
            done(error as Error, undefined);
          }
        }
      )
    );

    passport.serializeUser((user: any, done) => {
      done(null, user);
    });

    passport.deserializeUser((user: any, done) => {
      done(null, user);
    });
  }

  /**
   * Handle OAuth callback and validate domain
   * Validates: Requirements 1.4, 1.5, 1.6
   */
  async handleOAuthCallback(profile: Profile): Promise<{ user: User; token: string }> {
    // Extract email from profile
    const email = profile.emails?.[0]?.value;
    if (!email) {
      throw new Error('No email provided by OAuth provider');
    }

    // Validate email domain (Requirement 1.4, 1.5)
    if (!this.authService.validateOAuthDomain(email, this.config.allowedDomain)) {
      throw new Error(`Email domain must be @${this.config.allowedDomain}`);
    }

    // Check if user exists
    const emailObj = new Email(email);
    let user = await this.userRepository.findByEmail(emailObj);

    // Auto-provision new user (Requirement 1.6)
    if (!user) {
      user = await this.provisionOAuthUser({
        email,
        displayName: profile.displayName || email.split('@')[0],
        googleId: profile.id,
      });
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('User account is deactivated');
    }

    // Generate JWT token
    const token = this.authService.generateJWT(user);

    return { user, token };
  }

  /**
   * Auto-provision a new OAuth user
   * Validates: Requirements 1.6
   */
  private async provisionOAuthUser(userInfo: OAuthUserInfo): Promise<User> {
    const emailObj = new Email(userInfo.email);
    
    // Generate username from email (before @ symbol)
    let username = userInfo.email.split('@')[0];
    
    // Check if username already exists, append UUID if needed
    const existingUser = await this.userRepository.findByUsername(username);
    if (existingUser) {
      username = `${username}-${uuidv4().substring(0, 8)}`;
    }

    // Create new user with OAuth provider
    const newUser = User.create({
      id: uuidv4(),
      username,
      email: emailObj,
      passwordHash: null, // OAuth users don't have passwords
      role: UserRole.EMPLOYEE, // Default role for new OAuth users
      isActive: true,
      authProvider: AuthProvider.GOOGLE_OAUTH,
    });

    return await this.userRepository.create(newUser);
  }

  /**
   * Get Passport instance for middleware
   */
  getPassport(): typeof passport {
    return passport;
  }

  /**
   * Validate email domain
   * Validates: Requirements 1.4, 1.5
   */
  validateEmailDomain(email: string): boolean {
    return this.authService.validateOAuthDomain(email, this.config.allowedDomain);
  }
}
