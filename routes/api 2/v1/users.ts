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

// Get current user profile
router.get('/me', wrapAsync(async (req, res) => {
  const user = await req.db('users').where({ id: req.user!.id }).first();
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
  return;
}));

// Update current user profile
router.put('/me', wrapAsync(async (req, res) => {
  const schema = Joi.object({
    username: Joi.string().min(2).max(32),
    email: Joi.string().email(),
    password: Joi.string().min(8),
  });
  const { error } = schema.validate(req.body);
  if (error) {
    res.status(400).json({ error: error.details[0].message });
    return;
  }
  const [user] = await req.db('users').where({ id: req.user!.id }).update(req.body).returning('*');
  res.json(user);
  return;
}));

// List all users (admin only)
router.get('/', wrapAsync(async (req, res) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  const users = await req.db('users').select('*');
  res.json(users);
  return;
}));

// Delete a user (admin only)
router.delete('/:id', wrapAsync(async (req, res) => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  await req.db('users').where({ id: req.params.id }).del();
  res.json({ ok: true });
  return;
}));

export default router; 