/**
 * Enterprise Encryption Service Logger
 * Winston-based logging with encryption compliance features
 */

import * as winston from 'winston';
import { format, transports } from 'winston';

export interface Logger {
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: any, meta?: any): void;
  debug(message: string, meta?: any): void;
}

export class EnterpriseEncryptionLogger implements Logger {
  private logger: any;

  constructor(serviceName: string = 'enterprise-encryption-service') {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.json(),
        format.printf(({ timestamp, level, message, service, ...meta }) => {
          const sanitizedMeta = this.sanitizeMeta(meta);
          return JSON.stringify({
            timestamp,
            level,
            message,
            service: service || serviceName,
            ...sanitizedMeta,
          });
        })
      ),
      defaultMeta: { service: serviceName },
      transports: [
        new transports.Console({
          format: format.combine(
            format.colorize(),
            format.simple(),
            format.printf(({ timestamp, level, message, service, ...meta }) => {
              const sanitizedMeta = this.sanitizeMeta(meta);
              return `${timestamp} [${service || serviceName}] ${level}: ${message} ${Object.keys(sanitizedMeta).length > 0 ? JSON.stringify(sanitizedMeta) : ''}`;
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

  private sanitizeMeta(meta: any): any {
    if (!meta) return meta;

    const sanitized = { ...meta };

    const sensitiveFields = ['password', 'key', 'secret', 'token', 'privateKey', 'encryptedData'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}

export function createLogger(serviceName: string): Logger {
  return new EnterpriseEncryptionLogger(serviceName);
}

export const logger = createLogger('enterprise-encryption-service');
