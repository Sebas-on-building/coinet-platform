import { Router } from 'express';
import { RateLimitService } from '../../services/cache/rateLimitService';

const router = Router();

router.get('/count/:userId', async (req, res) => {
  const count = await RateLimitService.getCount(`rate:${req.params.userId}`);
  res.json({ count });
});
router.post('/reset/:userId', async (req, res) => {
  await RateLimitService.reset(`rate:${req.params.userId}`);
  res.json({ ok: true });
});

export default router; 