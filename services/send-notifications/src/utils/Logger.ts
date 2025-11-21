/**
 * =========================================
 * WINSTON LOGGER
 * =========================================
 * Divine world-class logging system with Winston
 * Enterprise-grade logging with structured output and multiple transports
 */

import winston from 'winston';

/**
 * Log levels in order of severity
 */
export const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

/**
 * Colors for different log levels
 */
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

/**
 * Format for log messages
 */
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);

/**
 * Transports for different environments
 */
const transports = [
  // Write all logs with importance level of `error` or less to `error.log`
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
  // Write all logs with importance level of `info` or less to `combined.log`
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),
];

/**
 * Console transport for development
 */
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      format: format,
    }) as any // Type assertion for winston transport compatibility
  );
}

/**
 * Create Winston logger instance
 */
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: LOG_LEVELS,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
      return `${timestamp} [${level.toUpperCase()}]: ${message}${stack ? `\n${stack}` : ''}${metaStr}`;
    })
  ),
  transports,
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' })
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' })
  ],
});

/**
 * Logger class wrapper for easier usage
 */
export class Logger {
  private context?: string;
  private logger: winston.Logger;

  constructor(context?: string) {
    this.context = context || '';
    this.logger = logger;
  }

  /**
   * Log error messages
   */
  error(message: string, meta?: any): void {
    this.logger.error(message, { context: this.context, ...meta });
  }

  /**
   * Log warning messages
   */
  warn(message: string, meta?: any): void {
    this.logger.warn(message, { context: this.context, ...meta });
  }

  /**
   * Log info messages
   */
  info(message: string, meta?: any): void {
    this.logger.info(message, { context: this.context, ...meta });
  }

  /**
   * Log HTTP requests
   */
  http(message: string, meta?: any): void {
    this.logger.http(message, { context: this.context, ...meta });
  }

  /**
   * Log debug messages
   */
  debug(message: string, meta?: any): void {
    this.logger.debug(message, { context: this.context, ...meta });
  }

  /**
   * Create a child logger with additional context
   */
  child(context: string): Logger {
    return new Logger(`${this.context ? `${this.context}:` : ''}${context}`);
  }

  /**
   * Log with timing information
   */
  withTiming<T>(operation: string, fn: () => Promise<T>): Promise<T>;
  withTiming<T>(operation: string, fn: () => T): T;
  withTiming<T>(operation: string, fn: () => T | Promise<T>): T | Promise<T> {
    const startTime = Date.now();
    this.debug(`Starting ${operation}`);

    const result = fn();

    if (result instanceof Promise) {
      return result
        .then((value) => {
          const duration = Date.now() - startTime;
          this.info(`${operation} completed`, { duration });
          return value;
        })
        .catch((error) => {
          const duration = Date.now() - startTime;
          this.error(`${operation} failed`, { duration, error: error.message });
          throw error;
        });
    } else {
      const duration = Date.now() - startTime;
      this.info(`${operation} completed`, { duration });
      return result;
    }
  }
}

/**
 * Default logger instance
 */
export default logger;
