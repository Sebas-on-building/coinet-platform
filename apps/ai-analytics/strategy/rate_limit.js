const rateLimit = require('express-rate-limit');

// --- General Rate Limiter (per IP) ---
function generalRateLimiter() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests, please try again later.'
  });
}

// --- Auth Rate Limiter (stricter for login/signup) ---
function authRateLimiter() {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 requests per 15 min per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many login attempts, please try again later.'
  });
}

// --- Custom Rate Limiter (per user/route) ---
function customRateLimiter({ windowMs, max, keyGenerator }) {
  return rateLimit({
    windowMs,
    max,
    keyGenerator,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Rate limit exceeded.'
  });
}

module.exports = {
  generalRateLimiter,
  authRateLimiter,
  customRateLimiter,
}; 