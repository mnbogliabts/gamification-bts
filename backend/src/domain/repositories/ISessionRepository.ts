/**
 * Session entity for JWT token management
 */
export interface Session {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

/**
 * Repository interface for Session management
 * Requirements: 1.7, 1.9
 */
export interface ISessionRepository {
  create(session: Session): Promise<Session>;
  findByTokenHash(tokenHash: string): Promise<Session | null>;
  delete(id: string): Promise<void>;
  deleteExpired(): Promise<number>;
}
