import { Router } from 'express';
import Joi from 'joi';

const router = Router();

/**
 * Rebalancing endpoints require portfolio optimization logic and market data.
 * Status: NOT IMPLEMENTED — integrate with portfolio optimizer when available.
 */
const NOT_IMPLEMENTED = {
  error: 'Not Implemented',
  message:
    'Portfolio rebalancing requires optimization logic and current market prices. Not yet implemented.',
  documentation: 'https://docs.coinet.ai/portfolio/rebalancing',
};

// Get rebalance suggestions — requires optimization algorithm
router.get('/suggestions', async (_req, res) => {
  return res.status(501).json(NOT_IMPLEMENTED);
});

// Execute rebalance — requires order execution and holdings update
router.post('/execute', async (req, res) => {
  const schema = Joi.object({
    allocations: Joi.array()
      .items(
        Joi.object({
          symbol: Joi.string().required(),
          percent: Joi.number().min(0).max(100).required(),
        })
      )
      .required(),
  });
  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  return res.status(501).json(NOT_IMPLEMENTED);
});

export default router;
