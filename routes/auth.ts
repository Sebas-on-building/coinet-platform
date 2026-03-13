import express from 'express';
import jwt from 'jsonwebtoken';
import * as cache from '../services/cache';

const router = express.Router();

function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error('JWT_SECRET must be set in environment (min 32 chars). Generate: openssl rand -base64 32');
  }
  return s;
}

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  // Authenticate user (pseudo-code)
  const user = { id: 1, username };
  const secret = getJwtSecret();
  const token = jwt.sign(user, secret, { expiresIn: '15m' });
  const refreshToken = jwt.sign(user, secret, { expiresIn: '7d' });
  await cache.setSession(refreshToken, user, 7 * 24 * 3600); // Store refresh token in Redis
  res.json({ token, refreshToken });
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  const session = await cache.getSession(refreshToken);
  if (!session) return res.status(401).json({ error: 'Invalid refresh token' });
  const token = jwt.sign(session, getJwtSecret(), { expiresIn: '15m' });
  res.json({ token });
});

router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  await cache.setSession(refreshToken, null, 0);
  res.json({ ok: true });
});

export default router; 