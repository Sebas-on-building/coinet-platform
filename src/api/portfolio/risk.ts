import { Router } from 'express';
import Joi from 'joi';

const router = Router();

// Get volatility
router.get('/volatility', async (req, res) => {
  // TODO: Fetch volatility data
  return res.json({ volatility: 0 });
});

// Get correlation
router.get('/correlation', async (req, res) => {
  const schema = Joi.object({
    symbols: Joi.array().items(Joi.string()).min(2).required(),
  });
  const { error, value } = schema.validate(req.query);
  if (error) return res.status(400).json({ error: error.details[0].message });
  // TODO: Fetch correlation data
  return res.json({ correlation: [] });
});

export default router; 