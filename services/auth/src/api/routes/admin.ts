import { Router } from 'express';
import { requireRole } from '../../middleware/requireRole';
import { listUsers, getUser, updateUser, deleteUser, getUserAnalytics } from '../../controllers/adminController';

const router = Router();

router.get('/users', requireRole('admin'), listUsers);
router.get('/users/:id', requireRole('admin'), getUser);
router.put('/users/:id', requireRole('admin'), updateUser);
router.delete('/users/:id', requireRole('admin'), deleteUser);
router.get('/analytics/users', requireRole('admin'), getUserAnalytics);

export default router; 