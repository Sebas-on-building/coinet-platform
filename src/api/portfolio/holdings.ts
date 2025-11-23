import { Router } from 'express';
import Joi from 'joi';

const router = Router();

// List holdings
router.get('/', async (req, res) => {
  // TODO: Fetch holdings for user
  return res.json({ holdings: [] });
});

// Add holding
router.post('/', async (req, res) => {
  const schema = Joi.object({
    symbol: Joi.string().required(),
    amount: Joi.number().positive().required(),
    price: Joi.number().positive().required(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  // TODO: Add holding
  return res.status(201).json({ holding: value });
});

// Update holding
router.put('/:id', async (req, res) => {
  const schema = Joi.object({
    amount: Joi.number().positive(),
    price: Joi.number().positive(),
  });
  const { error, value } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  // TODO: Update holding
  return res.json({ holding: { id: req.params.id, ...value } });
});

// Delete holding
router.delete('/:id', async (req, res) => {
  // TODO: Delete holding
  return res.status(204).send();
});

export default router; 