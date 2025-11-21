/**
 * Error Handler Middleware - Fixed for Coinet User Service
 */

import { Request, Response, NextFunction } from 'express';
import { createLogger } from 'winston';

const logger = createLogger({
  level: 'error',
  defaultMeta: { service: 'error-handler' }
});

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  id?: string;
}

export const errorHandler = (
  error: Error,
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const requestId = req.id || 'unknown';
  const userId = req.user?.id;
  const timestamp = new Date().toISOString();

  // Log the error
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    requestId,
    userId,
    method: req.method,
    path: req.path,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    res.status(401).json({
      error: 'Invalid Token',
      message: 'The provided token is invalid',
      requestId,
      timestamp
    });
    return;
  }

  if (error.name === 'TokenExpiredError') {
    res.status(401).json({
      error: 'Token Expired',
      message: 'The provided token has expired',
      requestId,
      timestamp
    });
    return;
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    res.status(400).json({
      error: 'Validation Error',
      message: error.message,
      requestId,
      timestamp
    });
    return;
  }

  // Handle rate limiting errors
  if (error.message.includes('Too many requests')) {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      requestId,
      timestamp
    });
    return;
  }

  // Default error response
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred',
    requestId,
    timestamp,
    ...(isDevelopment && { 
      stack: error.stack,
      details: error.message 
    })
  });
};

export default errorHandler;