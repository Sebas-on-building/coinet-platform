import { Router } from 'express';
import { UserService } from '../../services/userService';
import { requireRole } from '../middleware/rbac';

const router = Router();

router.post('/assign', requireRole('ADMIN'), UserService.assignRole);
router.get('/check', UserService.checkRole);
router.get('/list', UserService.listRoles);

export default router; 