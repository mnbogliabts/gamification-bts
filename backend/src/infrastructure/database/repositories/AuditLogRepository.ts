import { getDatabasePool } from '../connection';
import { AuditLog, AuditAction } from '../../../domain/entities/AuditLog';
import { IAuditLogRepository } from '../../../domain/repositories/IAuditLogRepository';

/**
 * PostgreSQL implementation of AuditLogRepository
 * Requirements: 17.1
 */
export class AuditLogRepository implements IAuditLogRepository {
  async create(log: AuditLog): Promise<AuditLog> {
    const pool = getDatabasePool();
    const query = `
      INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, changes, ip_address, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      log.id,
      log.userId,
      log.action,
      log.entityType,
      log.entityId,
      log.changes ? JSON.stringify(log.changes) : null,
      log.ipAddress,
      log.timestamp
    ];

    const result = await pool.query(query, values);
    return this.mapRowToAuditLog(result.rows[0]);
  }

  async findByUserId(userId: string, limit: number, offset: number): Promise<AuditLog[]> {
    const pool = getDatabasePool();
    const query = `
      SELECT * FROM audit_logs
      WHERE user_id = $1
      ORDER BY timestamp DESC
      LIMIT $2 OFFSET $3
    `;
    
    const result = await pool.query(query, [userId, limit, offset]);
    return result.rows.map(row => this.mapRowToAuditLog(row));
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<AuditLog[]> {
    const pool = getDatabasePool();
    const query = `
      SELECT * FROM audit_logs
      WHERE timestamp >= $1 AND timestamp <= $2
      ORDER BY timestamp DESC
    `;
    
    const result = await pool.query(query, [startDate, endDate]);
    return result.rows.map(row => this.mapRowToAuditLog(row));
  }

  async findByEntityId(entityType: string, entityId: string): Promise<AuditLog[]> {
    const pool = getDatabasePool();
    const query = `
      SELECT * FROM audit_logs
      WHERE entity_type = $1 AND entity_id = $2
      ORDER BY timestamp DESC
    `;
    
    const result = await pool.query(query, [entityType, entityId]);
    return result.rows.map(row => this.mapRowToAuditLog(row));
  }

  private mapRowToAuditLog(row: any): AuditLog {
    return AuditLog.create({
      id: row.id,
      userId: row.user_id,
      action: row.action as AuditAction,
      entityType: row.entity_type,
      entityId: row.entity_id,
      changes: row.changes && typeof row.changes === 'string' ? JSON.parse(row.changes) : row.changes ?? null,
      ipAddress: row.ip_address,
      timestamp: new Date(row.timestamp)
    });
  }
}
