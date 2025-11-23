/**
 * =========================================
 * ERROR HANDLER
 * =========================================
 * Divine world-class error handling and reporting system
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/Logger';

export interface ErrorHandlingConfig {
  includeStackTrace: boolean;
  logErrors: boolean;
  errorReporting: {
    enabled: boolean;
    endpoint: string;
  };
}

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  endpoint?: string;
  method?: string;
  ip?: string;
  userAgent?: string;
  timestamp: string;
}

/**
 * Advanced error handling middleware with comprehensive error reporting
 */
export class ErrorHandler {
  private logger: Logger;
  private config: ErrorHandlingConfig;

  constructor(config: ErrorHandlingConfig) {
    this.logger = new Logger('ErrorHandler');
    this.config = config;
  }

  /**
   * Express middleware for error handling
   */
  middleware() {
    return (error: any, req: Request, res: Response, next: NextFunction) => {
      try {
        const errorContext = this.buildErrorContext(error, req);

        // Log error if enabled
        if (this.config.logErrors) {
          this.logError(error, errorContext);
        }

        // Report error if enabled
        if (this.config.errorReporting.enabled) {
          this.reportError(error, errorContext);
        }

        // Send appropriate error response
        this.sendErrorResponse(error, res, errorContext);

      } catch (handlerError: any) {
        this.logger.error('Error handler itself failed', handlerError);

        // Fallback error response
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          message: 'An unexpected error occurred',
        });
      }
    };
  }

  /**
   * Build error context from request and error
   */
  private buildErrorContext(error: any, req: Request): ErrorContext {
    return {
      requestId: (req as any).requestId,
      userId: (req as any).user?.id,
      endpoint: req.path,
      method: req.method,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Log error with appropriate level and context
   */
  private logError(error: any, context: ErrorContext): void {
    const logData = {
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
      statusCode: error.statusCode || 500,
      ...context,
    };

    // Log based on error type and severity
    const errorMessage = `Error: ${error.message || error.name || 'Unknown error'}`;
    if (error.statusCode >= 500) {
      this.logger.error(errorMessage, undefined, logData);
    } else if (error.statusCode >= 400) {
      this.logger.warn(errorMessage, logData);
    } else {
      this.logger.info(errorMessage, logData);
    }
  }

  /**
   * Report error to external service
   */
  private reportError(error: any, context: ErrorContext): void {
    try {
      // In a real implementation, this would send to error reporting service
      // like Sentry, Rollbar, or Bugsnag
      const errorReport = {
        message: error.message || 'Unknown error',
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
        service: 'api-infrastructure',
        version: '1.0.0',
      };

      // For demo purposes, just log the report
      this.logger.info('Error report generated', errorReport);

    } catch (reportError: any) {
      this.logger.error('Failed to report error', reportError);
    }
  }

  /**
   * Send appropriate error response
   */
  private sendErrorResponse(error: any, res: Response, context: ErrorContext): void {
    const statusCode = this.determineStatusCode(error);
    const errorResponse = this.buildErrorResponse(error, context);

    res.status(statusCode).json(errorResponse);
  }

  /**
   * Determine appropriate HTTP status code for error
   */
  private determineStatusCode(error: any): number {
    // Use error's status code if available
    if (error.statusCode) {
      return error.statusCode;
    }

    // Map error types to status codes
    if (error.name === 'ValidationError') {
      return 400;
    }

    if (error.name === 'UnauthorizedError') {
      return 401;
    }

    if (error.name === 'ForbiddenError') {
      return 403;
    }

    if (error.name === 'NotFoundError') {
      return 404;
    }

    if (error.name === 'RateLimitError') {
      return 429;
    }

    if (error.name === 'TimeoutError') {
      return 408;
    }

    // Default to 500 for server errors
    return 500;
  }

  /**
   * Build error response object
   */
  private buildErrorResponse(error: any, context: ErrorContext): any {
    const baseResponse: any = {
      success: false as const,
      error: this.getErrorType(error),
      message: this.getUserFriendlyMessage(error),
      requestId: context.requestId,
      timestamp: context.timestamp,
    };

    // Add error code if available
    if (error.code) {
      baseResponse.code = error.code;
    }

    // Add stack trace in development or if explicitly enabled
    if (this.config.includeStackTrace && (process.env.NODE_ENV === 'development' || this.config.includeStackTrace)) {
      baseResponse.details = {
        stack: error.stack,
        name: error.name,
      };
    }

    return baseResponse;
  }

  /**
   * Get error type for response
   */
  private getErrorType(error: any): string {
    if (error.name === 'ValidationError') return 'validation_error';
    if (error.name === 'UnauthorizedError') return 'authentication_error';
    if (error.name === 'ForbiddenError') return 'authorization_error';
    if (error.name === 'NotFoundError') return 'not_found';
    if (error.name === 'RateLimitError') return 'rate_limit_exceeded';
    if (error.name === 'TimeoutError') return 'timeout';
    return 'internal_error';
  }

  /**
   * Get user-friendly error message
   */
  private getUserFriendlyMessage(error: any): string {
    // Map technical errors to user-friendly messages
    if (error.name === 'ValidationError') {
      return 'The request data is invalid. Please check your input and try again.';
    }

    if (error.name === 'UnauthorizedError') {
      return 'Authentication is required to access this resource.';
    }

    if (error.name === 'ForbiddenError') {
      return 'You do not have permission to access this resource.';
    }

    if (error.name === 'NotFoundError') {
      return 'The requested resource was not found.';
    }

    if (error.name === 'RateLimitError') {
      return 'Too many requests. Please wait a moment before trying again.';
    }

    if (error.name === 'TimeoutError') {
      return 'The request timed out. Please try again.';
    }

    // Generic server error message
    return 'An unexpected error occurred. Please try again later.';
  }

  /**
   * Create custom error with context
   */
  static createError(
    message: string,
    code: string,
    statusCode: number,
    originalError?: Error
  ): Error {
    const error = new Error(message);
    error.name = code;
    (error as any).statusCode = statusCode;
    (error as any).code = code;

    if (originalError) {
      error.stack = `${error.stack}\nCaused by: ${originalError.stack}`;
    }

    return error;
  }

  /**
   * Wrap async function with error handling
   */
  static async wrapAsync(fn: Function): Promise<any> {
    try {
      return await fn();
    } catch (error: any) {
      throw error;
    }
  }
}

/**
 * Custom error classes for different error types
 */
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
    (this as any).statusCode = 400;
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
    (this as any).statusCode = 401;
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
    (this as any).statusCode = 403;
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Not Found') {
    super(message);
    this.name = 'NotFoundError';
    (this as any).statusCode = 404;
  }
}

export class RateLimitError extends Error {
  constructor(message: string = 'Rate Limit Exceeded') {
    super(message);
    this.name = 'RateLimitError';
    (this as any).statusCode = 429;
  }
}

export class TimeoutError extends Error {
  constructor(message: string = 'Request Timeout') {
    super(message);
    this.name = 'TimeoutError';
    (this as any).statusCode = 408;
  }
}
