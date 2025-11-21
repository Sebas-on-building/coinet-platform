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
  // Example: JWT verification (replace with your secret)
  try {
    const payload = jwt.verify(token, process.env.WS_JWT_SECRET || 'supersecret');
    info.req.user = payload;
    cb(true);
  } catch (err) {
    logger.warn('Rejected WS: Invalid token', { error: err.message });
    cb(false, 401, 'Invalid token');
  }
}

module.exports = { authenticateWS }; 