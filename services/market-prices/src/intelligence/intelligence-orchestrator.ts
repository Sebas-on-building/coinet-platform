/**
 * =========================================
 * INTELLIGENCE ORCHESTRATOR
 * =========================================
 * Coordinates Pattern Collector, Miner, and Matcher
 * Provides unified interface for predictive intelligence
 * Divine world-class orchestration
 */

import { EventEmitter } from 'eventemitter3';
import { Pool } from 'pg';
import { logger } from '../utils/logger';
import { PatternCollectorService, PatternCollectorConfig } from './pattern-collector.service';
import { PatternMinerService } from './pattern-miner.service';
import { PatternMatcherService } from './pattern-matcher.service';
import {
  SessionContext,
  PredictionResult,
  PrefetchRecommendation,
  PatternMiningStats,
  PatternMiningConfig,
  AccessPattern,
} from './types/pattern.types';

export interface IntelligenceOrchestratorConfig {
  database: Pool;
  patternCollector?: Partial<PatternCollectorConfig>;
  patternMining?: Partial<PatternMiningConfig>;
  autoMining?: boolean;
  miningInterval?: number; // Override pattern mining interval
}

/**
 * Intelligence Orchestrator - Unified predictive intelligence interface
 */
export class IntelligenceOrchestrator extends EventEmitter {
  private collector: PatternCollectorService;
  private miner: PatternMinerService;
  private matcher: PatternMatcherService;
  private initialized: boolean = false;

  constructor(config: IntelligenceOrchestratorConfig) {
    super();

    // Initialize services
    this.collector = new PatternCollectorService({
      database: config.database,
      ...config.patternCollector,
    });

    this.miner = new PatternMinerService(config.patternMining);

    this.matcher = new PatternMatcherService(this.miner);

    // Forward events
    this.setupEventForwarding();

    logger.info('Intelligence Orchestrator initialized');
  }

  /**
   * Initialize all services
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize collector (creates database tables)
      await this.collector.initialize();

      // Start auto-mining if enabled
      this.miner.startAutoMining();

      // Listen for auto-mining triggers
      this.miner.on('auto_mining_triggered', async () => {
        await this.runMining();
      });

      this.initialized = true;
      logger.info('Intelligence Orchestrator fully initialized');

      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize Intelligence Orchestrator', { error });
      throw error;
    }
  }

  /**
   * Record user access for pattern learning
   */
  async recordAccess(
    userId: string,
    tokens: string[],
    sessionId: string,
    metadata?: {
      responseTime?: number;
      cached?: boolean;
      userAgent?: string;
      region?: string;
    }
  ): Promise<void> {
    await this.collector.recordAccess(userId, tokens, sessionId, metadata);
  }

  /**
   * Predict next tokens user will request
   */
  async predictNextTokens(context: SessionContext): Promise<PredictionResult> {
    return this.matcher.predictNextTokens(context);
  }

  /**
   * Generate prefetch recommendations
   */
  async generatePrefetchRecommendations(
    context: SessionContext
  ): Promise<PrefetchRecommendation[]> {
    return this.matcher.generatePrefetchRecommendations(context);
  }

  /**
   * Validate prediction against actual request
   */
  async validatePrediction(
    predictionId: string,
    predictedTokens: string[],
    actualTokens: string[]
  ): Promise<void> {
    await this.matcher.validatePrediction(
      predictionId,
      predictedTokens,
      actualTokens
    );
  }

  /**
   * Run pattern mining manually
   */
  async runMining(): Promise<void> {
    try {
      logger.info('Running pattern mining...');

      // Get recent patterns from collector
      const recentPatterns = await this.collector.getRecentPatterns(
        10000,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
      );

      if (recentPatterns.length === 0) {
        logger.warn('No patterns to mine');
        return;
      }

      // Run mining
      const result = await this.miner.minePatterns(recentPatterns);

      logger.info('Pattern mining completed', {
        jobId: result.jobId,
        duration: result.duration,
        patternsDiscovered: result.patternsDiscovered,
      });

      this.emit('mining_completed', result);
    } catch (error) {
      logger.error('Pattern mining failed', { error });
      this.emit('mining_failed', { error });
    }
  }

  /**
   * Get recent patterns for entropy analysis
   */
  async getRecentPatterns(limit: number = 1000): Promise<AccessPattern[]> {
    return this.collector.getRecentPatterns(limit);
  }

  /**
   * Get comprehensive statistics
   */
  async getStatistics(): Promise<{
    collector: Awaited<ReturnType<typeof IntelligenceOrchestrator.prototype.collector.getStatistics>>;
    miner: PatternMiningStats;
    matcher: ReturnType<typeof IntelligenceOrchestrator.prototype.matcher.getValidationMetrics>;
  }> {
    return {
      collector: await this.collector.getStatistics(),
      miner: this.miner.getStatistics(),
      matcher: this.matcher.getValidationMetrics(),
    };
  }

  /**
   * Get prediction accuracy
   */
  getPredictionAccuracy(): number {
    return this.matcher.getPredictionAccuracy();
  }

  /**
   * Cleanup old data
   */
  async cleanup(): Promise<void> {
    try {
      const deletedCount = await this.collector.cleanup();
      logger.info('Cleanup completed', { deletedPatternsCount: deletedCount });
    } catch (error) {
      logger.error('Cleanup failed', { error });
    }
  }

  /**
   * Setup event forwarding from child services
   */
  private setupEventForwarding(): void {
    // Forward collector events
    this.collector.on('access_recorded', (data) => {
      this.emit('access_recorded', data);
    });

    this.collector.on('patterns_flushed', (data) => {
      this.emit('patterns_flushed', data);
    });

    // Forward miner events
    this.miner.on('pattern_discovered', (data) => {
      this.emit('pattern_discovered', data);
    });

    this.miner.on('mining_started', (data) => {
      this.emit('mining_started', data);
    });

    this.miner.on('mining_completed', (data) => {
      this.emit('mining_completed', data);
    });

    // Forward matcher events
    this.matcher.on('prediction_made', (data) => {
      this.emit('prediction_made', data);
    });

    this.matcher.on('prediction_validated', (data) => {
      this.emit('prediction_validated', data);
    });
  }

  /**
   * Destroy all services
   */
  async destroy(): Promise<void> {
    await this.collector.destroy();
    await this.miner.destroy();
    await this.matcher.destroy();
    this.removeAllListeners();
    logger.info('Intelligence Orchestrator destroyed');
  }
}

export default IntelligenceOrchestrator;

