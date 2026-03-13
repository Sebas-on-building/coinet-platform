import { Router } from 'express';
import Joi from 'joi';

const router = Router();

/**
 * Risk endpoints require market data (historical prices, volatility, correlation).
 * Status: NOT IMPLEMENTED — integrate with market-data service when available.
 */
const NOT_IMPLEMENTED = {
  error: 'Not Implemented',
  message:
    'Portfolio risk analytics require integration with market data service (historical prices, volatility, correlation).',
  documentation: 'https://docs.coinet.ai/portfolio/risk',
};

// Get volatility — requires historical price data
router.get('/volatility', async (_req, res) => {
  return res.status(501).json(NOT_IMPLEMENTED);
});

// Get correlation — requires historical price data for multiple symbols
router.get('/correlation', async (req, res) => {
  const schema = Joi.object({
    symbols: Joi.alternatives()
      .try(
        Joi.array().items(Joi.string().max(20)).min(2),
        Joi.string().min(2)
      )
      .required(),
  });
  const { error, value } = schema.validate(req.query);
  if (error) return res.status(400).json({ error: error.details[0].message });

  const symbols: string[] = Array.isArray(value.symbols)
    ? value.symbols
    : String(value.symbols)
        .split(',')
        .map((s: string) => s.trim().toUpperCase())
        .filter(Boolean);
  if (symbols.length < 2) {
    return res.status(400).json({ error: 'At least 2 symbols required' });
  }

  return res.status(501).json(NOT_IMPLEMENTED);
});

export default router;
