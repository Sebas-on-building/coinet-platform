/**
 * Get JWT_SECRET from environment. No fallbacks - fails fast if not configured.
 * Required for security: weak/blank secrets allow token forgery.
 */
export function getJwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) {
    throw new Error('JWT_SECRET must be set in environment (min 32 chars). Generate: openssl rand -base64 32');
  }
  return s;
}
