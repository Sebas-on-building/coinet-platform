import { Router } from 'express';
import { CacheService } from '../../services/cache/cacheService';
import { getPortfolioValuation } from '../../services/cache/getPortfolioValuation';

const router = Router();

// Query result cache (portfolio valuation)
router.get('/portfolio/:userId/valuation', async (req, res) => {
  const { userId } = req.params;
  const result = await getPortfolioValuation(userId);
  res.json({ data: result });
});

// Cache key/tag management
router.get('/key/:key', async (req, res) => {
  const value = await CacheService.get(req.params.key);
  res.json({ value });
});
router.delete('/key/:key', async (req, res) => {
  await CacheService.del(req.params.key);
  res.json({ ok: true });
});
router.post('/invalidate-tag/:tag', async (req, res) => {
  await CacheService.invalidateTag(req.params.tag);
  res.json({ ok: true });
});

export default router; 