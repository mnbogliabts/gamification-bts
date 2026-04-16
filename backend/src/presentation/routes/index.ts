import { Router } from 'express';
import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import trainingRecordRoutes from './trainingRecordRoutes';
import technologyRoutes from './technologyRoutes';
import analyticsRoutes from './analyticsRoutes';
import auditLogRoutes from './auditLogRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/training-records', trainingRecordRoutes);
router.use('/technologies', technologyRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/audit-logs', auditLogRoutes);

export default router;
