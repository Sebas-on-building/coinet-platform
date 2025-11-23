import { Router } from 'express';
import Joi from 'joi';

const router = Router();

// Get performance chart
router.get('/chart', async (req, res) => {
  const schema = Joi.object({
    timeframe: Joi.string().valid('1d', '1w', '1m', '1y', 'all').default('1m'),
  });
  const { error, value } = schema.validate(req.query);
  if (error) return res.status(400).json({ error: error.details[0].message });
  // TODO: Fetch performance data
  return res.json({ chart: [] });
});

// Compare assets
router.get('/compare', async (req, res) => {
  const schema = Joi.object({
    symbols: Joi.array().items(Joi.string()).min(2).required(),
    timeframe: Joi.string().valid('1d', '1w', '1m', '1y', 'all').default('1m'),
  });
  const { error, value } = schema.validate(req.query);
  if (error) return res.status(400).json({ error: error.details[0].message });
  // TODO: Fetch comparison data
  return res.json({ comparison: [] });
});

export default router; 