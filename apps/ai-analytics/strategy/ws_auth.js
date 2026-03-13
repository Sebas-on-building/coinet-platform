const jwt = require('jsonwebtoken');
const { Logger } = require('./logger');
const logger = new Logger('ws-auth');

// --- Validate WebSocket Protocol (wss:// only) ---
function requireWSS(req) {
  // In Node.js, check req.connection.encrypted or req.secure
  return req.connection && req.connection.encrypted;
}

// --- Authenticate WebSocket Handshake ---
function authenticateWS(info, cb) {
  const url = new URL(info.req.url, 'https://dummy');
  const token = url.searchParams.get('token') || info.req.headers['sec-websocket-protocol'];
  if (!requireWSS(info.req)) {
    logger.warn('Rejected non-wss connection');
    return cb(false, 401, 'WSS required');
  }
  if (!token) {
    logger.warn('Rejected WS: No token');
    return cb(false, 401, 'Token required');
  }
  const secret = process.env.WS_JWT_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    logger.warn('WS_JWT_SECRET or JWT_SECRET must be set (min 32 chars)');
    return cb(false, 503, 'Auth not configured');
  }
  try {
    const payload = jwt.verify(token, secret);
    info.req.user = payload;
    cb(true);
  } catch (err) {
    logger.warn('Rejected WS: Invalid token', { error: err.message });
    cb(false, 401, 'Invalid token');
  }
}

module.exports = { authenticateWS }; 