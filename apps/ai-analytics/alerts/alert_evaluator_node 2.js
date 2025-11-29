const { Logger, correlationIdMiddleware, withRequestIdHeaders } = require('../strategy/logger');
const { errorHandler, retry, CircuitBreaker, withFallback } = require('../strategy/errorHandler');
const { metricsMiddleware, metricsEndpoint, alertsTriggered } = require('../strategy/metrics');
const { v4: uuidv4 } = require('uuid');
const express = require('express');
const app = express();
const logger = new Logger('alert-evaluator');
const validation = require('../strategy/validation');

// --- Prometheus /metrics endpoint ---
app.use(metricsMiddleware);
app.get('/metrics', metricsEndpoint);

// --- Centralized Error Handler ---
app.use(errorHandler);

const { Kafka } = require('kafkajs');
const { Pool } = require('pg');
const Redis = require('ioredis');
const { sendAllNotifications } = require('./notification');

const kafka = new Kafka({ brokers: ['localhost:9092'] });
const consumer = kafka.consumer({ groupId: 'alert-evaluator' });
const redis = new Redis();
const db = new Pool({
  user: 'ai',
  host: 'localhost',
  database: 'timescale',
  password: 'ai',
  port: 5432,
});

function percentChange(current, previous) {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

async function getMovingAverage(symbol, window = 10) {
  const { rows } = await db.query(
    'SELECT price FROM market_data WHERE symbol=$1 ORDER BY time DESC LIMIT $2',
    [symbol, window]
  );
  if (rows.length < window) return null;
  const sum = rows.reduce((acc, r) => acc + Number(r.price), 0);
  return sum / window;
}

function checkCondition(alert, tick, context) {
  switch (alert.type) {
    case 'price':
      if ((alert.condition === 'gt' || alert.condition === 'above') && tick.price > alert.threshold) return true;
      if ((alert.condition === 'lt' || alert.condition === 'below') && tick.price < alert.threshold) return true;
      break;
    case 'percent_change':
      if (!context.previousPrice) return false;
      const change = percentChange(tick.price, context.previousPrice);
      if ((alert.condition === 'gt' || alert.condition === 'above') && change > alert.threshold) return true;
      if ((alert.condition === 'lt' || alert.condition === 'below') && change < alert.threshold) return true;
      break;
    case 'moving_average':
      if (!context.movingAverage) return false;
      if ((alert.condition === 'gt' || alert.condition === 'above') && tick.price > context.movingAverage) return true;
      if ((alert.condition === 'lt' || alert.condition === 'below') && tick.price < context.movingAverage) return true;
      break;
    case 'multi':
      // Multi-condition: AND/OR
      if (!Array.isArray(alert.conditions)) return false;
      if (alert.operator === 'AND') {
        return alert.conditions.every(cond => checkCondition(cond, tick, context));
      } else if (alert.operator === 'OR') {
        return alert.conditions.some(cond => checkCondition(cond, tick, context));
      }
      break;
    default:
      return false;
  }
  return false;
}

// --- Helper: Generate/propagate requestId ---
function getRequestId(context) {
  return context?.requestId || uuidv4();
}

// --- Helper: Structured log for alert events ---
function logAlertEvent(level, message, meta) {
  logger[level](message, meta);
}

// --- Helper: Retry/circuit breaker/fallback for DB/notification ---
const dbBreaker = new CircuitBreaker(async (...args) => await db.query(...args));
const notifyBreaker = new CircuitBreaker(async (payload) => await sendAllNotifications(payload));

// --- Main Tick Processor ---
async function processTick(tick, context = {}) {
  const requestId = getRequestId(context);
  try {
    // Fetch all active alerts for this symbol (with retry/circuit breaker/fallback)
    const { rows: alerts } = await withFallback(
      () => retry(() => dbBreaker.call('SELECT * FROM alerts WHERE symbol=$1 AND is_active=TRUE', [tick.symbol]), { retries: 3 }),
      async () => { logger.warn('Falling back to empty alerts', { requestId }); return { rows: [] }; }
    );
    // Validate and sanitize each alert
    const validAlerts = alerts.filter(alert => {
      const { valid } = validation.validateWithSchema(alert, validation.alertSchema);
      return valid && validation.validateSymbol(alert.symbol) && validation.validateUsername(alert.user_id);
    });
    // For percent change
    let previousPrice = null;
    let movingAverage = null;
    if (validAlerts.some(a => a.type === 'percent_change')) {
      const { rows: prev } = await withFallback(
        () => retry(() => dbBreaker.call('SELECT price FROM market_data WHERE symbol=$1 ORDER BY time DESC LIMIT 2', [tick.symbol]), { retries: 3 }),
        async () => ({ rows: [] })
      );
      if (prev.length === 2) previousPrice = Number(prev[1].price);
    }
    if (validAlerts.some(a => a.type === 'moving_average')) {
      movingAverage = await getMovingAverage(tick.symbol, 10);
    }
    for (const alert of validAlerts) {
      const now = new Date();
      const last = alert.last_triggered;
      const cooldown = alert.cooldown || 3600;
      if (last && (now - new Date(last)) / 1000 < cooldown) continue;
      const triggered = checkCondition(alert, tick, { previousPrice, movingAverage });
      if (triggered) {
        await withFallback(
          () => retry(() => notifyBreaker.call({
            userId: alert.user_id,
            alertId: alert.id,
            symbol: validation.sanitizeString(tick.symbol, 12),
            price: tick.price,
            webhookUrl: alert.webhook_url,
            requestId
          }), { retries: 3 }),
          async () => logger.error('Notification fallback', { requestId, alertId: alert.id })
        );
        if (alertsTriggered) alertsTriggered.inc();
        await db.query('UPDATE alerts SET is_active=FALSE, last_triggered=NOW() WHERE id=$1', [alert.id]);
        logAlertEvent('info', 'Alert triggered', {
          requestId,
          userId: alert.user_id,
          alertId: alert.id,
          symbol: tick.symbol,
          price: tick.price,
          type: alert.type
        });
      }
    }
  } catch (err) {
    logger.error('processTick error', { requestId, error: err.message, stack: err.stack });
    throw err;
  }
}

// --- Main Kafka Consumer Loop ---
async function run() {
  await consumer.connect();
  await consumer.subscribe({ topic: 'market.ticks', fromBeginning: false });
  await consumer.run({
    eachMessage: async ({ message }) => {
      const tick = JSON.parse(message.value.toString());
      await processTick(tick, { requestId: uuidv4() });
    },
  });
}

run().catch(err => logger.fatal('Fatal error in alert evaluator', { error: err.message, stack: err.stack }));

// --- Express server for /metrics and error handling ---
app.listen(4200, () => {
  logger.info('Alert Evaluator metrics server running on http://localhost:4200/metrics');
}); 