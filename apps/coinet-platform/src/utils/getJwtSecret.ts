/**
 * Read JWT_SECRET from the environment.
 *
 * Returns the secret when present and long enough, or null when JWT_SECRET is
 * not configured (Clerk-only deployments).  Never returns a secret shorter
 * than 32 characters — that would be weaker than brute-force resistance
 * demands for HS256.
 *
 * Throws only when the variable exists but is too short, which is a
 * misconfiguration that should fail loudly at startup.
 */
export function getJwtSecret(): string | null {
  const s = process.env.JWT_SECRET;
  if (!s) return null;
  if (s.length < 32) {
    throw new Error(
      'JWT_SECRET is set but too short (minimum 32 characters). ' +
        'Generate a secure value: openssl rand -base64 32'
    );
  }
  return s;
}
