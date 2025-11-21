import express from 'express';
import * as cache from '../services/cache';

const router = express.Router();

// Endpoint: Top Portfolios Leaderboard
router.get('/top', async (req, res) => {
  const { count } = req.query;
  const data = await cache.getLeaderboard('portfolios', Number(count) || 10);
  res.json(data);
});

// Endpoint: Supported Symbols (config cache)
router.get('/symbols', async (req, res) => {
  const data = await cache.cacheConfig('symbols', async () => {
    // Simulate DB call
    return ['BTCUSD', 'ETHUSD', 'SOLUSD', 'AAPL', 'TSLA'];
  }, 3600);
  res.json(data);
});

export default router; 