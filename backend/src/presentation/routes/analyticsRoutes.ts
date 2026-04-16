import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getAuthUser, validateQuery, validateRequest, requireRole } from '../middleware';
import {
  getEmployeeDashboardUseCase,
  getAdminAnalyticsUseCase,
  getLeaderboardUseCase,
  getTechnologyAnalyticsUseCase,
  exportTrainingDataUseCase,
  tokenManagementService,
} from '../container';
import { createAuthenticateMiddleware } from '../middleware';
import { UserRole } from '../../domain/entities/User';

const router = Router();
const authenticate = createAuthenticateMiddleware(tokenManagementService);

const dateRangeQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.string().optional(),
});

const exportSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// All analytics routes require authentication
router.use(authenticate);

// GET /analytics/dashboard - Employee personal dashboard
router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = getAuthUser(req);
    const dashboard = await getEmployeeDashboardUseCase.execute(authUser.userId, {
      requestingUserId: authUser.userId,
      requestingUserRole: authUser.role,
    });
    res.json(dashboard);
  } catch (error) {
    next(error);
  }
});

// GET /analytics/admin (admin only)
router.get('/admin', requireRole(UserRole.ADMIN), validateQuery(dateRangeQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as any;
      const result = await getAdminAnalyticsUseCase.execute({
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /analytics/leaderboard (admin only)
router.get('/leaderboard', requireRole(UserRole.ADMIN), validateQuery(dateRangeQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as any;
      const result = await getLeaderboardUseCase.execute({
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// GET /analytics/technologies (admin only)
router.get('/technologies', requireRole(UserRole.ADMIN), validateQuery(dateRangeQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as any;
      const result = await getTechnologyAnalyticsUseCase.execute({
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

// POST /analytics/export (admin only)
router.post('/export', requireRole(UserRole.ADMIN), validateRequest(exportSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const csv = await exportTrainingDataUseCase.execute({
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="training-data-export.csv"');
      // UTF-8 BOM for Excel compatibility
      res.send('\uFEFF' + csv);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
