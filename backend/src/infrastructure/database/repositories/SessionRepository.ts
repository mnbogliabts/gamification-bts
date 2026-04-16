import { getDatabasePool } from '../connection';
import { ISessionRepository, Session } from '../../../domain/repositories/ISessionRepository';

/**
 * PostgreSQL implementation of SessionRepository
 * Requirements: 1.7, 1.9
 */
export class SessionRepository implements ISessionRepository {
  async create(session: Session): Promise<Session> {
    const pool = getDatabasePool();
    const query = `
      INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      session.id,
      session.userId,
      session.tokenHash,
      session.expiresAt,
      session.createdAt
    ];

    const result = await pool.query(query, values);
    return this.mapRowToSession(result.rows[0]);
  }

  async findByTokenHash(tokenHash: string): Promise<Session | null> {
    const pool = getDatabasePool();
    const query = 'SELECT * FROM sessions WHERE token_hash = $1';
    const result = await pool.query(query, [tokenHash]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToSession(result.rows[0]);
  }

  async delete(id: string): Promise<void> {
    const pool = getDatabasePool();
    const query = 'DELETE FROM sessions WHERE id = $1';
    await pool.query(query, [id]);
  }

  async deleteExpired(): Promise<number> {
    const pool = getDatabasePool();
    const query = 'DELETE FROM sessions WHERE expires_at < $1';
    const result = await pool.query(query, [new Date()]);
    return result.rowCount || 0;
  }

  private mapRowToSession(row: any): Session {
    return {
      id: row.id,
      userId: row.user_id,
      tokenHash: row.token_hash,
      expiresAt: new Date(row.expires_at),
      createdAt: new Date(row.created_at)
    };
  }
}
