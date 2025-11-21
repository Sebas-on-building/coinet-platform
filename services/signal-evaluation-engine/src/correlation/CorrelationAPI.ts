/**
 * =========================================
 * CORRELATION ANALYSIS API
 * =========================================
 * Main API for cross-signal correlation analysis with
 * integration to confidence scoring and adaptive weighting
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import { CorrelationAnalyzer } from './CorrelationAnalyzer';
import { SignalClustering } from './SignalClustering';
import { PCAAnalyzer } from './PCAAnalyzer';
import type {
  NormalizedSignal,
  SignalType
} from '../types';
import type {
  CorrelationConfig,
  CorrelationAnalysisRequest,
  CorrelationAnalysisResponse,
  CorrelationInsights,
  AdaptiveWeightingUpdate,
  CorrelationMetrics
} from './types';
import type { ConfidenceAPI } from '../confidence';

export interface CorrelationAPIEndpoints {
  analyzeCorrelations: string;
  getInsights: string;
  updateAdaptiveWeights: string;
  getMetrics: string;
  getConfig: string;
  updateConfig: string;
  getStatus: string;
}

export class CorrelationAPI extends EventEmitter {
  private logger: Logger;
  private config: CorrelationConfig;
  private isInitialized: boolean = false;

  // Core analysis components
  private correlationAnalyzer: CorrelationAnalyzer;
  private signalClustering: SignalClustering;
  private pcaAnalyzer: PCAAnalyzer;

  // Integration
  private confidenceAPI?: ConfidenceAPI;

  // Endpoints
  private endpoints: CorrelationAPIEndpoints;

  constructor(config: CorrelationConfig, endpoints?: Partial<CorrelationAPIEndpoints>) {
    super();
    this.logger = new Logger('CorrelationAPI');
    this.config = config;

    // Initialize core components
    this.correlationAnalyzer = new CorrelationAnalyzer(config);
    this.signalClustering = new SignalClustering();
    this.pcaAnalyzer = new PCAAnalyzer();

    this.endpoints = {
      analyzeCorrelations: '/correlation/analyze',
      getInsights: '/correlation/insights',
      updateAdaptiveWeights: '/correlation/adaptive-weights',
      getMetrics: '/correlation/metrics',
      getConfig: '/correlation/config',
      updateConfig: '/correlation/config',
      getStatus: '/correlation/status',
      ...endpoints
    };
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Correlation API...');

      // Initialize all components
      await Promise.all([
        this.correlationAnalyzer.initialize(),
        this.signalClustering.initialize(),
        this.pcaAnalyzer.initialize()
      ]);

      // Set up event forwarding
      this.correlationAnalyzer.on('analysis_complete', (response: CorrelationAnalysisResponse) => {
        this.handleAnalysisComplete(response);
      });

      this.isInitialized = true;
      this.logger.info('✅ Correlation API initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize Correlation API', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await Promise.all([
        this.correlationAnalyzer.stop(),
        this.signalClustering.stop(),
        this.pcaAnalyzer.stop()
      ]);

      this.isInitialized = false;
      this.logger.info('✅ Correlation API stopped successfully');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop Correlation API', error);
      throw error;
    }
  }

  /**
   * Set confidence API for integration
   */
  setConfidenceAPI(confidenceAPI: ConfidenceAPI): void {
    this.confidenceAPI = confidenceAPI;
    this.logger.info('Confidence API integrated with Correlation API');
  }

  /**
   * Add signal for correlation analysis
   */
  addSignal(signal: NormalizedSignal): void {
    if (!this.isInitialized) {
      throw new Error('Correlation API is not initialized');
    }

    this.correlationAnalyzer.addSignal(signal);
    this.signalClustering.addSignal(signal);

    this.logger.debug('Signal added to correlation analysis', {
      signal_id: signal.id,
      signal_type: signal.type
    });
  }

  /**
   * Perform comprehensive correlation analysis
   */
  async analyzeCorrelations(request: CorrelationAnalysisRequest): Promise<CorrelationAnalysisResponse> {
    if (!this.isInitialized) {
      throw new Error('Correlation API is not initialized');
    }

    try {
      this.logger.info('Starting comprehensive correlation analysis', {
        signal_types: request.signalTypes,
        include_causality: request.includeCausality,
        include_clustering: request.includeClustering,
        include_pca: request.includePCA
      });

      // Perform core correlation analysis
      const correlationResponse = await this.correlationAnalyzer.analyzeCorrelations(request);

      // Perform clustering analysis if requested
      let clusters: any[] = [];
      let convergencePatterns: any[] = [];
      if (request.includeClustering) {
        clusters = await this.signalClustering.performClustering(
          correlationResponse.matrix,
          correlationResponse.signals || []
        );
      }

      // Perform PCA analysis if requested
      let pcaResult: any = undefined;
      if (request.includePCA) {
        pcaResult = await this.pcaAnalyzer.performPCA(
          correlationResponse.signals || [],
          correlationResponse.matrix
        );
      }

      // Combine results
      const response: CorrelationAnalysisResponse = {
        ...correlationResponse,
        clusters,
        convergencePatterns,
        pcaResult
      };

      this.logger.info('Comprehensive correlation analysis completed', {
        significant_pairs: response.significantPairs.length,
        clusters_found: clusters.length,
        pca_components: pcaResult?.components.length || 0
      });

      return response;

    } catch (error: any) {
      this.logger.error('Correlation analysis failed', {
        signal_types: request.signalTypes,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get correlation insights
   */
  getCorrelationInsights(): CorrelationInsights {
    if (!this.isInitialized) {
      throw new Error('Correlation API is not initialized');
    }

    const correlationInsights = this.correlationAnalyzer.getCorrelationInsights();
    const pcaInsights = this.pcaAnalyzer.getPCAInsights();
    const predictiveClusters = this.signalClustering.getPredictiveClusters();
    const recentPatterns = this.signalClustering.getRecentConvergencePatterns();

    return {
      dominantCorrelations: correlationInsights.dominantCorrelations,
      predictiveClusters,
      leadLagRelationships: correlationInsights.leadLagRelationships,
      dimensionalityReduction: {
        originalDimensions: pcaInsights.dimensionalityReduction.originalDimensions,
        reducedDimensions: pcaInsights.dimensionalityReduction.reducedDimensions,
        informationRetained: pcaInsights.varianceAnalysis.totalExplainedVariance // Using totalExplainedVariance as informationRetained
      },
      adaptiveUpdates: correlationInsights.adaptiveUpdates,
      marketRegime: correlationInsights.marketRegime
    };
  }

  /**
   * Update adaptive weights based on correlation insights
   */
  async updateAdaptiveWeights(): Promise<AdaptiveWeightingUpdate[]> {
    if (!this.isInitialized) {
      throw new Error('Correlation API is not initialized');
    }

    if (!this.confidenceAPI) {
      throw new Error('Confidence API not integrated');
    }

    try {
      this.logger.info('Updating adaptive weights based on correlation insights');

      const insights = this.getCorrelationInsights();
      const updates: AdaptiveWeightingUpdate[] = [];

      // Update weights based on correlation strength
      for (const pair of insights.dominantCorrelations) {
        const correlationInfluence = this.calculateCorrelationInfluence(pair);

        // Update weights for both signal types in the pair
        for (const signalType of [pair.signalType1, pair.signalType2]) {
          const update = await this.createAdaptiveWeightingUpdate(
            signalType,
            correlationInfluence,
            'correlation',
            `Strong correlation (${pair.correlation.toFixed(3)}) with ${pair.signalType1 === signalType ? pair.signalType2 : pair.signalType1}`
          );

          if (update) {
            updates.push(update);

            // Apply the update to confidence API
            this.confidenceAPI.updateConfig({
              signalTypeWeights: {
                ...this.confidenceAPI.getConfig().signalTypeWeights,
                [this.mapSignalTypeToCategory(signalType)]: update.newWeight
              }
            });
          }
        }
      }

      // Update weights based on cluster membership
      for (const cluster of insights.predictiveClusters) {
        const clusterInfluence = cluster.predictivePower;

        for (const signalType of cluster.signals) {
          const update = await this.createAdaptiveWeightingUpdate(
            signalType,
            clusterInfluence,
            'clustering',
            `Member of predictive cluster with ${cluster.predictivePower.toFixed(3)} power`
          );

          if (update) {
            updates.push(update);
          }
        }
      }

      this.logger.info('Adaptive weights updated', {
        total_updates: updates.length,
        avg_confidence: updates.length > 0 ?
          updates.reduce((sum, u) => sum + u.confidence, 0) / updates.length : 0
      });

      return updates;

    } catch (error: any) {
      this.logger.error('Adaptive weighting update failed', error);
      throw error;
    }
  }

  /**
   * Calculate correlation influence on signal weight
   */
  private calculateCorrelationInfluence(pair: any): number {
    // Higher correlation strength = higher influence
    return Math.min(1, Math.abs(pair.correlation) * 2);
  }

  /**
   * Create adaptive weighting update
   */
  private async createAdaptiveWeightingUpdate(
    signalType: SignalType,
    influence: number,
    source: 'correlation' | 'clustering' | 'causality',
    reasoning: string
  ): Promise<AdaptiveWeightingUpdate | null> {
    try {
      const currentConfig = this.confidenceAPI?.getConfig();
      if (!currentConfig) return null;

      const category = this.mapSignalTypeToCategory(signalType);
      const currentWeight = currentConfig.signalTypeWeights[category];

      // Calculate new weight with adaptive learning
      const learningRate = currentConfig.adaptiveWeighting.learningRate;
      const decayFactor = currentConfig.adaptiveWeighting.decayFactor;

      const influenceFactor = source === 'correlation' ? 0.3 :
                             source === 'clustering' ? 0.4 : 0.3;

      const adjustment = influence * influenceFactor * learningRate;
      const newWeight = Math.max(0.01, Math.min(1, currentWeight + adjustment));

      // Calculate confidence based on influence strength and historical performance
      const confidence = Math.min(1, influence * (1 + decayFactor));

      return {
        signalType,
        correlationInfluence: source === 'correlation' ? influence : 0,
        clusterInfluence: source === 'clustering' ? influence : 0,
        causalityInfluence: source === 'causality' ? influence : 0,
        newWeight,
        confidence,
        reasoning: [reasoning]
      };

    } catch (error: any) {
      this.logger.error('Failed to create adaptive weighting update', {
        signal_type: signalType,
        error: error.message
      });
      return null;
    }
  }

  /**
   * Map signal type to category
   */
  private mapSignalTypeToCategory(signalType: SignalType): 'market' | 'onChain' | 'social' {
    const marketTypes: SignalType[] = ['price', 'volume', 'technical'];
    const onChainTypes: SignalType[] = ['on_chain', 'defi_metrics', 'fundamental'];
    const socialTypes: SignalType[] = ['social_media', 'news'];

    if (marketTypes.includes(signalType)) return 'market';
    if (onChainTypes.includes(signalType)) return 'onChain';
    if (socialTypes.includes(signalType)) return 'social';

    return 'market'; // Default fallback
  }

  /**
   * Handle analysis completion
   */
  private handleAnalysisComplete(response: CorrelationAnalysisResponse): void {
    // Perform clustering if requested
    if (response.request.includeClustering) {
      this.signalClustering.performClustering(
        response.matrix,
        response.signals || []
      ).catch(error => {
        this.logger.error('Clustering analysis failed', error);
      });
    }

    // Perform PCA if requested
    if (response.request.includePCA) {
      this.pcaAnalyzer.performPCA(
        response.signals || [],
        response.matrix
      ).catch(error => {
        this.logger.error('PCA analysis failed', error);
      });
    }

    // Trigger adaptive weighting update if enabled
    if (this.config.adaptiveWeighting.enabled) {
      setTimeout(() => {
        this.updateAdaptiveWeights().catch(error => {
          this.logger.error('Automatic adaptive weighting update failed', error);
        });
      }, 1000); // Small delay to allow clustering/PCA to complete
    }

    this.emit('analysis_complete', response);
  }

  /**
   * Get correlation metrics
   */
  getMetrics(): CorrelationMetrics {
    if (!this.isInitialized) {
      throw new Error('Correlation API is not initialized');
    }

    return this.correlationAnalyzer.getMetrics();
  }

  /**
   * Get current configuration
   */
  getConfig(): CorrelationConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CorrelationConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // Update component configurations
    this.correlationAnalyzer.updateConfig(newConfig);

    this.logger.info('Correlation configuration updated', newConfig);
  }

  /**
   * Get API status
   */
  getStatus(): {
    initialized: boolean;
    endpoints: CorrelationAPIEndpoints;
    components: {
      correlationAnalyzer: string;
      signalClustering: string;
      pcaAnalyzer: string;
    };
  } {
    return {
      initialized: this.isInitialized,
      endpoints: this.endpoints,
      components: {
        correlationAnalyzer: this.correlationAnalyzer.getStatus(),
        signalClustering: this.signalClustering.getStatus(),
        pcaAnalyzer: this.pcaAnalyzer.getStatus()
      }
    };
  }

  /**
   * Handle HTTP-style requests
   */
  async handleRequest(method: string, path: string, body?: any): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Correlation API is not initialized');
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
    if (path === this.endpoints.analyzeCorrelations) return 'analyzeCorrelations';
    if (path === this.endpoints.getInsights) return 'getInsights';
    if (path === this.endpoints.updateAdaptiveWeights) return 'updateAdaptiveWeights';
    if (path === this.endpoints.getMetrics) return 'getMetrics';
    if (path === this.endpoints.getConfig) return 'getConfig';
    if (path === this.endpoints.updateConfig) return 'updateConfig';
    if (path === this.endpoints.getStatus) return 'getStatus';

    throw new Error(`Unknown route: ${path}`);
  }

  private async handlePost(route: string, body: any): Promise<any> {
    switch (route) {
      case 'analyzeCorrelations':
        return await this.analyzeCorrelations(body);

      case 'updateAdaptiveWeights':
        return await this.updateAdaptiveWeights();

      case 'updateConfig':
        this.updateConfig(body);
        return { success: true };

      default:
        throw new Error(`Unsupported POST route: ${route}`);
    }
  }

  private async handleGet(route: string, body: any): Promise<any> {
    switch (route) {
      case 'getInsights':
        return this.getCorrelationInsights();

      case 'getMetrics':
        return this.getMetrics();

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
  static createDefaultConfig(): CorrelationConfig {
    return {
      correlationMethods: ['pearson', 'spearman'],
      timeWindows: [60, 240, 1440], // 1h, 4h, 24h
      minDataPoints: 50,
      significanceLevel: 0.05,

      granger: {
        maxLagOrder: 10,
        minObservations: 30,
        significanceLevel: 0.05
      },

      clustering: {
        minClusterSize: 2,
        maxClusters: 10,
        convergenceThreshold: 0.6,
        stabilityWindow: 7 // days
      },

      pca: {
        varianceThreshold: 0.95,
        maxComponents: 10,
        standardization: true
      },

      updateInterval: 60, // minutes
      lookbackPeriod: 30, // days

      adaptiveWeighting: {
        enabled: true,
        learningRate: 0.1,
        decayFactor: 0.95
      }
    };
  }

  /**
   * Get API endpoints
   */
  getEndpoints(): CorrelationAPIEndpoints {
    return { ...this.endpoints };
  }
}
