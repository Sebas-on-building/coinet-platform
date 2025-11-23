// --- Error Handling Module for Coinet AI/Analytics Platform ---
// Modular, extensible, and world-class. Each feature is grouped and commented for clarity.

const { Logger } = require('./logger');
const logger = new Logger('error-handler');
let sentry = null;
try { sentry = require('@sentry/node'); } catch { }
let promClient = null;
try { promClient = require('prom-client'); } catch { }

// --- Sub-feature: Error Classification ---
function classifyError(err) {
  if (err.isUserError) return { code: err.code || 'UserError', status: err.status || 400 };
  return { code: err.code || 'InternalError', status: err.status || 500 };
}

// --- Sub-feature: Error Metrics (Prometheus) ---
let errorCounter = null;
if (promClient) {
  errorCounter = new promClient.Counter({
    name: 'coinet_errors_total',
    help: 'Total errors by type',
    labelNames: ['service', 'code', 'status'],
  });
}

// --- Centralized Express Error Middleware ---
function errorHandler(err, req, res, next) {
  logger.error('Request error', {
    requestId: req?.requestId,
    error: err.code || err.name || 'InternalError',
    message: err.message,
    status: err.status || 500,
  });
  res.status(err.status || 500).json({
    status: err.status || 500,
    error: err.code || err.name || 'InternalError',
    message: err.message,
  });
}

// --- Retry with Exponential Backoff ---
async function retry(fn, { retries = 3, delay = 100 } = {}) {
  let lastErr;
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      await new Promise(r => setTimeout(r, delay * Math.pow(2, i)));
    }
  }
  throw lastErr;
}

// --- Circuit Breaker Class ---
class CircuitBreaker {
  constructor(fn, { failureThreshold = 5, cooldown = 10000 } = {}) {
    this.fn = fn;
    this.failureThreshold = failureThreshold;
    this.cooldown = cooldown;
    this.failures = 0;
    this.lastFailure = 0;
    this.open = false;
  }
  async call(...args) {
    if (this.open && Date.now() - this.lastFailure < this.cooldown) {
      throw new Error('Circuit breaker open');
    }
    try {
      const result = await this.fn(...args);
      this.failures = 0;
      this.open = false;
      return result;
    } catch (err) {
      this.failures++;
      this.lastFailure = Date.now();
      if (this.failures >= this.failureThreshold) this.open = true;
      throw err;
    }
  }
}

// --- Fallback Helper ---
async function withFallback(mainFn, fallbackFn) {
  try {
    return await mainFn();
  } catch (err) {
    logger.warn('Fallback triggered', { error: err.message });
    return await fallbackFn();
  }
}

// --- Exported Error Handling API ---
module.exports = {
  errorHandler,
  retry,
  CircuitBreaker,
  withFallback,
  classifyError,
}; 