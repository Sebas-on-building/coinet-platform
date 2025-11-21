/**
 * =========================================
 * LOGGER UTILITY
 * =========================================
 * Centralized logging for the signal evaluation engine
 */

import * as winston from 'winston';
import { format } from 'winston';

export class Logger {
  private logger: winston.Logger;
  private serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;

    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: serviceName },
      transports: [
        // Write all logs with importance level of `error` or less to `error.log`
        new winston.transports.File({
          filename: `logs/${serviceName.toLowerCase()}-error.log`,
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        // Write all logs with importance level of `info` or less to `combined.log`
        new winston.transports.File({
          filename: `logs/${serviceName.toLowerCase()}-combined.log`,
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      ]
    });

    // If we're not in production then log to the console too
    if (process.env.NODE_ENV !== 'production') {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, service, ...meta }: any) => {
            const metaStr = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
            return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
          })
        )
      }));
    }
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  error(message: string, error?: Error | any): void {
    if (error instanceof Error) {
      this.logger.error(message, {
        error: error.message,
        stack: error.stack
      });
    } else {
      this.logger.error(message, error);
    }
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  // Signal-specific logging methods
  signal(signalId: string, message: string, meta?: any): void {
    this.info(`[Signal:${signalId}] ${message}`, meta);
  }

  signalError(signalId: string, message: string, error?: Error | any): void {
    this.error(`[Signal:${signalId}] ${message}`, error);
  }

  // Processing logging
  processing(operation: string, duration_ms: number, meta?: any): void {
    this.debug(`Processing: ${operation} took ${duration_ms}ms`, {
      operation,
      duration_ms,
      ...meta
    });
  }

  // Stream processing logging
  stream(topic: string, message: string, meta?: any): void {
    this.debug(`[Stream:${topic}] ${message}`, meta);
  }

  // Fusion engine logging
  fusion(message: string, meta?: any): void {
    this.info(`[Fusion] ${message}`, meta);
  }

  // Metrics logging
  metrics(metric: string, value: number, meta?: any): void {
    this.debug(`Metrics: ${metric} = ${value}`, {
      metric,
      value,
      ...meta
    });
  }

  // Performance logging
  performance(operation: string, duration_ms: number, throughput?: number): void {
    const meta: any = { operation, duration_ms };
    if (throughput) meta.throughput = throughput;
    this.debug(`Performance: ${operation} took ${duration_ms}ms${throughput ? ` (${throughput} ops/sec)` : ''}`, meta);
  }

  // Anomaly detection logging
  anomaly(message: string, meta?: any): void {
    this.warn(`[Anomaly] ${message}`, meta);
  }
}
