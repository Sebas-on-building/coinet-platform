/**
 * =========================================
 * LOGGER UTILITY
 * =========================================
 * Divine world-class logging utility with structured logging and multiple transports
 */

import winston, { Logger as WinstonLogger, format, transports } from 'winston';

/**
 * Custom logger with structured logging capabilities
 */
export class Logger {
  private logger: WinstonLogger;
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
        format.printf((info: Record<string, any>) => {
          const { timestamp, level, message, service, ...meta } = info;
          const logEntry = {
            timestamp,
            level,
            service: service || this.serviceName,
            message,
            ...meta,
          };

          return JSON.stringify(logEntry);
        })
      ),
      defaultMeta: { service: this.serviceName },
      transports: [
        // Console transport for development
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.simple(),
            format.printf((info: Record<string, any>) => {
              const { timestamp, level, message, service, ...meta } = info;
              const metaStr = Object.keys(meta).length > 0 ?
                ` ${JSON.stringify(meta)}` : '';
              return `${timestamp} [${level}] ${service}: ${message}${metaStr}`;
            })
          ),
        }),

        // File transport for production
        ...(process.env.NODE_ENV === 'production' ? [
          new transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
          new transports.File({
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
        ] : []),
      ],
      exitOnError: false,
    });
  }

  /**
   * Log an info message
   */
  info(message: string, meta?: Record<string, any>): void {
    this.logger.info(message, meta);
  }

  /**
   * Log a warning message
   */
  warn(message: string, meta?: Record<string, any>): void {
    this.logger.warn(message, meta);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: any, meta?: Record<string, any>): void {
    const errorMeta = {
      ...meta,
      ...(error && {
        error: {
          message: error.message || error,
          stack: error.stack,
          name: error.name,
        }
      }),
    };

    this.logger.error(message, errorMeta);
  }

  /**
   * Log a debug message
   */
  debug(message: string, meta?: Record<string, any>): void {
    this.logger.debug(message, meta);
  }

  /**
   * Log with custom level
   */
  log(level: string, message: string, meta?: Record<string, any>): void {
    this.logger.log(level, message, meta);
  }

  /**
   * Create a child logger with additional context
   */
  child(context: Record<string, any>): Logger {
    const childLogger = this.logger.child(context);
    return new Logger(this.serviceName);
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger('market-signal-processor');

/**
 * Performance timer utility
 */
export class PerformanceTimer {
  private startTime: number;
  private label: string;

  constructor(label: string) {
    this.label = label;
    this.startTime = Date.now();
  }

  /**
   * End timing and return elapsed time
   */
  end(): number {
    const elapsed = Date.now() - this.startTime;
    logger.debug(`${this.label} completed`, { duration: elapsed });
    return elapsed;
  }

  /**
   * Get elapsed time without ending
   */
  elapsed(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Async operation wrapper with timing and error handling
 */
export async function withTiming<T>(
  operation: () => Promise<T>,
  label: string,
  customLogger?: Logger
): Promise<{ result: T; duration: number; success: boolean }> {
  const timer = new PerformanceTimer(label);
  const log = customLogger || logger; // Use provided logger or global logger

  try {
    const result = await operation();
    const duration = timer.end();

    log.debug(`${label} completed successfully`, { duration });

    return { result, duration, success: true };
  } catch (error: any) {
    const duration = timer.end();

    log.error(`${label} failed`, error, { duration });

    return { result: null as T, duration, success: false };
  }
}
