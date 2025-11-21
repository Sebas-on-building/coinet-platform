import client from 'prom-client';
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics();
export const requestCounter = new client.Counter({
  name: 'portfolio_requests_total',
  help: 'Total number of requests',
  labelNames: ['method', 'route', 'status'],
});
export const errorCounter = new client.Counter({
  name: 'portfolio_errors_total',
  help: 'Total number of errors',
  labelNames: ['method', 'route', 'status'],
});
export const latencyHistogram = new client.Histogram({
  name: 'portfolio_request_latency_seconds',
  help: 'Request latency in seconds',
  labelNames: ['method', 'route', 'status'],
}); 