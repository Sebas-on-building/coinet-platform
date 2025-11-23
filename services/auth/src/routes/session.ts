import { Router } from 'express';
import { listSessions, revokeSession, revokeAllSessions, getSessionInfo } from '../controllers/sessionController';
import { authenticateToken } from '../middleware/authenticateToken';

const router = Router();

router.get('/', authenticateToken, listSessions);
router.post('/revoke', authenticateToken, revokeSession);
router.post('/revoke-all', authenticateToken, revokeAllSessions);
router.get('/:sessionId', authenticateToken, getSessionInfo);

export default router; 