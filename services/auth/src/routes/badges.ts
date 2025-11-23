import { Router } from 'express';
import { getUserBadges, awardBadge } from '../controllers/badgeController';
import { authenticateToken } from '../middleware/authenticateToken';

const router = Router();

router.get('/', authenticateToken, getUserBadges);
router.post('/award', authenticateToken, awardBadge);

export default router; 