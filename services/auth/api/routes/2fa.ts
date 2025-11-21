import { Router } from 'express';
import { TwoFAService } from '../../services/twoFAService';

const router = Router();

router.post('/setup', TwoFAService.setup);
router.post('/verify', TwoFAService.verify);
router.post('/disable', TwoFAService.disable);
router.get('/backup-codes', TwoFAService.getBackupCodes);

export default router; 