import { User } from '../../../domain/entities/User';
import { IUserRepository } from '../../../domain/repositories/IUserRepository';
import { TokenManagementService } from '../../../domain/services/TokenManagementService';
import { AuthenticationError, ValidationError } from '../../../shared/errors';
import { Session } from '../../../domain/repositories/ISessionRepository';

export interface RefreshTokenDTO {
  token: string;
}

export interface RefreshTokenResult {
  token: string;
  user: User;
  session: Session;
}

/**
 * Use case for refreshing a JWT token to extend the session
 * Validates: Requirements 1.7, 1.9
 */
export class RefreshTokenUseCase {
  constructor(
    private userRepository: IUserRepository,
    private tokenManagementService: TokenManagementService
  ) {}

  async execute(dto: RefreshTokenDTO): Promise<RefreshTokenResult> {
    // Validate required fields
    if (!dto.token || dto.token.trim().length === 0) {
      throw new ValidationError('Token is required');
    }

    // Validate the current token
    const payload = await this.tokenManagementService.validateToken(dto.token);
    if (!payload) {
      throw new AuthenticationError('Invalid or expired token');
    }

    // Fetch the user to ensure they still exist and are active
    const user = await this.userRepository.findById(payload.userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Account is deactivated');
    }

    // Refresh the token - invalidates old token and creates new session
    const { token, session } = await this.tokenManagementService.refreshToken(
      user,
      dto.token
    );

    return { token, user, session };
  }
}
