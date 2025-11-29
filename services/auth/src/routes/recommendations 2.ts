import { Router } from 'express';
import { getRecommendations } from '../controllers/recommendationController';
import { authenticateToken } from '../middleware/authenticateToken';

const router = Router();
router.get('/', authenticateToken, getRecommendations);
export default router; 