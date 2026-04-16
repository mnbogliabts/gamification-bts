import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getAuthUser, validateRequest, validateParams, requireRole } from '../middleware';
import {
  createUserUseCase,
  updateUserUseCase,
  deactivateUserUseCase,
  getUserByIdUseCase,
  listUsersUseCase,
  tokenManagementService,
} from '../container';
import { createAuthenticateMiddleware } from '../middleware';
import { UserRole } from '../../domain/entities/User';

const router = Router();
const authenticate = createAuthenticateMiddleware(tokenManagementService);

const idParamsSchema = z.object({ id: z.string().uuid('Invalid user ID') });

const createUserSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  firstName: z.string().max(100, 'First name must not exceed 100 characters').optional().default(''),
  lastName: z.string().max(100, 'Last name must not exceed 100 characters').optional().default(''),
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  role: z.enum(['ADMIN', 'EMPLOYEE'], { errorMap: () => ({ message: 'Role must be ADMIN or EMPLOYEE' }) }),
});

const updateUserSchema = z.object({
  username: z.string().min(1).optional(),
  firstName: z.string().max(100, 'First name must not exceed 100 characters').optional(),
  lastName: z.string().max(100, 'Last name must not exceed 100 characters').optional(),
  email: z.string().email('Invalid email format').optional(),
  password: z.string().min(1).optional(),
  role: z.enum(['ADMIN', 'EMPLOYEE']).optional(),
}).refine(data => Object.keys(data).length > 0, { message: 'At least one field must be provided' });

// All user routes require authentication + admin role
router.use(authenticate, requireRole(UserRole.ADMIN));

// POST /users
router.post('/', validateRequest(createUserSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await createUserUseCase.execute({
      username: req.body.username,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: req.body.password,
      role: req.body.role as UserRole,
    });
    res.status(201).json(user.toJSON());
  } catch (error) {
    next(error);
  }
});

// GET /users
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = getAuthUser(req);
    // Build a minimal User object for the authorization check in ListUsersUseCase
    const requestingUser = await getUserByIdUseCase.execute(authUser.userId);
    const users = await listUsersUseCase.execute(requestingUser);
    res.json(users.map(u => u.toJSON()));
  } catch (error) {
    next(error);
  }
});

// GET /users/:id
router.get('/:id', validateParams(idParamsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getUserByIdUseCase.execute(req.params.id);
    res.json(user.toJSON());
  } catch (error) {
    next(error);
  }
});

// PUT /users/:id
router.put('/:id', validateParams(idParamsSchema), validateRequest(updateUserSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = getAuthUser(req);
    const user = await updateUserUseCase.execute(req.params.id, req.body, {
      performedByUserId: authUser.userId,
      ipAddress: req.ip,
    });
    res.json(user.toJSON());
  } catch (error) {
    next(error);
  }
});

// DELETE /users/:id
router.delete('/:id', validateParams(idParamsSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authUser = getAuthUser(req);
    await deactivateUserUseCase.execute(req.params.id, {
      performedByUserId: authUser.userId,
      ipAddress: req.ip,
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
