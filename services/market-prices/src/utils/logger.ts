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

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
try {
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
} catch (error) {
  console.warn('Could not create logs directory, file logging disabled:', error instanceof Error ? error.message : String(error));
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

