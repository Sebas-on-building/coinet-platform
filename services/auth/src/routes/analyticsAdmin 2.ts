import { Router } from 'express';
import { getAggregateStats } from '../controllers/analyticsAdminController';
import { authenticateToken } from '../middleware/authenticateToken';
import { requireRole } from '../middleware/rbac';

const router = Router();
router.get('/aggregate', authenticateToken, requireRole('admin'), getAggregateStats);
export default router; 