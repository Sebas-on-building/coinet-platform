/**
 * =========================================
 * NLP HANDLER
 * =========================================
 * Divine world-class HTTP handlers for NLP parsing requests
 */

import express, { Request, Response } from 'express';
import { Logger } from '@/utils/Logger';
import { NLPEngine } from '@/engines/NLPEngine';
import { RuleValidator } from '@/validation/RuleValidator';
import {
  NaturalLanguageInput,
  ParsingResult,
  NLPConfig,
  NaturalLanguageInputSchema,
  NLPConfigSchema
} from '@/types';

/**
 * NLP HTTP handler
 */
export class NLPHandler {
  private logger: Logger;
  private nlpEngine: NLPEngine;
  private validator: RuleValidator;
  private config: NLPConfig;

  constructor(config: NLPConfig) {
    this.logger = new Logger('NLPHandler');
    this.config = config;
    this.nlpEngine = new NLPEngine(config);
    this.validator = new RuleValidator();
  }

  /**
   * Handle NLP parsing request
   */
  async handleParseRequest(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    try {
      this.logger.http('Received NLP parse request', {
        userAgent: req.get('User-Agent'),
        contentLength: req.get('Content-Length')
      });

      // Validate request body
      const validationResult = NaturalLanguageInputSchema.safeParse(req.body);

      if (!validationResult.success) {
        this.logger.warn('Invalid request body', { errors: validationResult.error.errors });

        res.status(400).json({
          success: false,
          error: 'Invalid request format',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          })),
          processingTime: Date.now() - startTime
        });
        return;
      }

      const input = validationResult.data as any as NaturalLanguageInput;

      // Parse natural language
      const result = await this.nlpEngine.parse(input);

      // Additional validation if rule was parsed
      if (result.success && result.rule) {
        const validation = this.validator.validate(result.rule);

        // Merge validation results
        result.errors = [...(result.errors || []), ...validation.errors];
        result.warnings = [...(result.warnings || []), ...validation.warnings];
        result.suggestions = [...(result.suggestions || []), ...validation.suggestions];

        // Update success status
        result.success = validation.valid && result.errors.length === 0;
      }

      // Format response
      const response = this.formatResponse(result, startTime);

      // Set appropriate status code
      const statusCode = result.success ? 200 : 400;
      res.status(statusCode).json(response);

      this.logger.http('NLP parse completed', {
        success: result.success,
        processingTime: result.processingTime,
        confidence: result.confidence
      });

    } catch (error: any) {
      this.logger.error('NLP parse request failed', {
        error: error.message,
        stack: error.stack
      });

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing your request.',
        processingTime: Date.now() - startTime
      });
    }
  }

  /**
   * Handle health check request
   */
  async handleHealthCheck(req: Request, res: Response): Promise<void> {
    try {
      const engineHealth = await this.nlpEngine.healthCheck();

      const health = {
        status: engineHealth.status,
        timestamp: new Date().toISOString(),
        service: 'nlp-parser',
        version: '1.0.0',
        details: engineHealth.details
      };

      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);

    } catch (error: any) {
      this.logger.error('Health check failed', { error: error.message });

      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }

  /**
   * Handle configuration request
   */
  async handleGetConfig(req: Request, res: Response): Promise<void> {
    try {
      // Return sanitized configuration
      const configResponse = {
        providers: this.config.providers.map(p => ({
          name: p.name,
          model: p.model
        })),
        caching: {
          enabled: this.config.caching.enabled,
          ttl: this.config.caching.ttl
        },
        validation: {
          strictMode: this.config.validation.strictMode
        },
        performance: {
          maxConcurrentRequests: this.config.performance.maxConcurrentRequests,
          requestTimeout: this.config.performance.requestTimeout
        }
      };

      res.json({
        success: true,
        config: configResponse
      });

    } catch (error: any) {
      this.logger.error('Get config failed', { error: error.message });

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve configuration'
      });
    }
  }

  /**
   * Format response for client
   */
  private formatResponse(result: ParsingResult, startTime: number): any {
    const response: any = {
      success: result.success,
      processingTime: result.processingTime || (Date.now() - startTime),
      confidence: result.confidence
    };

    if (result.success && result.rule) {
      response.rule = {
        triggers: result.rule.triggers,
        filters: result.rule.filters,
        conditions: result.rule.conditions,
        timeWindows: result.rule.timeWindows,
        routing: result.rule.routing,
        metadata: result.rule.metadata
      };
    }

    if (result.errors && result.errors.length > 0) {
      response.errors = result.errors.map(error => ({
        code: error.code,
        message: error.userMessage,
        suggestions: error.suggestions
      }));
    }

    if (result.warnings && result.warnings.length > 0) {
      response.warnings = result.warnings.map(warning => ({
        code: warning.code,
        message: warning.userMessage,
        suggestions: warning.suggestions
      }));
    }

    if (result.suggestions && result.suggestions.length > 0) {
      response.suggestions = result.suggestions;
    }

    return response;
  }

  /**
   * Create Express router
   */
  createRouter(): express.Router {
    const router = express.Router();

    // POST /parse - Parse natural language
    router.post('/parse', this.handleParseRequest.bind(this));

    // GET /health - Health check
    router.get('/health', this.handleHealthCheck.bind(this));

    // GET /config - Get configuration
    router.get('/config', this.handleGetConfig.bind(this));

    return router;
  }
}

/**
 * Middleware factory for NLP service
 */
export function createNLPMiddleware(config: NLPConfig) {
  const handler = new NLPHandler(config);

  return {
    parseHandler: handler.handleParseRequest.bind(handler),
    healthHandler: handler.handleHealthCheck.bind(handler),
    configHandler: handler.handleGetConfig.bind(handler),
    router: handler.createRouter()
  };
}
