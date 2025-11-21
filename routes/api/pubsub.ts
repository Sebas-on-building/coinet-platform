import { Router } from 'express';
import { publish } from '../../services/cache/redisClient';

const router = Router();

router.post('/publish', async (req, res) => {
  const { channel, message } = req.body;
  await publish(channel, message);
  res.json({ ok: true });
});

export default router; 