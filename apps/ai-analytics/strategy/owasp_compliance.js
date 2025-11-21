const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { getJWTSecret, getJWTKeySet } = require('./jwt_secrets');
const { auditSecretAccess, writeAuditLog } = require('./audit_logger');
const { generalRateLimiter, customRateLimiter } = require('./rate_limit');

// --- Injection: Input Validation Middleware ---
function validateInput(validators) {
  return async (req, res, next) => {
    await Promise.all(validators.map(v => v.run(req)));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      writeAuditLog({ user: req.user?.id, action: 'input:invalid', resource: req.path, status: 'fail', meta: { errors: errors.array() } });
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  };
}

// --- Broken Auth: JWT Validation Middleware ---
async function requireJWT(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing token' });
  const token = auth.slice(7);
  let valid = false, payload = null;
  const keys = await getJWTKeySet();
  for (const key of keys) {
    try {
      payload = jwt.verify(token, key);
      valid = true;
      break;
    } catch { }
  }
  if (!valid) return res.status(401).json({ error: 'Invalid token' });
  // Optionally: check token revocation (e.g., after password change)
  if (await isTokenRevoked(payload)) return res.status(401).json({ error: 'Token revoked' });
  req.user = payload;
  next();
}

// --- Token Invalidation (on password change) ---
async function isTokenRevoked(payload) {
  // Example: check a token blacklist or user password change timestamp
  // Implement with Redis, DB, or in-memory store
  return false;
}

// --- Excessive Data Exposure: Field Whitelisting ---
function whitelistFields(obj, allowed) {
  const result = {};
  for (const key of allowed) if (obj[key] !== undefined) result[key] = obj[key];
  return result;
}

// --- GraphQL Query Depth Limiting ---
function graphqlDepthLimit(maxDepth) {
  return (req, res, next) => {
    // Use a library like graphql-depth-limit in production
    // Here: placeholder for integration
    next();
  };
}

// --- Broken Access Control: Server-Side Checks ---
function requireOwnership(param = 'user_id') {
  return (req, res, next) => {
    if (!req.user || req.user.id !== req.body[param] && req.user.id !== req.query[param]) {
      writeAuditLog({ user: req.user?.id, action: 'access:denied', resource: req.path, status: 'fail', meta: { param } });
      return res.status(403).json({ error: 'Forbidden: not owner' });
    }
    next();
  };
}

// --- Rate Limiting: Resource-Intensive Endpoint Protection ---
function resourceRateLimiter(max = 10, windowMs = 60 * 1000) {
  return customRateLimiter({ windowMs, max, keyGenerator: req => req.user?.id || req.ip });
}

// --- Logging: Incident/Event Logging ---
function logIncident({ user, action, resource, status, meta }) {
  writeAuditLog({ user, action, resource, status, meta });
}

module.exports = {
  validateInput,
  requireJWT,
  isTokenRevoked,
  whitelistFields,
  graphqlDepthLimit,
  requireOwnership,
  resourceRateLimiter,
  logIncident,
}; 