import { v4 as uuidv4 } from 'uuid';
import { User, UserRole, AuthProvider } from '../../../domain/entities/User';
import { Email } from '../../../domain/value-objects/Email';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { AuthenticationService } from '../../../domain/services/AuthenticationService';
import { TokenManagementService } from '../../../domain/services/TokenManagementService';
import { AuditLog, AuditAction } from '../../../domain/entities/AuditLog';
import { AuthenticationError, ValidationError } from '../../../shared/errors';
import { Session } from '../../../domain/repositories/ISessionRepository';

export interface GoogleOAuthDTO {
  email: string;
  displayName: string;
  googleId: string;
  ipAddress?: string;
}

export interface OAuthLoginResult {
  token: string;
  user: User;
  session: Session;
  isNewUser: boolean;
}

/**
 * Use case for logging in with Google OAuth
 * Validates: Requirements 1.3, 1.4, 1.5, 1.6, 17.2
 */
export class LoginWithGoogleOAuthUseCase {
  private readonly allowedDomain: string;

  constructor(
    private userRepository: IUserRepository,
    private authenticationService: AuthenticationService,
    private tokenManagementService: TokenManagementService,
    private auditLogRepository: IAuditLogRepository,
    allowedDomain: string = 'bluetrailsoft.com'
  ) {
    this.allowedDomain = allowedDomain;
  }

  async execute(dto: GoogleOAuthDTO): Promise<OAuthLoginResult> {
    // Validate required fields
    if (!dto.email || dto.email.trim().length === 0) {
      throw new ValidationError('Email is required');
    }
    if (!dto.displayName || dto.displayName.trim().length === 0) {
      throw new ValidationError('Display name is required');
    }

    // Validate email domain (Requirement 1.4, 1.5)
    if (!this.authenticationService.validateOAuthDomain(dto.email, this.allowedDomain)) {
      throw new AuthenticationError(
        `Email domain must be @${this.allowedDomain}`
      );
    }

    // Check if user exists
    const emailObj = new Email(dto.email);
    let user = await this.userRepository.findByEmail(emailObj);
    let isNewUser = false;

    if (!user) {
      // Auto-provision new OAuth user (Requirement 1.6)
      user = await this.provisionOAuthUser(dto, emailObj);
      isNewUser = true;
    }

    // Check if user is active
    if (!user.isActive) {
      throw new AuthenticationError('Account is deactivated');
    }

    // Create session and generate token
    const { token, session } = await this.tokenManagementService.createSession(user);

    // Log authentication event (Requirement 17.2)
    const auditLog = AuditLog.create({
      id: uuidv4(),
      userId: user.id,
      action: AuditAction.LOGIN,
      entityType: 'Session',
      entityId: session.id,
      changes: { method: 'google_oauth', isNewUser },
      ipAddress: dto.ipAddress ?? null,
    });
    await this.auditLogRepository.create(auditLog);

    return { token, user, session, isNewUser };
  }

  private async provisionOAuthUser(dto: GoogleOAuthDTO, emailObj: Email): Promise<User> {
    // Generate username from email
    let username = dto.email.split('@')[0];

    // Check if username already exists, append UUID suffix if needed
    const existingUser = await this.userRepository.findByUsername(username);
    if (existingUser) {
      username = `${username}-${uuidv4().substring(0, 8)}`;
    }

    const newUser = User.create({
      id: uuidv4(),
      username,
      email: emailObj,
      passwordHash: null, // OAuth users don't have passwords
      role: UserRole.EMPLOYEE, // Default role for new OAuth users
      isActive: true,
      authProvider: AuthProvider.GOOGLE_OAUTH,
    });

    return this.userRepository.create(newUser);
  }
}
