import { Router } from 'express';
import Joi from 'joi';

const router = Router();

// Example: Get price endpoint
router.get('/price', async (req, res) => {
  const schema = Joi.object({
    symbol: Joi.string().required(),
    quote: Joi.string().required(),
  });
  const { error, value } = schema.validate(req.query);
  if (error) return res.status(400).json({ error: error.details[0].message });
  // TODO: Fetch price from service
  // const price = await MarketService.getPrice(value.symbol, value.quote);
  // return res.json({ price });
  return res.json({ price: 123.45 });
});

export default router; 