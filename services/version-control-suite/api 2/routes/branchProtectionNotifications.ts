import { Router } from 'express';
import * as Controller from '../controllers/BranchProtectionNotificationController';

const router = Router();

router.post('/enable', Controller.enableNotification);
router.post('/disable', Controller.disableNotification);
router.get('/', Controller.listNotifications);

export default router; 