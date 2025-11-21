import { Router } from 'express';
import { authenticateToken } from '../../middleware/authenticateToken';
import { getUserProfile } from '../../controllers/userController';

const router = Router();

router.get('/profile', authenticateToken, getUserProfile);

export default router; 