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

// Create alert
router.post('/', wrapAsync(async (req, res) => {
  const schema = Joi.object({
    symbol: Joi.string().required(),
    condition: Joi.string().required(),
    target: Joi.number().required(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ error: error.details[0].message });
    return;
  }
  const [alert] = await req.db('alerts').insert({ ...req.body, user_id: req.user!.id }).returning('*');
  res.json(alert);
  return;
}));

// List user alerts
router.get('/', wrapAsync(async (req, res) => {
  const alerts = await req.db('alerts').where({ user_id: req.user!.id });
  res.json(alerts);
  return;
}));

// Update alert
router.put('/:id', wrapAsync(async (req, res) => {
  const schema = Joi.object({
    condition: Joi.string(),
    target: Joi.number(),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ error: error.details[0].message });
    return;
  }
  const [alert] = await req.db('alerts').where({ id: req.params.id, user_id: req.user!.id }).update(req.body).returning('*');
  res.json(alert);
  return;
}));

// Delete alert
router.delete('/:id', wrapAsync(async (req, res) => {
  await req.db('alerts').where({ id: req.params.id, user_id: req.user!.id }).del();
  res.json({ ok: true });
  return;
}));

export default router; 