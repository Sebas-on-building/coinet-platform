import { Router } from 'express';
import { getOnboardingProgress, completeOnboardingStep } from '../controllers/onboardingController';
import { authenticateToken } from '../middleware/authenticateToken';

const router = Router();

router.get('/progress', authenticateToken, getOnboardingProgress);
router.post('/complete', authenticateToken, completeOnboardingStep);

export default router; 