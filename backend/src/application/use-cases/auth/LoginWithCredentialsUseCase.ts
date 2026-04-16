import { v4 as uuidv4 } from 'uuid';
import { User } from '../../../domain/entities/User';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';
import { AuthenticationService } from '../../../domain/services/AuthenticationService';
import { TokenManagementService } from '../../../domain/services/TokenManagementService';
import { AuditLog, AuditAction } from '../../../domain/entities/AuditLog';
import { AuthenticationError, ValidationError } from '../../../shared/errors';
import { Session } from '../../../domain/repositories/ISessionRepository';

export interface LoginWithCredentialsDTO {
  username: string;
  password: string;
  ipAddress?: string;
}

export interface LoginResult {
  token: string;
  user: User;
  session: Session;
}

/**
 * Use case for logging in with username/password credentials
 * Validates: Requirements 1.1, 1.2, 17.2
 */
export class LoginWithCredentialsUseCase {
  constructor(
    private userRepository: IUserRepository,
    private authenticationService: AuthenticationService,
    private tokenManagementService: TokenManagementService,
    private auditLogRepository: IAuditLogRepository
  ) {}

  async execute(dto: LoginWithCredentialsDTO): Promise<LoginResult> {
    // Validate required fields
    if (!dto.username || dto.username.trim().length === 0) {
      throw new ValidationError('Username is required');
    }
    if (!dto.password || dto.password.length === 0) {
      throw new ValidationError('Password is required');
    }

    // Find user by username
    const user = await this.userRepository.findByUsername(dto.username.trim());
    if (!user) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Check if user is active (Requirement 3.4 - deactivated users cannot authenticate)
    if (!user.isActive) {
      throw new AuthenticationError('Account is deactivated');
    }

    // Check if user has a password hash (OAuth users don't)
    if (!user.passwordHash) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Verify password (Requirement 1.1, 1.2)
    const isValid = await this.authenticationService.authenticate(
      dto.password,
      user.passwordHash
    );

    if (!isValid) {
      throw new AuthenticationError('Invalid credentials');
    }

    // Create session and generate token (Requirement 1.1)
    const { token, session } = await this.tokenManagementService.createSession(user);

    // Log authentication event (Requirement 17.2)
    const auditLog = AuditLog.create({
      id: uuidv4(),
      userId: user.id,
      action: AuditAction.LOGIN,
      entityType: 'Session',
      entityId: session.id,
      changes: { method: 'credentials', username: user.username },
      ipAddress: dto.ipAddress ?? null,
    });
    await this.auditLogRepository.create(auditLog);

    return { token, user, session };
  }
}
