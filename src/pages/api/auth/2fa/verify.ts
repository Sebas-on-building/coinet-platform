import type { NextApiRequest, NextApiResponse } from 'next';
import speakeasy from 'speakeasy';
import crypto from 'crypto';
import { t } from '@/utils/i18n';
import { RedisService } from '@/services/redis';
import { logAuditEvent } from '@/services/auditLog';
import { RateLimiter } from '@/utils/rateLimiter';

const redis = RedisService.getInstance();
const verifyLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: 5, message: t('error.too_many_requests') });

// Atomic helper: Generate backup codes (10 codes, 10 chars each)
function generateBackupCodes(count = 10, length = 10): string[] {
  return Array.from({ length: count }, () =>
    crypto.randomBytes(length).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, length)
  );
}

// Atomic helper: Hash backup codes for storage
function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: t('error.method_not_allowed') });
  // TODO: Replace with real session/auth extraction
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: t('error.unauthorized') });
  // Rate limit per user
  if (!(await verifyLimiter.checkLimit(`2fa-verify:${userId}`))) {
    await logAuditEvent({ event: '2fa.verify.rate_limited', email: userId, ip: req.headers['x-forwarded-for'], userAgent: req.headers['user-agent'] });
    return res.status(429).json({ error: t('error.too_many_requests') });
  }
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: t('error.missing_fields') });
  try {
    const secret = await redis.get<string>(`2fa:secret:${userId}`);
    if (!secret) return res.status(400).json({ error: t('error.unauthorized') });
    // Brute-force lockout: count failed attempts
    const failKey = `2fa:fail:${userId}`;
    const failCount = (await redis.get<number>(failKey)) || 0;
    if (failCount >= 5) {
      await logAuditEvent({ event: '2fa.verify.locked', email: userId });
      return res.status(429).json({ error: t('error.too_many_attempts') });
    }
    const verified = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
    if (!verified) {
      await redis.set(failKey, failCount + 1, 600); // 10 min lockout
      await logAuditEvent({ event: '2fa.verify.failed', email: userId });
      return res.status(400).json({ error: t('error.invalid_code') });
    }
    // Success: clear fail count, generate backup codes
    await redis.delete(failKey);
    const backupCodes = generateBackupCodes();
    const hashedCodes = backupCodes.map(hashBackupCode);
    await redis.set(`2fa:backup:${userId}`, hashedCodes, 365 * 24 * 60 * 60); // 1 year expiry
    // Mark 2FA as enabled (TODO: update user profile in DB)
    await logAuditEvent({ event: '2fa.verify.success', email: userId });
    res.status(200).json({ backupCodes });
  } catch (err) {
    await logAuditEvent({ event: '2fa.verify.error', email: userId, reason: (err as Error).message });
    res.status(500).json({ error: t('error.server_error') });
  }
  // TODO: Add WebAuthn/FIDO2 verification, device fingerprinting, magic link support
} 