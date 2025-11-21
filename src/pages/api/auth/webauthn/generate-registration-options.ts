import type { NextApiRequest, NextApiResponse } from 'next';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { RedisService } from '../../../services/redis';
// import { logAuditEvent } from '../../../services/auditLog';
// import { t } from '../../../utils/i18n';

const redis = RedisService.getInstance();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  // TODO: Replace with real session/auth extraction
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  // TODO: Fetch user from DB for username/displayName
  const username = userId;
  const displayName = userId;
  try {
    const options = generateRegistrationOptions({
      rpName: 'Coinet',
      rpID: req.headers.host?.split(':')[0] || 'localhost',
      userID: userId,
      userName: username,
      userDisplayName: displayName,
      attestationType: 'indirect',
      authenticatorSelection: { userVerification: 'preferred', residentKey: 'preferred' },
      timeout: 60000,
      extensions: { credProps: true },
    });
    await redis.set(`webauthn:challenge:${userId}`, options.challenge, 600);
    // TODO: logAuditEvent({ event: 'webauthn.registration.options', userId });
    res.status(200).json(options);
  } catch (err) {
    // TODO: logAuditEvent({ event: 'webauthn.registration.error', userId, reason: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
  // TODO: Add device fingerprinting, analytics, extensibility hooks
} 