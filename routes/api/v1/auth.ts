import express from 'express';
import jwt from 'jsonwebtoken';
import * as cache from '../../../services/cache';
import { injectDb } from '../../../middleware/dbAndUser';

const router = express.Router();
router.use(injectDb);

// Register new user
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  // TODO: Hash password and validate input
  const [user] = await req.db('users').insert({ username, email, password_hash: password }).returning('*');
  res.json(user);
});

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  // TODO: Validate password
  const user = await req.db('users').where({ username }).first();
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign(user, process.env.JWT_SECRET || 'secret', { expiresIn: '15m' });
  const refreshToken = jwt.sign(user, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
  await cache.setSession(refreshToken, user, 7 * 24 * 3600);
  res.json({ token, refreshToken });
});

// Refresh JWT
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  const session = await cache.getSession(refreshToken);
  if (!session) return res.status(401).json({ error: 'Invalid refresh token' });
  const token = jwt.sign(session, process.env.JWT_SECRET || 'secret', { expiresIn: '15m' });
  res.json({ token });
});

export default router; 