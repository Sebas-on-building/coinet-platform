import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
  ],
});

export function logSecurityEvent(event: string, details: any) {
  logger.info({ event, ...details, timestamp: new Date().toISOString() });
}
// Usage: logSecurityEvent('auth_failure', { userId, reason }); 