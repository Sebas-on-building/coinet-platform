import { Router } from 'express';
import * as Controller from '../controllers/BranchProtectionAuditLogController';

const router = Router();

router.get('/', Controller.listAuditLogs);
router.get('/filter', Controller.filterAuditLogs);
router.get('/export', Controller.exportAuditLogs);

export default router; 