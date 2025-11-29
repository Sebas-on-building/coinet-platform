const crypto = require('crypto');
const { getSecret } = require('./secrets_manager');

// --- Load JWT Secret from Secrets Manager ---
async function getJWTSecret() {
  const secret = await getSecret('JWT_SECRET', process.env.SECRETS_PROVIDER || 'env');
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 256 bits (32 chars)');
  }
  return secret;
}

// --- Key Rotation: Support Multiple Keys from Secrets Manager ---
async function getJWTKeySet() {
  const keyset = await getSecret('JWT_KEYSET', process.env.SECRETS_PROVIDER || 'env').catch(() => '');
  const keys = keyset.split(',').filter(Boolean);
  if (keys.length === 0) return [await getJWTSecret()];
  return keys;
}

// --- Generate Strong Secret (for admin use) ---
function generateStrongSecret() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  getJWTSecret,
  getJWTKeySet,
  generateStrongSecret,
}; 