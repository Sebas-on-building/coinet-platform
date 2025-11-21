import { Router } from 'express';
import { SessionService } from '../../services/cache/sessionService';

const router = Router();

router.get('/:sessionId', async (req, res) => {
  const session = await SessionService.getSession(req.params.sessionId);
  res.json({ session });
});
router.delete('/:sessionId', async (req, res) => {
  await SessionService.deleteSession(req.params.sessionId);
  res.json({ ok: true });
});

export default router; 