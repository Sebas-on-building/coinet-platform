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

// Create strategy
router.post('/', wrapAsync(async (req, res) => {
  const schema = Joi.object({
    name: Joi.string().required(),
    code: Joi.string().required(),
    description: Joi.string().allow(''),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ error: error.details[0].message });
    return;
  }
  const [strategy] = await req.db('strategies').insert({ ...req.body, user_id: req.user!.id }).returning('*');
  res.json(strategy);
  return;
}));

// List user strategies
router.get('/', wrapAsync(async (req, res) => {
  const strategies = await req.db('strategies').where({ user_id: req.user!.id });
  res.json(strategies);
  return;
}));

// Update strategy
router.put('/:id', wrapAsync(async (req, res) => {
  const schema = Joi.object({
    name: Joi.string(),
    code: Joi.string(),
    description: Joi.string().allow(''),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ error: error.details[0].message });
    return;
  }
  const [strategy] = await req.db('strategies').where({ id: req.params.id, user_id: req.user!.id }).update(req.body).returning('*');
  res.json(strategy);
  return;
}));

// Delete strategy
router.delete('/:id', wrapAsync(async (req, res) => {
  await req.db('strategies').where({ id: req.params.id, user_id: req.user!.id }).del();
  res.json({ ok: true });
  return;
}));

// Run strategy (stub)
router.post('/:id/run', wrapAsync(async (req, res) => {
  // TODO: Implement strategy execution
  res.json({ ok: true, message: 'Strategy run (stub)' });
  return;
}));

// Backtest strategy (stub)
router.post('/:id/backtest', wrapAsync(async (req, res) => {
  // TODO: Implement backtesting
  res.json({ ok: true, message: 'Backtest (stub)' });
  return;
}));

export default router; 