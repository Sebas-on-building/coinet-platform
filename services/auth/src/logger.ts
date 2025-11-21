import { Request, Response, NextFunction } from 'express';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

const serviceName = 'auth-service';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

export function logRequest(req: Request, res: Response, next: NextFunction) {
  const requestId = req.headers['x-correlation-id'] || uuidv4();
  req.headers['x-correlation-id'] = requestId;
  (req as any).requestId = requestId;
  res.on('finish', () => {
    logger.info({
      timestamp: new Date().toISOString(),
      service: serviceName,
      level: 'INFO',
      message: `${req.method} ${req.url} ${res.statusCode}`,
      userId: (req as any).user?.id,
      requestId,
    });
  });
  next();
} 