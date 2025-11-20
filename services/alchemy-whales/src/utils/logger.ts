/**
 * Structured logging with Pino
 */

import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || 'info';
const enablePrettyLogs = process.env.ENABLE_PRETTY_LOGS === 'true' || isDev;

/**
 * Create logger instance
 */
export const logger = pino({
  level: logLevel,
  ...(enablePrettyLogs && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  }),
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
  base: {
    service: 'alchemy-whales',
  },
});

/**
 * Create child logger with context
 */
export function createLogger(context: Record<string, any>) {
  return logger.child(context);
}

export default logger;

