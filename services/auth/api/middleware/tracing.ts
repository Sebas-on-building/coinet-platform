import { Request, Response, NextFunction } from 'express';
import { trace } from '@opentelemetry/api';

export function traceMiddleware(req: Request, res: Response, next: NextFunction) {
  const span = trace.getTracer('auth-service').startSpan(`${req.method} ${req.url}`);
  res.on('finish', () => {
    span.end();
  });
  next();
} 