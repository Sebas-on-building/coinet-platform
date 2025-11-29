import { Router } from 'express';
import { listUsers, setUserRole, getAuditLogs } from '../controllers/adminController';
import { authenticateToken } from '../middleware/authenticateToken';
import { requireRole } from '../middleware/rbac';

const router = Router();

router.get('/users', authenticateToken, requireRole('admin'), listUsers);
router.post('/users/role', authenticateToken, requireRole('admin'), setUserRole);
router.get('/audit-logs', authenticateToken, requireRole('admin'), getAuditLogs);

export default router; 