// --- Structured Logger for Coinet AI/Analytics Platform ---
// Modular, extensible, and world-class. Each feature is grouped and commented for clarity.

const util = require('util');
const os = require('os');
const isDev = process.env.NODE_ENV !== 'production';

// --- Helper: Get ISO timestamp ---
function getTimestamp() {
  return new Date().toISOString();
}

// --- Helper: Format log entry as JSON ---
function formatLog(level, service, message, meta = {}) {
  return JSON.stringify({
    timestamp: getTimestamp(),
    level,
    service,
    message,
    ...meta,
    hostname: os.hostname(),
    pid: process.pid,
  });
}

// --- Logger Class ---
class Logger {
  constructor(service) {
    this.service = service;
  }
  // --- Log at DEBUG level (dev only) ---
  debug(message, meta) {
    if (isDev) this._log('DEBUG', message, meta);
  }
  // --- Log at INFO level ---
  info(message, meta) {
    this._log('INFO', message, meta);
  }
  // --- Log at WARN level ---
  warn(message, meta) {
    this._log('WARN', message, meta);
  }
  // --- Log at ERROR level ---
  error(message, meta) {
    this._log('ERROR', message, meta);
  }
  // --- Log at FATAL level and exit ---
  fatal(message, meta) {
    this._log('FATAL', message, meta);
    process.exit(1);
  }
  // --- Internal log function ---
  _log(level, message, meta = {}) {
    const entry = formatLog(level, this.service, message, meta);
    if (isDev) {
      // Pretty print in dev
      const color = {
        'DEBUG': '\x1b[36m',
        'INFO': '\x1b[32m',
        'WARN': '\x1b[33m',
        'ERROR': '\x1b[31m',
        'FATAL': '\x1b[41m',
      }[level] || '\x1b[0m';
      console.log(color, entry, '\x1b[0m');
    } else {
      console.log(entry);
    }
  }
}

// --- Middleware: Correlation/Request ID ---
function correlationIdMiddleware(req, res, next) {
  req.requestId = req.headers['x-request-id'] || generateRequestId();
  res.setHeader('X-Request-ID', req.requestId);
  next();
}
// --- Helper: Generate unique requestId ---
function generateRequestId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
// --- Helper: Add requestId to downstream headers ---
function withRequestIdHeaders(requestId) {
  return { 'X-Request-ID': requestId };
}

// --- Exported Logger API ---
module.exports = {
  Logger,
  correlationIdMiddleware,
  withRequestIdHeaders,
}; 