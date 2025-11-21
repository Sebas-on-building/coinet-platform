import { Router } from 'express';
import { leaderboardAdd, leaderboardTop } from '../../services/cache/redisClient';

const router = Router();

router.post('/add', async (req, res) => {
  const { key, member, score } = req.body;
  await leaderboardAdd(key, member, score);
  res.json({ ok: true });
});
router.get('/top/:key/:count', async (req, res) => {
  const { key, count } = req.params;
  const top = await leaderboardTop(key, Number(count));
  res.json({ top });
});

export default router; 