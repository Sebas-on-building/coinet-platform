import type { NextApiRequest, NextApiResponse } from 'next';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { RedisService } from '../../../services/redis';

const redis = RedisService.getInstance();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  try {
    // TODO: Fetch user credentials from DB
    const allowCredentials = [];
    const options = generateAuthenticationOptions({
      rpID: req.headers.host?.split(':')[0] || 'localhost',
      timeout: 60000,
      userVerification: 'preferred',
      allowCredentials,
    });
    await redis.set(`webauthn:auth-challenge:${userId}`, options.challenge, 600);
    res.status(200).json(options);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
  // TODO: Add audit logging, device fingerprinting, analytics, extensibility hooks
} 