// --- Prometheus Metrics Module for Coinet AI/Analytics Platform ---
// Modular, extensible, and world-class. Each metric is grouped and commented for clarity.

let promClient = null;
try { promClient = require('prom-client'); } catch { }
const os = require('os');

// --- Registry ---
const registry = promClient ? new promClient.Registry() : null;

// --- HTTP Request Metrics ---
const httpRequestCounter = promClient ? new promClient.Counter({
  name: 'coinet_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'endpoint', 'status'],
  registers: [registry],
}) : null;
const httpRequestDuration = promClient ? new promClient.Histogram({
  name: 'coinet_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'endpoint', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5],
  registers: [registry],
}) : null;

// --- Error Counters ---
const errorCounter = promClient ? new promClient.Counter({
  name: 'coinet_http_errors_total',
  help: 'Total HTTP errors',
  labelNames: ['status', 'endpoint'],
  registers: [registry],
}) : null;

// --- Business Metrics ---
const activeWebsockets = promClient ? new promClient.Gauge({
  name: 'coinet_active_websockets',
  help: 'Number of active websocket connections',
  registers: [registry],
}) : null;
const alertsTriggered = promClient ? new promClient.Counter({
  name: 'coinet_alerts_triggered_total',
  help: 'Number of alerts triggered',
  registers: [registry],
}) : null;

// --- System Metrics ---
if (promClient && registry) {
  promClient.collectDefaultMetrics({ register: registry });
}

// --- Kafka Consumer Lag ---
const kafkaConsumerLag = promClient ? new promClient.Gauge({
  name: 'coinet_kafka_consumer_lag',
  help: 'Kafka consumer lag by topic/partition',
  labelNames: ['topic', 'partition'],
  registers: [registry],
}) : null;

// --- Cache Hit/Miss Rates ---
const cacheHits = promClient ? new promClient.Counter({
  name: 'coinet_cache_hits_total',
  help: 'Total cache hits',
  registers: [registry],
}) : null;
const cacheMisses = promClient ? new promClient.Counter({
  name: 'coinet_cache_misses_total',
  help: 'Total cache misses',
  registers: [registry],
}) : null;

// --- DB Query Duration ---
const dbQueryDuration = promClient ? new promClient.Histogram({
  name: 'coinet_db_query_duration_seconds',
  help: 'DB query duration in seconds',
  buckets: [0.001, 0.01, 0.05, 0.1, 0.2, 0.5, 1, 2],
  registers: [registry],
}) : null;

// --- Notification Delivery ---
const notificationSuccess = promClient ? new promClient.Counter({
  name: 'coinet_notification_success_total',
  help: 'Notification delivery successes',
  registers: [registry],
}) : null;
const notificationFailure = promClient ? new promClient.Counter({
  name: 'coinet_notification_failure_total',
  help: 'Notification delivery failures',
  registers: [registry],
}) : null;

// --- HTTP Metrics Middleware ---
function metricsMiddleware(req, res, next) {
  if (!promClient) return next();
  const end = httpRequestDuration.startTimer({ method: req.method, endpoint: req.path });
  res.on('finish', () => {
    httpRequestCounter.inc({ method: req.method, endpoint: req.path, status: res.statusCode });
    end({ status: res.statusCode });
    if (res.statusCode >= 400 && errorCounter) errorCounter.inc({ status: res.statusCode, endpoint: req.path });
  });
  next();
}

// --- /metrics Endpoint ---
async function metricsEndpoint(req, res) {
  if (!promClient) return res.status(501).send('Prometheus not available');
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
}

// --- Exported Metrics ---
module.exports = {
  metricsMiddleware,
  metricsEndpoint,
  activeWebsockets,
  alertsTriggered,
  kafkaConsumerLag,
  cacheHits,
  cacheMisses,
  dbQueryDuration,
  notificationSuccess,
  notificationFailure,
}; 