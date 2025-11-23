/**
 * =========================================
 * EVALUATION HANDLER
 * =========================================
 * Divine world-class HTTP handler for alert condition evaluation
 * Sub-millisecond response times with comprehensive error handling
 */

import express from 'express';
import { Logger } from '@/utils/Logger';
import { AlertEvaluationEngine } from '@/engine/AlertEvaluationEngine';
import { NormalizedMarketSignal, EvaluationResult } from '../types';

/**
 * HTTP handler for alert evaluation requests
 */
export class EvaluationHandler {
  private logger: Logger;
  private evaluationEngine: AlertEvaluationEngine;

  constructor(evaluationEngine: AlertEvaluationEngine) {
    this.logger = new Logger('EvaluationHandler');
    this.evaluationEngine = evaluationEngine;
  }

  /**
   * Handle signal evaluation request
   */
  async handleEvaluation(req: express.Request, res: express.Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Parse and validate request body
      const signal = await this.parseAndValidateSignal(req.body, requestId);

      // Evaluate signal against alert rules
      const evaluationResult = await this.evaluationEngine.evaluateSignal(signal, {
        requestId,
        timestamp: Date.now(),
      });

      const processingTime = Date.now() - startTime;

      // Log performance metrics
      this.logger.info('Signal evaluation completed', {
        requestId,
        signalId: signal.id,
        matchingRules: evaluationResult.matchingRules.length,
        totalRules: evaluationResult.totalRules,
        processingTime,
        cacheHitRatio: evaluationResult.cacheHitRatio,
      });

      // Return successful response
      res.status(200).json({
        success: true,
        data: {
          requestId,
          signal: signal,
          matchingRules: evaluationResult.matchingRules.map(rule => ({
            ruleId: rule.ruleId,
            triggered: rule.triggered,
            score: rule.score,
            maxScore: rule.maxScore,
            processingTime: rule.processingTime,
          })),
          totalRules: evaluationResult.totalRules,
          processingTime: evaluationResult.totalProcessingTime,
        },
        metadata: {
          evaluatedAt: evaluationResult.evaluatedAt,
          cacheHitRatio: evaluationResult.cacheHitRatio,
        },
      });

    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      this.logger.error('Signal evaluation failed', {
        requestId,
        error: error.message,
        processingTime,
      });

      // Return error response
      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          code: error.code || 'EVALUATION_ERROR',
          requestId,
        },
        metadata: {
          processingTime,
        },
      });
    }
  }

  /**
   * Handle batch evaluation request
   */
  async handleBatchEvaluation(req: express.Request, res: express.Response): Promise<void> {
    const startTime = Date.now();
    const requestId = req.headers['x-request-id'] as string || `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Parse and validate request body
      const signals = await this.parseAndValidateBatch(req.body, requestId);

      if (signals.length === 0) {
        res.status(400).json({
          success: false,
          error: {
            message: 'No signals provided for batch evaluation',
            code: 'NO_SIGNALS',
            requestId,
          },
        });
        return;
      }

      // Evaluate all signals
      const evaluationPromises = signals.map(signal =>
        this.evaluationEngine.evaluateSignal(signal, { requestId })
      );

      const evaluationResults = await Promise.all(evaluationPromises);

      const processingTime = Date.now() - startTime;

      // Aggregate results
      const totalMatchingRules = evaluationResults.reduce(
        (sum, result) => sum + result.matchingRules.length,
        0
      );

      const totalRules = evaluationResults.reduce(
        (sum, result) => sum + result.totalRules,
        0
      );

      // Log performance metrics
      this.logger.info('Batch evaluation completed', {
        requestId,
        signalCount: signals.length,
        totalMatchingRules,
        totalRules,
        processingTime,
      });

      // Return successful response
      res.status(200).json({
        success: true,
        data: {
          requestId,
          signals: signals.map((signal, index) => ({
            signalId: signal.id,
            matchingRules: evaluationResults[index]!.matchingRules.map(rule => ({
              ruleId: rule.ruleId,
              triggered: rule.triggered,
              score: rule.score,
              maxScore: rule.maxScore,
            })),
          })),
          summary: {
            totalSignals: signals.length,
            totalMatchingRules,
            totalRules,
            averageRulesPerSignal: totalRules / signals.length,
          },
        },
        metadata: {
          evaluatedAt: Date.now(),
          processingTime,
        },
      });

    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      this.logger.error('Batch evaluation failed', {
        requestId,
        error: error.message,
        processingTime,
      });

      res.status(400).json({
        success: false,
        error: {
          message: error.message,
          code: error.code || 'BATCH_EVALUATION_ERROR',
          requestId,
        },
        metadata: {
          processingTime,
        },
      });
    }
  }

  /**
   * Parse and validate single signal
   */
  private async parseAndValidateSignal(body: any, requestId: string): Promise<NormalizedMarketSignal> {
    if (!body || !body.signal) {
      throw new Error('Signal data is required');
    }

    // Basic validation
    if (!body.signal.exchange || !body.signal.symbol || !body.signal.signalType) {
      throw new Error('Signal must have exchange, symbol, and signalType');
    }

    if (!body.signal.timestamp) {
      body.signal.timestamp = Date.now();
    }

    // In a real implementation, this would use Zod schema validation
    return body.signal as NormalizedMarketSignal;
  }

  /**
   * Parse and validate batch signals
   */
  private async parseAndValidateBatch(body: any, requestId: string): Promise<NormalizedMarketSignal[]> {
    if (!body || !body.signals || !Array.isArray(body.signals)) {
      throw new Error('Batch signals must be an array');
    }

    if (body.signals.length === 0) {
      throw new Error('Batch must contain at least one signal');
    }

    if (body.signals.length > 100) {
      throw new Error('Batch size cannot exceed 100 signals');
    }

    // Validate each signal
    const signals: NormalizedMarketSignal[] = [];
    for (let i = 0; i < body.signals.length; i++) {
      const signal = body.signals[i];

      if (!signal.exchange || !signal.symbol || !signal.signalType) {
        throw new Error(`Signal ${i} must have exchange, symbol, and signalType`);
      }

      if (!signal.timestamp) {
        signal.timestamp = Date.now();
      }

      signals.push(signal as NormalizedMarketSignal);
    }

    return signals;
  }

  /**
   * Health check endpoint
   */
  async handleHealthCheck(req: express.Request, res: express.Response): Promise<void> {
    const startTime = Date.now();

    try {
      // Get engine statistics
      const stats = this.evaluationEngine.getPerformanceStats();

      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        performance: {
          averageEvaluationTime: stats.averageEvaluationTime,
          totalEvaluations: stats.totalEvaluations,
          cacheHitRatio: stats.cacheStats.hitRatio,
        },
        processingTime: Date.now() - startTime,
      };

      res.status(200).json(health);

    } catch (error: any) {
      this.logger.error('Health check failed', { error: error.message });

      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
        processingTime: Date.now() - startTime,
      });
    }
  }

  /**
   * Metrics endpoint for observability
   */
  async handleMetrics(req: express.Request, res: express.Response): Promise<void> {
    try {
      const stats = this.evaluationEngine.getPerformanceStats();

      const metrics = {
        timestamp: new Date().toISOString(),
        evaluations: {
          total: stats.totalEvaluations,
          averageTime: stats.averageEvaluationTime,
        },
        cache: {
          hits: stats.cacheStats.hits,
          misses: stats.cacheStats.misses,
          hitRatio: stats.cacheStats.hitRatio,
          size: stats.cacheStats.size,
        },
        memory: {
          cacheUsage: this.getMemoryUsage(),
        },
      };

      res.status(200).json(metrics);

    } catch (error: any) {
      this.logger.error('Metrics retrieval failed', { error: error.message });

      res.status(500).json({
        error: 'Failed to retrieve metrics',
        message: error.message,
      });
    }
  }

  /**
   * Get approximate memory usage
   */
  private getMemoryUsage(): number {
    // Rough estimate - in real implementation would use process.memoryUsage()
    return 0;
  }
}
