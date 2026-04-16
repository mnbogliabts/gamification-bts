import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { validateRequest, validateParams, requireRole } from '../middleware';
import { technologyRepository, tokenManagementService } from '../container';
import { createAuthenticateMiddleware } from '../middleware';
import { UserRole } from '../../domain/entities/User';
import { Technology } from '../../domain/entities/Technology';

const router = Router();
const authenticate = createAuthenticateMiddleware(tokenManagementService);

const idParamsSchema = z.object({ id: z.string().uuid('Invalid technology ID') });

const createTechnologySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  category: z.string().min(1, 'Category is required').max(100),
});

const updateTechnologySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(100).optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

// All technology routes require authentication
router.use(authenticate);

// GET /technologies (all authenticated users)
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const technologies = await technologyRepository.listAll();
    res.json(technologies.map(t => t.toJSON()));
  } catch (error) {
    next(error);
  }
});

// POST /technologies (admin only)
router.post('/', requireRole(UserRole.ADMIN), validateRequest(createTechnologySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const technology = Technology.create({
        id: uuidv4(),
        name: req.body.name,
        category: req.body.category,
      });
      const created = await technologyRepository.create(technology);
      res.status(201).json(created.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

// PUT /technologies/:id (admin only)
router.put('/:id', requireRole(UserRole.ADMIN), validateParams(idParamsSchema), validateRequest(updateTechnologySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await technologyRepository.findById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Technology not found' } });
        return;
      }
      const updated = await technologyRepository.update(req.params.id, req.body);
      res.json(updated.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /technologies/:id (admin only)
router.delete('/:id', requireRole(UserRole.ADMIN), validateParams(idParamsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const existing = await technologyRepository.findById(req.params.id);
      if (!existing) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Technology not found' } });
        return;
      }
      await technologyRepository.delete(req.params.id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
