import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';

const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'code'],
  buckets: [50, 100, 200, 300, 400, 500, 1000],
});

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    end({ method: req.method, route: req.route?.path, code: res.statusCode });
  });
  next();
}

export function exposeMetrics(req: Request, res: Response) {
  res.set('Content-Type', client.register.contentType);
  res.end(client.register.metrics());
} 