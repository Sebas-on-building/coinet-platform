import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import * as cache from '../../../services/cache';
import { injectDb } from '../../../middleware/dbAndUser';

const router = express.Router();
router.use(injectDb);

const BCRYPT_ROUNDS = 12;
function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error('JWT_SECRET must be set in environment (min 32 chars). Generate: openssl rand -base64 32');
  }
  return s;
}

const signupSchema = z.object({
  username: z.string().min(2).max(64).regex(/^[a-zA-Z0-9_-]+$/, 'Username: letters, numbers, underscore, hyphen only'),
  email: z.string().email().max(254).transform((e) => e.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-zA-Z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
});

const loginSchema = z.object({
  username: z.string().min(1, 'Username required'),
  password: z.string().min(1, 'Password required'),
});

// Register new user
router.post('/signup', async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' });
  }
  const { username, email, password } = parsed.data;

  const existing = await req.db('users').where({ email }).orWhere({ username }).first();
  if (existing) {
    return res.status(409).json({ error: 'Email or username already registered' });
  }

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const [user] = await req.db('users').insert({ username, email, password_hash }).returning('*');
  if (!user) return res.status(500).json({ error: 'Registration failed' });
  delete (user as Record<string, unknown>).password_hash;
  res.status(201).json(user);
});

// Login
router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0]?.message ?? 'Validation failed' });
  }
  const { username, password } = parsed.data;

  const user = await req.db('users').where({ username }).first();
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const password_hash = user.password_hash ?? user.passwordHash ?? user.password_hash;
  if (!password_hash || !(await bcrypt.compare(password, String(password_hash)))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const secret = getJwtSecret();
  const payload = { id: user.id, username: user.username, email: user.email };
  const token = jwt.sign(payload, secret, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, secret, { expiresIn: '7d' });
  await cache.setSession(refreshToken, payload, 7 * 24 * 3600);
  res.json({ token, refreshToken });
});

// Refresh JWT
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken required' });
  const session = await cache.getSession(refreshToken);
  if (!session) return res.status(401).json({ error: 'Invalid refresh token' });
  const token = jwt.sign(session, getJwtSecret(), { expiresIn: '15m' });
  res.json({ token });
});

export default router; 