/**
 * 📝 DIVINE LOGGING SYSTEM
 * 
 * Professional logging for the Coinet AI Core Execution Engine.
 * Provides structured logging with appropriate levels and formatting.
 */

import * as winston from 'winston';

// Custom log format for Coinet AI
const coinetFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  })
);

// Create the winston logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: coinetFormat,
  defaultMeta: { 
    service: 'coinet-ai-core',
    version: '1.0.0'
  },
  transports: [
    // Console output for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta, null, 2)}` : '';
          return `🧠 [${timestamp}] ${level}: ${message}${metaStr}`;
        })
      )
    }),

    // File output for production
    new winston.transports.File({
      filename: 'logs/coinet-ai-error.log',
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: 'logs/coinet-ai-combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10
    })
  ],

  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/coinet-ai-exceptions.log' })
  ],

  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/coinet-ai-rejections.log' })
  ]
});

// Custom logging methods for Coinet AI specific events
export const aiLogger = {
  /**
   * Log input processing events
   */
  inputProcessing: (action: string, data: any) => {
    logger.info(`🎯 INPUT_PROCESSING: ${action}`, { 
      action, 
      data: typeof data === 'string' ? data.substring(0, 100) : data,
      category: 'input_processing'
    });
  },

  /**
   * Log AI engine interactions
   */
  aiEngine: (engine: string, action: string, data: any) => {
    logger.info(`🧠 AI_ENGINE: ${engine} - ${action}`, { 
      engine, 
      action, 
      data,
      category: 'ai_engine'
    });
  },

  /**
   * Log performance metrics
   */
  performance: (operation: string, duration: number, metadata?: any) => {
    logger.info(`⚡ PERFORMANCE: ${operation} completed in ${duration}ms`, {
      operation,
      duration,
      metadata,
      category: 'performance'
    });
  },

  /**
   * Log API requests and responses
   */
  api: (method: string, path: string, statusCode: number, duration: number, metadata?: any) => {
    const level = statusCode >= 400 ? 'error' : 'info';
    logger[level](`🌐 API: ${method} ${path} - ${statusCode} (${duration}ms)`, {
      method,
      path,
      statusCode,
      duration,
      metadata,
      category: 'api'
    });
  },

  /**
   * Log data source interactions
   */
  dataSource: (source: string, action: string, symbol: string, success: boolean, metadata?: any) => {
    const level = success ? 'info' : 'warn';
    const status = success ? '✅' : '⚠️';
    logger[level](`${status} DATA_SOURCE: ${source} - ${action} for ${symbol}`, {
      source,
      action,
      symbol,
      success,
      metadata,
      category: 'data_source'
    });
  },

  /**
   * Log cache operations
   */
  cache: (operation: string, key: string, hit: boolean, metadata?: any) => {
    const status = hit ? '🎯' : '❌';
    logger.debug(`${status} CACHE: ${operation} - ${key} (${hit ? 'HIT' : 'MISS'})`, {
      operation,
      key,
      hit,
      metadata,
      category: 'cache'
    });
  },

  /**
   * Log errors with context
   */
  error: (context: string, error: Error, metadata?: any) => {
    logger.error(`❌ ERROR in ${context}: ${error.message}`, {
      context,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      metadata,
      category: 'error'
    });
  }
};

// Ensure logs directory exists
import { existsSync, mkdirSync } from 'fs';
if (!existsSync('logs')) {
  mkdirSync('logs', { recursive: true });
}

// Log startup
logger.info('🧠 Coinet AI Core Execution Engine Logger initialized', {
  level: logger.level,
  timestamp: new Date().toISOString()
});
