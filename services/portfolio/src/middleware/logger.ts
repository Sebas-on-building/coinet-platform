import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

export function logRequest(req, res, next) {
  const requestId = req.headers['x-correlation-id'] || uuidv4();
  req.headers['x-correlation-id'] = requestId;
  res.on('finish', () => {
    logger.info({
      timestamp: new Date().toISOString(),
      service: 'portfolio-service',
      level: 'INFO',
      message: `${req.method} ${req.url} ${res.statusCode}`,
      userId: req.user?.id,
      requestId,
    });
  });
  next();
} 