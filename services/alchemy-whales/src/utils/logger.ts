/**
 * Structured logging with Pino
 */

import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';
const logLevel = process.env.LOG_LEVEL || 'info';
const enablePrettyLogs = process.env.ENABLE_PRETTY_LOGS === 'true' || isDev;

/**
 * Check if pino-pretty is available
 */
function hasPinoPretty(): boolean {
  try {
    require.resolve('pino-pretty');
    return true;
  } catch {
    return false;
  }
}

/**
 * Create logger instance
 */
const loggerConfig: pino.LoggerOptions = {
  level: logLevel,
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
};

// Only add pretty transport if enabled AND pino-pretty is available
if (enablePrettyLogs && hasPinoPretty()) {
  loggerConfig.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  };
}

export const logger = pino(loggerConfig);

/**
 * Helper function to log with message and context
 * Pino expects: logger.info(obj) or logger.info(obj, msg)
 */
export function logWithContext(
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  context?: Record<string, any>
) {
  const logObj = { msg: message, ...context };
  logger[level](logObj);
}

/**
 * Create child logger with context
 */
export function createLogger(context: Record<string, any>) {
  return logger.child(context);
}

export default logger;

