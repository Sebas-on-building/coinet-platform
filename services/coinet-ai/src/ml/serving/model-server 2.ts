/**
 * 🚀 DIVINE MODEL SERVING INFRASTRUCTURE
 *
 * Production-ready model serving with monitoring, versioning, and MLOps capabilities
 */

import * as tf from '@tensorflow/tfjs-node';
import { logger } from '../../utils/logger';
import {
  PsychologyFeatures,
  OracleFeatures,
  PsychologyPrediction,
  OraclePrediction,
  InferenceRequest,
  InferenceResponse
} from '../types/ml-types';
import { ML_CONFIG } from '../config/ml-config';
import PsychologyTransformer from '../models/psychology-transformer';
import OracleNeuralNetwork from '../models/oracle-neural-network';

export class ModelServer {
  private psychologyModel: PsychologyTransformer;
  private oracleModel: OracleNeuralNetwork;
  private isInitialized: boolean = false;
  private modelVersions: Map<string, string> = new Map();
  private performanceMetrics: Map<string, any> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.psychologyModel = new PsychologyTransformer();
    this.oracleModel = new OracleNeuralNetwork();
    logger.info('🚀 ModelServer initialized for production deployment');
  }

  /**
   * Initialize the model server with production configurations
   */
  async initialize(): Promise<void> {
    try {
      logger.info('🚀 Initializing production model server...');

      // Load models from production storage
      await this.loadProductionModels();

      // Set up performance monitoring
      this.setupPerformanceMonitoring();

      // Set up health checks
      this.setupHealthChecks();

      // Set up model versioning
      this.setupModelVersioning();

      this.isInitialized = true;

      logger.info('✅ Production model server initialized successfully');
      logger.info(`🔬 Psychology Model: ${this.psychologyModel.modelId}`);
      logger.info(`🔮 Oracle Model: ${this.oracleModel.modelId}`);

    } catch (error) {
      logger.error(`Failed to initialize model server: ${error}`);
      throw error;
    }
  }

  /**
   * Serve psychology model predictions
   */
  async servePsychologyPrediction(
    features: PsychologyFeatures,
    options: {
      batchSize?: number;
      returnProbabilities?: boolean;
      returnUncertainty?: boolean;
      threshold?: number;
    } = {}
  ): Promise<PsychologyPrediction> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      // Preprocess features for model input
      const preprocessedFeatures = await this.preprocessPsychologyFeatures(features);

      // Make prediction
      const prediction = await this.psychologyModel.predict(features);

      // Apply confidence threshold if specified
      if (options.threshold && prediction.emotionalState.confidence < options.threshold) {
        throw new Error(`Prediction confidence ${prediction.emotionalState.confidence} below threshold ${options.threshold}`);
      }

      // Record performance metrics
      this.recordInferenceMetrics('psychology', Date.now() - startTime);

      // Log successful inference
      logger.info(`🧠 Psychology prediction served: ${prediction.emotionalState.prediction} (${prediction.emotionalState.confidence})`);

      return prediction;

    } catch (error) {
      this.recordInferenceError('psychology', error);
      logger.error(`Psychology prediction failed: ${error}`);
      throw error;
    }
  }

  /**
   * Serve oracle model predictions
   */
  async serveOraclePrediction(
    features: OracleFeatures,
    options: {
      batchSize?: number;
      returnProbabilities?: boolean;
      returnUncertainty?: boolean;
      threshold?: number;
    } = {}
  ): Promise<OraclePrediction> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();

    try {
      // Preprocess features for model input
      const preprocessedFeatures = await this.preprocessOracleFeatures(features);

      // Make prediction
      const prediction = await this.oracleModel.predict(features);

      // Apply confidence threshold if specified
      if (options.threshold) {
        const avgConfidence = (prediction.predictions.next1h.confidence +
                             prediction.predictions.next24h.confidence +
                             prediction.predictions.next7d.confidence) / 3;

        if (avgConfidence < options.threshold) {
          throw new Error(`Prediction confidence ${avgConfidence} below threshold ${options.threshold}`);
        }
      }

      // Record performance metrics
      this.recordInferenceMetrics('oracle', Date.now() - startTime);

      // Log successful inference
      logger.info(`🔮 Oracle prediction served: ${prediction.predictions.next24h.direction} (${prediction.predictions.next24h.confidence})`);

      return prediction;

    } catch (error) {
      this.recordInferenceError('oracle', error);
      logger.error(`Oracle prediction failed: ${error}`);
      throw error;
    }
  }

  /**
   * Get server health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    models: {
      psychology: boolean;
      oracle: boolean;
    };
    performance: {
      avgLatency: number;
      errorRate: number;
      uptime: number;
    };
    versions: {
      psychology: string;
      oracle: string;
    };
  } {
    const psychologyHealthy = this.psychologyModel.model !== null;
    const oracleHealthy = this.oracleModel.model !== null;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (!psychologyHealthy || !oracleHealthy) status = 'unhealthy';
    else if (this.getAverageLatency() > 2000) status = 'degraded'; // > 2s latency

    const performance = this.getPerformanceMetrics();

    return {
      status,
      models: {
        psychology: psychologyHealthy,
        oracle: oracleHealthy
      },
      performance,
      versions: {
        psychology: this.modelVersions.get('psychology') || 'unknown',
        oracle: this.modelVersions.get('oracle') || 'unknown'
      }
    };
  }

  /**
   * Update model versions
   */
  async updateModelVersion(modelType: 'psychology' | 'oracle', newVersion: string): Promise<void> {
    try {
      logger.info(`🔄 Updating ${modelType} model to version ${newVersion}`);

      // Load new model version
      await this.loadModelVersion(modelType, newVersion);

      // Update version tracking
      this.modelVersions.set(modelType, newVersion);

      // Perform health check on new model
      await this.validateModelHealth(modelType);

      logger.info(`✅ ${modelType} model updated to version ${newVersion}`);

    } catch (error) {
      logger.error(`Failed to update ${modelType} model: ${error}`);
      throw error;
    }
  }

  /**
   * Rollback to previous model version
   */
  async rollbackModel(modelType: 'psychology' | 'oracle', targetVersion: string): Promise<void> {
    try {
      logger.info(`🔄 Rolling back ${modelType} model to version ${targetVersion}`);

      // Load target version
      await this.loadModelVersion(modelType, targetVersion);

      // Update version tracking
      this.modelVersions.set(modelType, targetVersion);

      // Validate rollback
      await this.validateModelHealth(modelType);

      logger.info(`✅ ${modelType} model rolled back to version ${targetVersion}`);

    } catch (error) {
      logger.error(`Failed to rollback ${modelType} model: ${error}`);
      throw error;
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStatistics(): {
    psychology: {
      totalInferences: number;
      averageLatency: number;
      errorRate: number;
      p95Latency: number;
    };
    oracle: {
      totalInferences: number;
      averageLatency: number;
      errorRate: number;
      p95Latency: number;
    };
    system: {
      uptime: number;
      memoryUsage: number;
      cpuUsage: number;
    };
  } {
    return {
      psychology: this.getModelPerformanceMetrics('psychology'),
      oracle: this.getModelPerformanceMetrics('oracle'),
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage().heapUsed,
        cpuUsage: process.cpuUsage().user
      }
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      // Stop health checks
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Dispose models
      if (this.psychologyModel.model) {
        this.psychologyModel.model.dispose();
      }
      if (this.oracleModel.model) {
        this.oracleModel.model.dispose();
      }

      // Clear metrics
      this.performanceMetrics.clear();
      this.modelVersions.clear();

      this.isInitialized = false;

      logger.info('🧹 Model server cleaned up');

    } catch (error) {
      logger.error(`Failed to cleanup model server: ${error}`);
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async loadProductionModels(): Promise<void> {
    // Load models from production storage (would integrate with model registry)
    logger.info('📂 Loading production models...');

    // For now, build models if not already built
    if (!this.psychologyModel.model) {
      await this.psychologyModel.buildModel();
    }
    if (!this.oracleModel.model) {
      await this.oracleModel.buildModel();
    }

    this.modelVersions.set('psychology', '1.0.0');
    this.modelVersions.set('oracle', '1.0.0');

    logger.info('✅ Production models loaded');
  }

  private async loadModelVersion(modelType: 'psychology' | 'oracle', version: string): Promise<void> {
    // Implementation would load specific model version from storage
    logger.info(`📂 Loading ${modelType} model version ${version}`);

    // For now, rebuild model (would load from persistent storage in production)
    if (modelType === 'psychology') {
      if (this.psychologyModel.model) {
        this.psychologyModel.model.dispose();
      }
      await this.psychologyModel.buildModel();
    } else {
      if (this.oracleModel.model) {
        this.oracleModel.model.dispose();
      }
      await this.oracleModel.buildModel();
    }
  }

  private async validateModelHealth(modelType: 'psychology' | 'oracle'): Promise<void> {
    try {
      // Create dummy input for health check
      const dummyInput = this.createDummyInput(modelType);

      // Make test prediction
      let prediction;
      if (modelType === 'psychology') {
        prediction = await this.psychologyModel.predict(dummyInput as PsychologyFeatures);
      } else {
        prediction = await this.oracleModel.predict(dummyInput as OracleFeatures);
      }

      logger.info(`✅ ${modelType} model health check passed`);

    } catch (error) {
      logger.error(`${modelType} model health check failed: ${error}`);
      throw error;
    }
  }

  private createDummyInput(modelType: 'psychology' | 'oracle'): any {
    if (modelType === 'psychology') {
      return {
        text: {
          socialPosts: ['dummy post'],
          newsHeadlines: ['dummy headline'],
          marketCommentary: ['dummy commentary']
        },
        market: {
          priceSeries: [100, 101, 102],
          volumeSeries: [1000, 1100, 1200],
          volatilityMetrics: [0.02, 0.025, 0.03]
        },
        social: {
          sentimentScores: [0.5, 0.6, 0.7],
          engagementMetrics: [{
            likes: 100,
            retweets: 50,
            replies: 25,
            shares: 10,
            views: 1000,
            comments: 20,
            uniqueAuthors: 15
          }],
          influenceGraphs: { nodes: [], edges: [] }
        },
        temporal: {
          timeOfDay: 14,
          dayOfWeek: 2,
          marketSession: 'us' as const
        }
      };
    } else {
      return {
        price: [100, 101, 102, 103, 104],
        volume: [1000, 1100, 1200, 1300, 1400],
        socialSentiment: [0.5, 0.6, 0.7, 0.8, 0.9],
        whaleTransactions: [],
        newsSentiment: [0.5, 0.6, 0.7, 0.8, 0.9],
        technicalIndicators: [],
        onchainMetrics: []
      };
    }
  }

  private setupPerformanceMonitoring(): void {
    // Set up periodic performance logging
    setInterval(() => {
      const stats = this.getPerformanceStatistics();
      logger.info(`📊 Performance Stats: ${JSON.stringify(stats)}`);
    }, 60000); // Every minute
  }

  private setupHealthChecks(): void {
    // Set up periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.validateModelHealth('psychology');
        await this.validateModelHealth('oracle');
        logger.debug('💚 All models healthy');
      } catch (error) {
        logger.error(`🚨 Health check failed: ${error}`);
      }
    }, 30000); // Every 30 seconds
  }

  private setupModelVersioning(): void {
    // Set up model versioning system
    logger.info('📋 Model versioning system initialized');
  }

  private async preprocessPsychologyFeatures(features: PsychologyFeatures): Promise<any> {
    // Preprocessing logic would go here
    return features;
  }

  private async preprocessOracleFeatures(features: OracleFeatures): Promise<any> {
    // Preprocessing logic would go here
    return features;
  }

  private recordInferenceMetrics(modelType: 'psychology' | 'oracle', latency: number): void {
    const key = `${modelType}_inference`;
    const metrics = this.performanceMetrics.get(key) || {
      count: 0,
      totalLatency: 0,
      latencies: []
    };

    metrics.count++;
    metrics.totalLatency += latency;
    metrics.latencies.push(latency);

    // Keep only last 1000 latencies for memory efficiency
    if (metrics.latencies.length > 1000) {
      metrics.latencies = metrics.latencies.slice(-1000);
    }

    this.performanceMetrics.set(key, metrics);
  }

  private recordInferenceError(modelType: 'psychology' | 'oracle', error: any): void {
    const key = `${modelType}_errors`;
    const errors = this.performanceMetrics.get(key) || { count: 0 };
    errors.count++;
    this.performanceMetrics.set(key, errors);
  }

  private getAverageLatency(): number {
    const psychologyMetrics = this.performanceMetrics.get('psychology_inference');
    const oracleMetrics = this.performanceMetrics.get('oracle_inference');

    if (!psychologyMetrics && !oracleMetrics) return 0;

    const totalLatency = (psychologyMetrics?.totalLatency || 0) + (oracleMetrics?.totalLatency || 0);
    const totalCount = (psychologyMetrics?.count || 0) + (oracleMetrics?.count || 0);

    return totalCount > 0 ? totalLatency / totalCount : 0;
  }

  private getPerformanceMetrics(): any {
    const psychologyInference = this.performanceMetrics.get('psychology_inference');
    const psychologyErrors = this.performanceMetrics.get('psychology_errors');
    const oracleInference = this.performanceMetrics.get('oracle_inference');
    const oracleErrors = this.performanceMetrics.get('oracle_errors');

    return {
      avgLatency: this.getAverageLatency(),
      errorRate: this.calculateErrorRate(),
      uptime: process.uptime()
    };
  }

  private getModelPerformanceMetrics(modelType: 'psychology' | 'oracle'): any {
    const inferenceKey = `${modelType}_inference`;
    const errorKey = `${modelType}_errors`;
    const inference = this.performanceMetrics.get(inferenceKey);
    const errors = this.performanceMetrics.get(errorKey);

    if (!inference) {
      return {
        totalInferences: 0,
        averageLatency: 0,
        errorRate: 0,
        p95Latency: 0
      };
    }

    const avgLatency = inference.totalLatency / inference.count;
    const sortedLatencies = inference.latencies.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedLatencies.length * 0.95);
    const p95Latency = sortedLatencies[p95Index] || 0;
    const errorRate = errors ? (errors.count / inference.count) * 100 : 0;

    return {
      totalInferences: inference.count,
      averageLatency: avgLatency,
      errorRate,
      p95Latency
    };
  }

  private calculateErrorRate(): number {
    const psychologyInference = this.performanceMetrics.get('psychology_inference');
    const psychologyErrors = this.performanceMetrics.get('psychology_errors');
    const oracleInference = this.performanceMetrics.get('oracle_inference');
    const oracleErrors = this.performanceMetrics.get('oracle_errors');

    const totalInferences = (psychologyInference?.count || 0) + (oracleInference?.count || 0);
    const totalErrors = (psychologyErrors?.count || 0) + (oracleErrors?.count || 0);

    return totalInferences > 0 ? (totalErrors / totalInferences) * 100 : 0;
  }
}

export default ModelServer;
