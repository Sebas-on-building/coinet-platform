import type { NextApiRequest, NextApiResponse } from 'next';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { t } from '../../../utils/i18n';
import { RedisService } from '../../../services/redis';
import { logAuditEvent } from '../../../services/auditLog';
import { RateLimiter } from '../../../utils/rateLimiter';

const redis = RedisService.getInstance();
const setupLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: 5, message: t('error.too_many_requests') });

// Atomic helper: Generate TOTP secret and QR
function generateTotpSecret(userId: string) {
  const secret = speakeasy.generateSecret({ name: `Coinet (${userId})` });
  return secret;
}

async function generateQrCode(otpauthUrl: string) {
  return qrcode.toDataURL(otpauthUrl);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: t('error.method_not_allowed') });
  // TODO: Replace with real session/auth extraction
  const userId = req.headers['x-user-id'] as string;
  if (!userId) return res.status(401).json({ error: t('error.unauthorized') });
  // Rate limit per user
  if (!(await setupLimiter.checkLimit(`2fa-setup:${userId}`))) {
    await logAuditEvent({ event: '2fa.setup.rate_limited', email: userId, ip: req.headers['x-forwarded-for'], userAgent: req.headers['user-agent'] });
    return res.status(429).json({ error: t('error.too_many_requests') });
  }
  try {
    const secret = generateTotpSecret(userId);
    await redis.set(`2fa:secret:${userId}`, secret.base32, 600); // 10 min expiry
    const qr = await generateQrCode(secret.otpauth_url!);
    await logAuditEvent({ event: '2fa.setup.initiated', email: userId, ip: req.headers['x-forwarded-for'], userAgent: req.headers['user-agent'] });
    res.status(200).json({ qr, secret: secret.base32 });
  } catch (err) {
    await logAuditEvent({ event: '2fa.setup.error', email: userId, reason: (err as Error).message });
    res.status(500).json({ error: t('error.server_error') });
  }
  // TODO: Add WebAuthn/FIDO2 setup, device fingerprinting, magic link support
} 