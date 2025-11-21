const fs = require('fs');
const path = require('path');
const { auditSecretAccess, auditSecretRotation } = require('./audit_logger');

// --- Load Secret from Environment Variable ---
function getEnvSecret(name, user = 'system', service = 'unknown') {
  const value = process.env[name];
  auditSecretAccess({ user, secret: name, action: 'read', status: value ? 'success' : 'fail', meta: { service } });
  if (!value) throw new Error(`Secret ${name} not set in environment`);
  return value;
}

// --- Load Secret from HashiCorp Vault (mock/example) ---
async function getVaultSecret(key, user = 'system', service = 'unknown') {
  const vaultPath = process.env.VAULT_PATH || path.join(__dirname, '../../vault/');
  const file = path.join(vaultPath, key);
  const exists = fs.existsSync(file);
  auditSecretAccess({ user, secret: key, action: 'read', status: exists ? 'success' : 'fail', meta: { service } });
  if (!exists) throw new Error(`Vault secret ${key} not found`);
  return fs.readFileSync(file, 'utf8').trim();
}

// --- Load Secret from AWS Secrets Manager (mock/example) ---
async function getAWSSecret(secretId, user = 'system', service = 'unknown') {
  // In production, use AWS SDK
  const value = process.env[secretId];
  auditSecretAccess({ user, secret: secretId, action: 'read', status: value ? 'success' : 'fail', meta: { service } });
  return value;
}

// --- Centralized Secret Loader ---
async function getSecret(name, provider = 'env', user = 'system', service = 'unknown') {
  if (provider === 'vault') return getVaultSecret(name, user, service);
  if (provider === 'aws') return getAWSSecret(name, user, service);
  return getEnvSecret(name, user, service);
}

// --- Secret Rotation (for DevOps automation) ---
async function rotateSecret(name, newValue, provider = 'env', user = 'system', service = 'unknown') {
  let status = 'success';
  try {
    if (provider === 'vault') {
      const vaultPath = process.env.VAULT_PATH || path.join(__dirname, '../../vault/');
      fs.writeFileSync(path.join(vaultPath, name), newValue);
    } else if (provider === 'aws') {
      // Use AWS SDK to update secret
    } else {
      throw new Error('Manual rotation required for env secrets');
    }
  } catch (err) {
    status = 'fail';
    throw err;
  } finally {
    auditSecretRotation({ user, secret: name, status, meta: { service } });
  }
  return true;
}

module.exports = {
  getSecret,
  rotateSecret,
}; 