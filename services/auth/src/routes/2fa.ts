import { Router } from 'express';
import { setup2FA, verify2FA, generateBackupCodes, verifyBackupCode, trustDevice } from '../controllers/twoFAController';
import { authenticateToken } from '../middleware/authenticateToken';

const router = Router();

router.post('/setup', authenticateToken, setup2FA);
router.post('/verify', authenticateToken, verify2FA);
router.post('/backup/generate', authenticateToken, generateBackupCodes);
router.post('/backup/verify', authenticateToken, verifyBackupCode);
router.post('/trust', authenticateToken, trustDevice);

export default router; 