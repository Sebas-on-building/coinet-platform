/**
 * =========================================
 * REQUEST VALIDATOR
 * =========================================
 * Divine world-class request validation and sanitization
 */

import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/Logger';

export interface ValidationConfig {
  strictMode: boolean;
  maxRequestSize: number;
  maxArraySize: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  sanitized?: any;
}

/**
 * Advanced request validator with comprehensive validation rules
 */
export class RequestValidator {
  private logger: Logger;
  private config: ValidationConfig;

  constructor(config: ValidationConfig) {
    this.logger = new Logger('RequestValidator');
    this.config = config;
  }

  /**
   * Express middleware for request validation
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Basic request validation
        const basicValidation = this.validateBasicRequest(req);
        if (!basicValidation.valid) {
          return this.sendValidationError(res, basicValidation.errors);
        }

        // Validate request body if present
        if (req.body && Object.keys(req.body).length > 0) {
          const bodyValidation = this.validateRequestBody(req.body, req.path);
          if (!bodyValidation.valid) {
            return this.sendValidationError(res, bodyValidation.errors);
          }

          // Replace body with sanitized version
          if (bodyValidation.sanitized) {
            req.body = bodyValidation.sanitized;
          }
        }

        // Validate query parameters if present
        if (req.query && Object.keys(req.query).length > 0) {
          const queryValidation = this.validateQueryParameters(req.query);
          if (!queryValidation.valid) {
            return this.sendValidationError(res, queryValidation.errors);
          }
        }

        next();
      } catch (error: any) {
        this.logger.error('Request validation middleware error', error);
        res.status(500).json({
          success: false,
          error: 'Validation service error',
        });
      }
    };
  }

  /**
   * Validate basic request properties
   */
  private validateBasicRequest(req: Request): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    // Check request size
    const contentLength = parseInt(req.headers['content-length'] || '0');
    if (contentLength > this.config.maxRequestSize) {
      errors.push({
        field: 'content-length',
        message: `Request size exceeds maximum allowed size of ${this.config.maxRequestSize} bytes`,
        code: 'REQUEST_TOO_LARGE',
      });
    }

    // Check for suspicious headers
    const suspiciousHeaders = ['x-forwarded-proto', 'x-real-ip', 'x-forwarded-for'];
    suspiciousHeaders.forEach(header => {
      if (req.headers[header]) {
        // Basic validation - could be more sophisticated
        if (typeof req.headers[header] !== 'string') {
          errors.push({
            field: header,
            message: `Invalid ${header} header format`,
            code: 'INVALID_HEADER',
          });
        }
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate request body based on endpoint
   */
  private validateRequestBody(body: any, path: string): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    // Endpoint-specific validation
    switch (path) {
      case '/api/v1/market-signals/process-signals':
        return this.validateMarketSignalRequest(body);
      case '/api/v1/alerts/evaluate':
        return this.validateAlertEvaluationRequest(body);
      case '/api/v1/notifications/send':
        return this.validateNotificationRequest(body);
      case '/api/v1/nlp/parse':
        return this.validateNLPRequest(body);
      default:
        // Generic validation for unknown endpoints
        return this.validateGenericRequest(body);
    }
  }

  /**
   * Validate market signal processing request
   */
  private validateMarketSignalRequest(body: any): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    if (!body.signals || !Array.isArray(body.signals)) {
      errors.push({
        field: 'signals',
        message: 'signals must be an array',
        code: 'INVALID_SIGNALS_FORMAT',
      });
      return { valid: false, errors };
    }

    if (body.signals.length > this.config.maxArraySize) {
      errors.push({
        field: 'signals',
        message: `signals array exceeds maximum size of ${this.config.maxArraySize}`,
        code: 'ARRAY_TOO_LARGE',
      });
    }

    // Validate each signal
    body.signals.forEach((signal: any, index: number) => {
      if (!signal.exchange || typeof signal.exchange !== 'string') {
        errors.push({
          field: `signals[${index}].exchange`,
          message: 'exchange is required and must be a string',
          code: 'INVALID_EXCHANGE',
        });
      }

      if (!signal.symbol || typeof signal.symbol !== 'string') {
        errors.push({
          field: `signals[${index}].symbol`,
          message: 'symbol is required and must be a string',
          code: 'INVALID_SYMBOL',
        });
      }

      if (!signal.signalType || typeof signal.signalType !== 'string') {
        errors.push({
          field: `signals[${index}].signalType`,
          message: 'signalType is required and must be a string',
          code: 'INVALID_SIGNAL_TYPE',
        });
      }

      if (!signal.timestamp || isNaN(Date.parse(signal.timestamp))) {
        errors.push({
          field: `signals[${index}].timestamp`,
          message: 'timestamp is required and must be a valid date',
          code: 'INVALID_TIMESTAMP',
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      sanitized: body,
    };
  }

  /**
   * Validate alert evaluation request
   */
  private validateAlertEvaluationRequest(body: any): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    if (!body.signal || typeof body.signal !== 'object') {
      errors.push({
        field: 'signal',
        message: 'signal is required and must be an object',
        code: 'INVALID_SIGNAL',
      });
      return { valid: false, errors };
    }

    // Validate signal structure
    const signal = body.signal;
    if (!signal.exchange || typeof signal.exchange !== 'string') {
      errors.push({
        field: 'signal.exchange',
        message: 'exchange is required and must be a string',
        code: 'INVALID_EXCHANGE',
      });
    }

    if (!signal.symbol || typeof signal.symbol !== 'string') {
      errors.push({
        field: 'signal.symbol',
        message: 'symbol is required and must be a string',
        code: 'INVALID_SYMBOL',
      });
    }

    if (signal.price !== undefined && typeof signal.price !== 'number') {
      errors.push({
        field: 'signal.price',
        message: 'price must be a number if provided',
        code: 'INVALID_PRICE',
      });
    }

    if (signal.volume !== undefined && typeof signal.volume !== 'number') {
      errors.push({
        field: 'signal.volume',
        message: 'volume must be a number if provided',
        code: 'INVALID_VOLUME',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: body,
    };
  }

  /**
   * Validate notification request
   */
  private validateNotificationRequest(body: any): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    if (!body.events || !Array.isArray(body.events)) {
      errors.push({
        field: 'events',
        message: 'events must be an array',
        code: 'INVALID_EVENTS_FORMAT',
      });
      return { valid: false, errors };
    }

    if (body.events.length > this.config.maxArraySize) {
      errors.push({
        field: 'events',
        message: `events array exceeds maximum size of ${this.config.maxArraySize}`,
        code: 'ARRAY_TOO_LARGE',
      });
    }

    // Validate each event
    body.events.forEach((event: any, index: number) => {
      if (!event.userId || typeof event.userId !== 'string') {
        errors.push({
          field: `events[${index}].userId`,
          message: 'userId is required and must be a string',
          code: 'INVALID_USER_ID',
        });
      }

      if (!event.type || typeof event.type !== 'string') {
        errors.push({
          field: `events[${index}].type`,
          message: 'type is required and must be a string',
          code: 'INVALID_EVENT_TYPE',
        });
      }

      if (event.channels && !Array.isArray(event.channels)) {
        errors.push({
          field: `events[${index}].channels`,
          message: 'channels must be an array if provided',
          code: 'INVALID_CHANNELS',
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      sanitized: body,
    };
  }

  /**
   * Validate NLP request
   */
  private validateNLPRequest(body: any): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    if (!body.text || typeof body.text !== 'string') {
      errors.push({
        field: 'text',
        message: 'text is required and must be a string',
        code: 'INVALID_TEXT',
      });
      return { valid: false, errors };
    }

    if (body.text.length > 10000) {
      errors.push({
        field: 'text',
        message: 'text exceeds maximum length of 10000 characters',
        code: 'TEXT_TOO_LONG',
      });
    }

    if (body.language && typeof body.language !== 'string') {
      errors.push({
        field: 'language',
        message: 'language must be a string if provided',
        code: 'INVALID_LANGUAGE',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: body,
    };
  }

  /**
   * Validate generic request body
   */
  private validateGenericRequest(body: any): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    // Basic structure validation
    if (typeof body !== 'object' || body === null) {
      errors.push({
        field: 'body',
        message: 'Request body must be a valid object',
        code: 'INVALID_BODY',
      });
      return { valid: false, errors };
    }

    // Check for potentially dangerous content
    const bodyString = JSON.stringify(body);
    if (bodyString.includes('<script') || bodyString.includes('javascript:')) {
      errors.push({
        field: 'body',
        message: 'Request body contains potentially malicious content',
        code: 'MALICIOUS_CONTENT',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized: body,
    };
  }

  /**
   * Validate query parameters
   */
  private validateQueryParameters(query: any): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    // Check for SQL injection patterns
    const sqlPatterns = [
      /(\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bUNION\b)/i,
      /('|(\\')|(;)|(\|\|)|(\band\b|\bor\b))/i,
    ];

    Object.entries(query).forEach(([key, value]) => {
      if (typeof value === 'string') {
        sqlPatterns.forEach(pattern => {
          if (pattern.test(value)) {
            errors.push({
              field: `query.${key}`,
              message: `Query parameter contains potentially malicious content`,
              code: 'MALICIOUS_QUERY',
            });
          }
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Send validation error response
   */
  private sendValidationError(res: Response, errors: ValidationResult['errors']): void {
    this.logger.warn('Validation failed', { errors });

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors,
      message: 'Please check your request format and try again.',
    });
  }

  /**
   * Sanitize string input
   */
  sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove potential HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: URLs
      .replace(/on\w+=/gi, '') // Remove event handlers
      .slice(0, 1000); // Limit length
  }

  /**
   * Validate and sanitize object recursively
   */
  sanitizeObject(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
      return obj.slice(0, this.config.maxArraySize).map(item => this.sanitizeObject(item));
    }

    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeObject(value);
      }
      return sanitized;
    }

    return obj;
  }
}
