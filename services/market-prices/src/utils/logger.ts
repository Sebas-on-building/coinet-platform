/**
 * Logger Utility
 * Winston-based logging with structured output
 */

import winston from 'winston';
import { getConfig } from '../config';
import * as fs from 'fs';
import * as path from 'path';

// Safely get config - don't crash if config fails
let config;
try {
  config = getConfig();
} catch (error) {
  console.warn('Failed to load config for logger, using defaults:', error instanceof Error ? error.message : String(error));
  config = { logLevel: 'info' };
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaStr = '';
    if (Object.keys(meta).length > 0) {
      metaStr = JSON.stringify(meta);
    }
    return `${timestamp} [${level.toUpperCase()}]: ${message} ${metaStr}`;
  })
);

// Ensure logs directory exists (only if we have write permissions)
const logsDir = path.join(process.cwd(), 'logs');
try {
  if (!fs.existsSync(logsDir)) {
    // Try to create directory, but don't fail if we don't have permissions
    try {
      fs.mkdirSync(logsDir, { recursive: true, mode: 0o755 });
      // Test write permissions
      fs.accessSync(logsDir, fs.constants.W_OK);
    } catch (permError) {
      // Directory creation or permission check failed - file logging will be disabled
      // This is expected in some deployment environments
    }
  } else {
    // Directory exists, check if we have write permissions
    try {
      fs.accessSync(logsDir, fs.constants.W_OK);
    } catch (permError) {
      // No write permissions - file logging will be disabled
    }
  }
} catch (error) {
  // Silently ignore - file logging will be disabled
  // This is expected in some deployment environments
}

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      logFormat
    ),
  }),
];

// Only add file transports if logs directory exists
if (fs.existsSync(logsDir)) {
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
    })
  );
}

export const logger = winston.createLogger({
  level: config.logLevel || 'info',
  format: logFormat,
  transports,
  exceptionHandlers: fs.existsSync(logsDir) ? [
    new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') }),
  ] : undefined,
  rejectionHandlers: fs.existsSync(logsDir) ? [
    new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') }),
  ] : undefined,
});

export default logger;

