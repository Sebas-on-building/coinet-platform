/**
 * Enterprise Rate Limiting Service Logger
 * Winston-based logging with rate limiting compliance features
 */

import * as winston from 'winston';
import { Logger as WinstonLogger, format, transports } from 'winston';

export interface Logger {
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: any, meta?: any): void;
  debug(message: string, meta?: any): void;
}

export class EnterpriseRateLimitingLogger implements Logger {
  private logger: any;

  constructor(serviceName: string = 'enterprise-rate-limiting-service') {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
        format.printf(({ timestamp, level, message, service, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            message,
            service: service || serviceName,
            ...meta,
          });
        })
      ),
      defaultMeta: { service: serviceName },
      transports: [
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.simple(),
            format.printf(({ timestamp, level, message, service }) => {
              return `${timestamp} [${service}] ${level}: ${message}`;
            })
          )
        }),
        new transports.File({
          filename: `logs/${serviceName}.log`,
          maxsize: 10 * 1024 * 1024, // 10MB
          maxFiles: 5,
          format: format.combine(
            format.timestamp(),
            format.json()
          )
        })
      ]
    });
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  error(message: string, error?: any, meta?: any): void {
    this.logger.error(message, { error, ...meta });
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }
}

// Factory function for creating loggers
export function createLogger(serviceName: string): Logger {
  return new EnterpriseRateLimitingLogger(serviceName);
}

// Default logger instance
export const logger = createLogger('enterprise-rate-limiting-service');
