import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateQuery, validateParams, requireRole } from '../middleware';
import { tokenManagementService } from '../container';
import { createAuthenticateMiddleware } from '../middleware';
import { UserRole } from '../../domain/entities/User';
import { getDatabasePool } from '../../infrastructure/database/connection';
import { AuditLog, AuditAction } from '../../domain/entities/AuditLog';

const router = Router();
const authenticate = createAuthenticateMiddleware(tokenManagementService);

const idParamsSchema = z.object({ id: z.string().uuid('Invalid audit log ID') });

const listQuerySchema = z.object({
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('20'),
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// All audit log routes require authentication + admin role
router.use(authenticate, requireRole(UserRole.ADMIN));

// GET /audit-logs - List with pagination
router.get('/', validateQuery(listQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as any;
      const page = Math.max(1, parseInt(query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
      const offset = (page - 1) * limit;

      const pool = getDatabasePool();

      // Build dynamic query
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (query.userId) {
        conditions.push(`user_id = $${paramIndex++}`);
        values.push(query.userId);
      }
      if (query.action) {
        conditions.push(`action = $${paramIndex++}`);
        values.push(query.action);
      }
      if (query.entityType) {
        conditions.push(`entity_type = $${paramIndex++}`);
        values.push(query.entityType);
      }
      if (query.startDate) {
        conditions.push(`timestamp >= $${paramIndex++}`);
        values.push(new Date(query.startDate));
      }
      if (query.endDate) {
        conditions.push(`timestamp <= $${paramIndex++}`);
        values.push(new Date(query.endDate));
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Count total
      const countResult = await pool.query(`SELECT COUNT(*) FROM audit_logs ${whereClause}`, values);
      const total = parseInt(countResult.rows[0].count, 10);

      // Fetch page
      const dataResult = await pool.query(
        `SELECT * FROM audit_logs ${whereClause} ORDER BY timestamp DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        [...values, limit, offset]
      );

      const logs = dataResult.rows.map((row: any) =>
        AuditLog.create({
          id: row.id,
          userId: row.user_id,
          action: row.action as AuditAction,
          entityType: row.entity_type,
          entityId: row.entity_id,
          changes: row.changes ? (typeof row.changes === 'string' ? JSON.parse(row.changes) : row.changes) : null,
          ipAddress: row.ip_address,
          timestamp: new Date(row.timestamp),
        }).toJSON()
      );

      res.json({
        data: logs,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET /audit-logs/:id
router.get('/:id', validateParams(idParamsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const pool = getDatabasePool();
      const result = await pool.query('SELECT * FROM audit_logs WHERE id = $1', [req.params.id]);
      if (result.rows.length === 0) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Audit log entry not found' } });
        return;
      }
      const row = result.rows[0];
      const log = AuditLog.create({
        id: row.id,
        userId: row.user_id,
        action: row.action as AuditAction,
        entityType: row.entity_type,
        entityId: row.entity_id,
        changes: row.changes ? (typeof row.changes === 'string' ? JSON.parse(row.changes) : row.changes) : null,
        ipAddress: row.ip_address,
        timestamp: new Date(row.timestamp),
      });
      res.json(log.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

export default router;
