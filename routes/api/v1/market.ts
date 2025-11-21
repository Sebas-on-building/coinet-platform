import * as express from 'express';
import { injectDb, requireAuth } from '../../../middleware/dbAndUser';
import Joi from 'joi';

const router = express.Router();
router.use(injectDb);
router.use(requireAuth);

// Utility to wrap async handlers
function wrapAsync(fn: express.RequestHandler): express.RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Get ticker for a symbol
router.get('/ticker/:symbol', wrapAsync(async (req, res) => {
  const { symbol } = req.params;
  const ticker = await req.db('market_tickers').where({ symbol }).first();
  if (!ticker) {
    res.status(404).json({ error: 'Ticker not found' });
    return;
  }
  res.json(ticker);
  return;
}));

// Get historical data for a symbol
router.get('/history/:symbol', wrapAsync(async (req, res) => {
  const { symbol } = req.params;
  const { from, to, interval } = req.query;
  // Validate query
  if (!from || !to || !interval) {
    res.status(400).json({ error: 'Missing query params' });
    return;
  }
  const history = await req.db('market_history')
    .where({ symbol })
    .andWhere('timestamp', '>=', from)
    .andWhere('timestamp', '<=', to)
    .andWhere('interval', interval)
    .orderBy('timestamp', 'asc');
  res.json(history);
  return;
}));

// Subscribe to market updates (stub, to be implemented with websockets)
router.post('/subscribe', wrapAsync(async (req, res) => {
  const { symbol } = req.body;
  if (!symbol) {
    res.status(400).json({ error: 'Missing symbol' });
    return;
  }
  // TODO: Implement real-time subscription
  res.json({ ok: true, message: 'Subscribed (stub)' });
  return;
}));

export default router; 