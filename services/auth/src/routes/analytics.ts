import { Router } from 'express';
import { trackEvent, getUserEvents } from '../controllers/analyticsController';
import { authenticateToken } from '../middleware/authenticateToken';

const router = Router();

router.post('/track', authenticateToken, trackEvent);
router.get('/user', authenticateToken, getUserEvents);

export default router; 