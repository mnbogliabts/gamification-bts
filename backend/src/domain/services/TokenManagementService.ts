import { v4 as uuidv4 } from 'uuid';
import { ISessionRepository, Session } from '../repositories/ISessionRepository';
import { AuthenticationService } from './AuthenticationService';
import { User } from '../entities/User';

/**
 * Service for managing JWT tokens and sessions
 * Handles token creation, validation, refresh, and blacklisting
 * Requirements: 1.1, 1.7, 1.9
 */
export class TokenManagementService {
  constructor(
    private readonly sessionRepository: ISessionRepository,
    private readonly authService: AuthenticationService
  ) {}

  /**
   * Create a new session for a user
   * Generates JWT token and stores session in database
   * Validates: Requirements 1.1
   */
  async createSession(user: User): Promise<{ token: string; session: Session }> {
    const token = this.authService.generateJWT(user);
    const tokenHash = this.authService.hashToken(token);
    
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const session: Session = {
      id: uuidv4(),
      userId: user.id,
      tokenHash,
      expiresAt,
      createdAt: new Date(),
    };

    const createdSession = await this.sessionRepository.create(session);
    
    return { token, session: createdSession };
  }

  /**
   * Validate a JWT token and check if it's blacklisted
   * Returns the payload if valid and not blacklisted, null otherwise
   * Validates: Requirements 1.7, 1.9
   */
  async validateToken(token: string): Promise<any | null> {
    // First validate the JWT structure and expiration
    const payload = this.authService.validateJWT(token);
    if (!payload) {
      return null;
    }

    // Check if token is blacklisted
    const tokenHash = this.authService.hashToken(token);
    const session = await this.sessionRepository.findByTokenHash(tokenHash);
    
    // If session doesn't exist, token was never created or was blacklisted
    if (!session) {
      return null;
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      return null;
    }

    return payload;
  }

  /**
   * Refresh a JWT token
   * Creates a new token and session, invalidates the old one
   * Validates: Requirements 1.7
   */
  async refreshToken(user: User, oldToken: string): Promise<{ token: string; session: Session }> {
    // Invalidate old token
    await this.invalidateToken(oldToken);
    
    // Create new session
    return this.createSession(user);
  }

  /**
   * Invalidate a token (add to blacklist)
   * Used for logout functionality
   * Validates: Requirements 1.9
   */
  async invalidateToken(token: string): Promise<void> {
    const tokenHash = this.authService.hashToken(token);
    const session = await this.sessionRepository.findByTokenHash(tokenHash);
    
    if (session) {
      await this.sessionRepository.delete(session.id);
    }
  }

  /**
   * Clean up expired sessions
   * Should be run periodically (e.g., daily cron job)
   * Validates: Requirements 1.7
   */
  async cleanupExpiredSessions(): Promise<number> {
    return this.sessionRepository.deleteExpired();
  }
}
