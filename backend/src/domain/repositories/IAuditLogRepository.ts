import { AuditLog } from '../entities/AuditLog';

/**
 * Repository interface for AuditLog entity
 * Requirements: 17.1
 */
export interface IAuditLogRepository {
  create(log: AuditLog): Promise<AuditLog>;
  findByUserId(userId: string, limit: number, offset: number): Promise<AuditLog[]>;
  findByDateRange(startDate: Date, endDate: Date): Promise<AuditLog[]>;
  findByEntityId(entityType: string, entityId: string): Promise<AuditLog[]>;
}
