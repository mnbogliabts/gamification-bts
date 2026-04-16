import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import multer from 'multer';
import {
  getAuthUser,
  validateRequest,
  validateParams,
  validateQuery,
  requireRole,
} from '../middleware';
import {
  createTrainingRecordUseCase,
  updateTrainingRecordUseCase,
  deleteTrainingRecordUseCase,
  getTrainingRecordUseCase,
  searchTrainingRecordsUseCase,
  uploadTrainingFileUseCase,
  deleteTrainingFileUseCase,
  downloadTrainingFileUseCase,
  tokenManagementService,
} from '../container';
import { createAuthenticateMiddleware } from '../middleware';
import { UserRole } from '../../domain/entities/User';

const router = Router();
const authenticate = createAuthenticateMiddleware(tokenManagementService);

// Multer with memory storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const idParamsSchema = z.object({ id: z.string().uuid('Invalid training record ID') });
const fileParamsSchema = z.object({
  id: z.string().uuid('Invalid training record ID'),
  fileId: z.string().uuid('Invalid file ID'),
});

const createRecordSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  technologyId: z.string().uuid('Invalid technology ID'),
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(2000),
  hours: z.number().min(0.5).max(1000),
  completedDate: z.string().optional(),
  completionDate: z.string().optional(),
});

const updateRecordSchema = z.object({
  technologyId: z.string().uuid().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(2000).optional(),
  hours: z.number().min(0.5).max(1000).optional(),
  completionDate: z.string().nullable().optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

const searchQuerySchema = z.object({
  searchTerm: z.string().optional(),
  technologyId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// All training record routes require authentication
router.use(authenticate);

// POST /training-records (any authenticated user; employees auto-assigned to themselves)
router.post('/', validateRequest(createRecordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = getAuthUser(req);
      // Employees can only create records for themselves
      const userId = authUser.role === UserRole.ADMIN ? req.body.userId : authUser.userId;
      const record = await createTrainingRecordUseCase.execute(
        { ...req.body, userId },
        {
          performedByUserId: authUser.userId,
          ipAddress: req.ip,
        }
      );
      res.status(201).json(record.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

// GET /training-records (filtered by role)
router.get('/', validateQuery(searchQuerySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = getAuthUser(req);
      const query = req.query as any;
      const records = await searchTrainingRecordsUseCase.execute(
        {
          searchTerm: query.searchTerm,
          technologyId: query.technologyId,
          userId: query.userId,
          startDate: query.startDate ? new Date(query.startDate) : undefined,
          endDate: query.endDate ? new Date(query.endDate) : undefined,
        },
        { requestingUserId: authUser.userId, requestingUserRole: authUser.role }
      );
      res.json(records.map(r => r.toJSON()));
    } catch (error) {
      next(error);
    }
  }
);

// GET /training-records/:id
router.get('/:id', validateParams(idParamsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = getAuthUser(req);
      const responseDTO = await getTrainingRecordUseCase.execute(req.params.id, {
        requestingUserId: authUser.userId,
        requestingUserRole: authUser.role,
      });
      res.json(responseDTO);
    } catch (error) {
      next(error);
    }
  }
);

// PUT /training-records/:id (admin only)
router.put('/:id', requireRole(UserRole.ADMIN), validateParams(idParamsSchema), validateRequest(updateRecordSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = getAuthUser(req);
      const record = await updateTrainingRecordUseCase.execute(req.params.id, req.body, {
        performedByUserId: authUser.userId,
        ipAddress: req.ip,
      });
      res.json(record.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /training-records/:id (admin only)
router.delete('/:id', requireRole(UserRole.ADMIN), validateParams(idParamsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = getAuthUser(req);
      await deleteTrainingRecordUseCase.execute(req.params.id, {
        performedByUserId: authUser.userId,
        ipAddress: req.ip,
      });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// --- File endpoints ---

// POST /training-records/:id/files (upload - any authenticated user for own records)
router.post('/:id/files', validateParams(idParamsSchema), upload.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = getAuthUser(req);
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'File is required' } });
        return;
      }
      const result = await uploadTrainingFileUseCase.execute(
        {
          trainingRecordId: req.params.id,
          file: file.buffer,
          originalFilename: file.originalname,
          mimeType: file.mimetype,
        },
        { performedByUserId: authUser.userId }
      );
      res.status(201).json(result.toJSON());
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /training-records/:id/files/:fileId
router.delete('/:id/files/:fileId', requireRole(UserRole.ADMIN), validateParams(fileParamsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = getAuthUser(req);
      await deleteTrainingFileUseCase.execute(req.params.fileId, {
        performedByUserId: authUser.userId,
      });
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// GET /training-records/:id/files/:fileId (download)
router.get('/:id/files/:fileId', validateParams(fileParamsSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = getAuthUser(req);
      const result = await downloadTrainingFileUseCase.execute(req.params.fileId, {
        requestingUserId: authUser.userId,
        requestingUserRole: authUser.role,
      });
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${result.originalFilename}"`);
      res.setHeader('Content-Length', result.fileSize.toString());
      res.send(result.fileBuffer);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
