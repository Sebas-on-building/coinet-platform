import type { NextApiRequest, NextApiResponse } from 'next';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { RedisService } from '../../../services/redis';
// import { logAuditEvent } from '../../../services/auditLog';
// import { t } from '../../../utils/i18n';

const redis = RedisService.getInstance();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });
  const body = req.body;
  try {
    const expectedChallenge = await redis.get<string>(`webauthn:challenge:${userId}`);
    if (!expectedChallenge) return res.status(400).json({ error: 'Challenge expired' });
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: `https://${req.headers.host}`,
      expectedRPID: req.headers.host?.split(':')[0] || 'localhost',
    });
    if (!verification.verified) return res.status(400).json({ error: 'Verification failed' });
    // TODO: Store credential info in DB for userId
    // TODO: logAuditEvent({ event: 'webauthn.registration.verified', userId });
    res.status(200).json({ success: true, credential: verification.registrationInfo });
  } catch (err) {
    // TODO: logAuditEvent({ event: 'webauthn.registration.error', userId, reason: err.message });
    res.status(500).json({ error: 'Internal server error' });
  }
  // TODO: Add device fingerprinting, analytics, extensibility hooks
} 