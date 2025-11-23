import { Router } from 'express';
import { AuditService } from '../../services/auditService';
import { requireRole } from '../middleware/rbac';

const router = Router();

router.get('/logs', requireRole('ADMIN'), AuditService.getLogs);

export default router; 