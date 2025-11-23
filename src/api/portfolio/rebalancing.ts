import { Router } from 'express';
import Joi from 'joi';

const router = Router();

// Get rebalance suggestions
router.get('/suggestions', async (req, res) => {
  // TODO: Fetch rebalance suggestions
  return res.json({ suggestions: [] });
});

// Execute rebalance
router.post('/execute', async (req, res) => {
  const schema = Joi.object({
    allocations: Joi.array().items(
      Joi.object({ symbol: Joi.string().required(), percent: Joi.number().min(0).max(100).required() })
    ).required(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  // TODO: Execute rebalance
  return res.json({ status: 'success', allocations: value.allocations });
});

export default router; 