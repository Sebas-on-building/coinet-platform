/**
 * =========================================
 * CONFIDENCE SCORING API
 * =========================================
 * RESTful API interface for the confidence scoring system
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import { ConfidenceScorer } from './ConfidenceScorer';
import type {
  ConfidenceConfig,
  ConfidenceRequest,
  ConfidenceResponse,
  ConfidenceScore,
  BacktestingResult,
  SignalTypeWeights
} from './types';
import type { SignalType } from '../types';

export interface APIEndpoints {
  calculateConfidence: string;
  batchCalculateConfidence: string;
  getScore: string;
  updateSourceReliability: string;
  updateHistoricalAccuracy: string;
  performBacktesting: string;
  getConfig: string;
  updateConfig: string;
  getStatus: string;
}

export class ConfidenceAPI extends EventEmitter {
  private logger: Logger;
  private confidenceScorer: ConfidenceScorer;
  private endpoints: APIEndpoints;
  private isInitialized: boolean = false;

  constructor(config: ConfidenceConfig, endpoints?: Partial<APIEndpoints>) {
    super();
    this.logger = new Logger('ConfidenceAPI');
    this.confidenceScorer = new ConfidenceScorer(config);

    this.endpoints = {
      calculateConfidence: '/confidence/calculate',
      batchCalculateConfidence: '/confidence/batch',
      getScore: '/confidence/score/:signalId',
      updateSourceReliability: '/confidence/source-reliability',
      updateHistoricalAccuracy: '/confidence/historical-accuracy',
      performBacktesting: '/confidence/backtesting',
      getConfig: '/confidence/config',
      updateConfig: '/confidence/config',
      getStatus: '/confidence/status',
      ...endpoints
    };
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Confidence API...');

      await this.confidenceScorer.initialize();

      // Set up event forwarding
      this.confidenceScorer.on('confidence_calculated', (response: ConfidenceResponse) => {
        this.emit('confidence_calculated', response);
      });

      this.isInitialized = true;
      this.logger.info('✅ Confidence API initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Confidence API', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await this.confidenceScorer.stop();
      this.isInitialized = false;
      this.logger.info('✅ Confidence API stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop Confidence API', error);
      throw error;
    }
  }

  /**
   * Calculate confidence score for a single signal
   */
  async calculateConfidence(request: ConfidenceRequest): Promise<ConfidenceResponse> {
    if (!this.isInitialized) {
      throw new Error('Confidence API is not initialized');
    }

    try {
      const response = await this.confidenceScorer.calculateConfidence(request);

      this.logger.debug('Confidence calculated via API', {
        signal_id: request.signalId,
        score: response.score.overallScore,
        cached: response.cached
      });

      return response;

    } catch (error: any) {
      this.logger.error('API confidence calculation failed', {
        signal_id: request.signalId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Calculate confidence scores for multiple signals
   */
  async batchCalculateConfidence(requests: ConfidenceRequest[]): Promise<ConfidenceResponse[]> {
    if (!this.isInitialized) {
      throw new Error('Confidence API is not initialized');
    }

    if (requests.length === 0) {
      return [];
    }

    this.logger.info('Batch confidence calculation started', {
      batch_size: requests.length
    });

    const responses: ConfidenceResponse[] = [];

    // Process requests concurrently for better performance
    const promises = requests.map(async (request) => {
      try {
        return await this.confidenceScorer.calculateConfidence(request);
      } catch (error: any) {
        this.logger.error('Batch confidence calculation failed for signal', {
          signal_id: request.signalId,
          error: error.message
        });
        // Return a failed response
        return {
          request,
          score: {
            signalId: request.signalId,
            signalType: request.signalType,
            overallScore: 0,
            factors: {
              dataFreshness: 0,
              sourceReliability: 0,
              historicalAccuracy: 0,
              signalConsistency: 0,
              marketRegimeFit: 0,
              signalStrength: 0
            },
            timestamp: new Date(),
            metadata: {
              calculationMethod: 'error',
              normalizationType: 'min_max' as 'z_score' | 'min_max',
              timeDecayApplied: false,
              weightsUsed: { market: 0.33, onChain: 0.33, social: 0.34 }
            }
          },
          calculationTime: 0,
          cached: false
        };
      }
    });

    const results = await Promise.all(promises);
    responses.push(...results);

    this.logger.info('Batch confidence calculation completed', {
      total_requests: requests.length,
      successful_responses: responses.filter(r => r.score.overallScore > 0).length
    });

    return responses;
  }

  /**
   * Get confidence score by signal ID
   */
  async getScore(signalId: string): Promise<ConfidenceScore | null> {
    if (!this.isInitialized) {
      throw new Error('Confidence API is not initialized');
    }

    // This would typically query a database for stored scores
    // For now, return null to indicate not found
    this.logger.debug('Score lookup requested', { signal_id: signalId });
    return null;
  }

  /**
   * Update source reliability (for learning from outcomes)
   */
  async updateSourceReliability(
    sourceId: string,
    signalType: SignalType,
    wasAccurate: boolean
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Confidence API is not initialized');
    }

    try {
      this.confidenceScorer.updateSourceReliability(sourceId, signalType, wasAccurate);

      this.logger.debug('Source reliability updated via API', {
        source_id: sourceId,
        signal_type: signalType,
        was_accurate: wasAccurate
      });

    } catch (error: any) {
      this.logger.error('API source reliability update failed', {
        source_id: sourceId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update historical accuracy (for learning from outcomes)
   */
  async updateHistoricalAccuracy(
    signalType: SignalType,
    wasAccurate: boolean
  ): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Confidence API is not initialized');
    }

    try {
      this.confidenceScorer.updateHistoricalAccuracy(signalType, wasAccurate);

      this.logger.debug('Historical accuracy updated via API', {
        signal_type: signalType,
        was_accurate: wasAccurate
      });

    } catch (error: any) {
      this.logger.error('API historical accuracy update failed', {
        signal_type: signalType,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Perform backtesting for weight calibration
   */
  async performBacktesting(startDate: Date, endDate: Date): Promise<BacktestingResult> {
    if (!this.isInitialized) {
      throw new Error('Confidence API is not initialized');
    }

    try {
      const result = await this.confidenceScorer.performBacktesting(startDate, endDate);

      this.logger.info('Backtesting completed via API', {
        period: `${startDate.toISOString()} - ${endDate.toISOString()}`,
        accuracy: result.metrics.accuracy,
        calibration_score: result.metrics.calibrationScore
      });

      return result;

    } catch (error: any) {
      this.logger.error('API backtesting failed', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ConfidenceConfig {
    return this.confidenceScorer.getConfig();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ConfidenceConfig>): void {
    this.confidenceScorer.updateConfig(newConfig);
  }

  /**
   * Get API status
   */
  getStatus(): {
    initialized: boolean;
    endpoints: APIEndpoints;
    scorer_status: string;
  } {
    return {
      initialized: this.isInitialized,
      endpoints: this.endpoints,
      scorer_status: this.confidenceScorer.getStatus()
    };
  }

  /**
   * Handle HTTP-style requests (for integration with web frameworks)
   */
  async handleRequest(method: string, path: string, body?: any): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Confidence API is not initialized');
    }

    const route = this.matchRoute(path);

    switch (method.toUpperCase()) {
      case 'POST':
        return await this.handlePost(route, body);

      case 'GET':
        return await this.handleGet(route, body);

      case 'PUT':
        return await this.handlePut(route, body);

      default:
        throw new Error(`Unsupported HTTP method: ${method}`);
    }
  }

  private matchRoute(path: string): string {
    // Simple route matching - in a real implementation, use a proper router
    if (path === this.endpoints.calculateConfidence) return 'calculateConfidence';
    if (path === this.endpoints.batchCalculateConfidence) return 'batchCalculateConfidence';
    if (path === this.endpoints.updateSourceReliability) return 'updateSourceReliability';
    if (path === this.endpoints.updateHistoricalAccuracy) return 'updateHistoricalAccuracy';
    if (path === this.endpoints.performBacktesting) return 'performBacktesting';
    if (path === this.endpoints.getConfig) return 'getConfig';
    if (path === this.endpoints.updateConfig) return 'updateConfig';
    if (path === this.endpoints.getStatus) return 'getStatus';
    if (path.startsWith('/confidence/score/')) return 'getScore';

    throw new Error(`Unknown route: ${path}`);
  }

  private async handlePost(route: string, body: any): Promise<any> {
    switch (route) {
      case 'calculateConfidence':
        return await this.calculateConfidence(body);

      case 'batchCalculateConfidence':
        return await this.batchCalculateConfidence(body.requests);

      case 'updateSourceReliability':
        await this.updateSourceReliability(body.sourceId, body.signalType, body.wasAccurate);
        return { success: true };

      case 'updateHistoricalAccuracy':
        await this.updateHistoricalAccuracy(body.signalType, body.wasAccurate);
        return { success: true };

      case 'performBacktesting':
        return await this.performBacktesting(new Date(body.startDate), new Date(body.endDate));

      case 'updateConfig':
        this.updateConfig(body);
        return { success: true };

      default:
        throw new Error(`Unsupported POST route: ${route}`);
    }
  }

  private async handleGet(route: string, body: any): Promise<any> {
    switch (route) {
      case 'getScore':
        const signalId = body?.signalId || '';
        return await this.getScore(signalId);

      case 'getConfig':
        return this.getConfig();

      case 'getStatus':
        return this.getStatus();

      default:
        throw new Error(`Unsupported GET route: ${route}`);
    }
  }

  private async handlePut(route: string, body: any): Promise<any> {
    switch (route) {
      case 'updateConfig':
        this.updateConfig(body);
        return { success: true };

      default:
        throw new Error(`Unsupported PUT route: ${route}`);
    }
  }

  /**
   * Create default configuration
   */
  static createDefaultConfig(): ConfidenceConfig {
    return {
      normalizationType: 'z_score',
      timeDecay: {
        enabled: true,
        halfLifeMinutes: 30,
        maxAgeMinutes: 1440 // 24 hours
      },
      factorWeights: {
        dataFreshness: 0.15,
        sourceReliability: 0.25,
        historicalAccuracy: 0.20,
        signalConsistency: 0.15,
        marketRegimeFit: 0.15,
        signalStrength: 0.10
      },
      signalTypeWeights: {
        market: 0.4,
        onChain: 0.35,
        social: 0.25
      },
      marketRegime: {
        detectionWindow: 60, // 1 hour
        minConfidence: 0.7,
        regimeTransitionThreshold: 0.3
      },
      backtesting: {
        enabled: true,
        lookbackPeriod: 30, // 30 days
        validationPeriod: 7, // 7 days
        minSampleSize: 100
      },
      adaptiveWeighting: {
        learningRate: 0.01,
        decayFactor: 0.99
      }
    };
  }

  /**
   * Get API endpoints
   */
  getEndpoints(): APIEndpoints {
    return { ...this.endpoints };
  }
}
