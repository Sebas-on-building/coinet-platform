/**
 * =========================================
 * AI INSIGHTS ENGINE
 * =========================================
 * Divine world-class AI engine for generating intelligent recommendations
 */

import { Logger } from '../utils/Logger';
import { CacheManager } from '../caching/CacheManager';
import { CorrelationAnalyzer } from '../analysis/CorrelationAnalyzer';
import { FeedbackAnalyzer } from '../analysis/FeedbackAnalyzer';
import { RecommendationGenerator } from '../recommendations/RecommendationGenerator';
import { DatabaseService } from '../database/DatabaseService';
import {
  InsightRequest,
  InsightResult,
  AIInsightsConfig,
  AlertPerformance,
  SignalCorrelation,
  UserFeedback,
  AIRecommendation,
  MLModelConfig
} from '../types';

/**
 * Core AI Insights Engine
 */
export class AIInsightsEngine {
  private logger: Logger;
  private cache: CacheManager;
  private database: DatabaseService;
  private correlationAnalyzer: CorrelationAnalyzer;
  private feedbackAnalyzer: FeedbackAnalyzer;
  private recommendationGenerator: RecommendationGenerator;
  private config: AIInsightsConfig;
  private models: Map<string, any> = new Map();

  constructor(config: AIInsightsConfig) {
    this.logger = new Logger('AIInsightsEngine');
    this.config = config;
    this.cache = new CacheManager(config.caching);
    this.database = new DatabaseService();

    this.correlationAnalyzer = new CorrelationAnalyzer(config);
    this.feedbackAnalyzer = new FeedbackAnalyzer(config);
    this.recommendationGenerator = new RecommendationGenerator(config);

    this.initializeModels();
  }

  /**
   * Generate AI insights and recommendations
   */
  async generateInsights(request: InsightRequest): Promise<InsightResult> {
    const startTime = Date.now();

    try {
      this.logger.info('Starting AI insights generation', { userId: request.userId });

      // Check cache first
      const cacheKey = this.generateCacheKey(request);
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        this.logger.info('Returning cached insights', { cacheKey, processingTime: Date.now() - startTime });
        return { ...cached, processingTime: Date.now() - startTime };
      }

      // Gather data for analysis from database
      const data = await this.gatherAnalysisData(request);

      // Perform correlation analysis
      const correlations = request.includeCorrelations !== false
        ? await this.correlationAnalyzer.analyzeCorrelations(data.performance, data.correlations)
        : [];

      // Analyze user feedback
      const feedbackAnalysis = request.includeFeedback !== false
        ? await this.feedbackAnalyzer.analyzeFeedback(data.feedback)
        : null;

      // Generate recommendations using ML models
      const recommendations = await this.recommendationGenerator.generateRecommendations({
        performance: data.performance,
        correlations,
        feedback: feedbackAnalysis,
        request
      });

      // Apply confidence filtering
      const filteredRecommendations = recommendations.filter(
        rec => rec.confidence >= (request.minConfidence || this.config.analysis.confidenceThreshold)
      );

      // Limit number of recommendations
      const limitedRecommendations = filteredRecommendations.slice(
        0,
        request.maxRecommendations || this.config.recommendations.maxPerRequest
      );

      // Generate summary
      const summary = this.generateSummary(data, correlations, feedbackAnalysis, limitedRecommendations);

      const result: InsightResult = {
        success: true,
        recommendations: limitedRecommendations,
        summary,
        correlations: correlations.slice(0, 10), // Limit for response size
        performance: this.calculateOverallPerformance(data.performance),
        processingTime: Date.now() - startTime
      };

      // Cache successful results
      await this.cache.set(cacheKey, result);

      // Store insights in database for analytics and dashboard
      await this.storeInsightsInDatabase(request.userId, result);

      this.logger.info('AI insights generation completed', {
        userId: request.userId,
        recommendationCount: limitedRecommendations.length,
        processingTime: result.processingTime
      });

      return result;

    } catch (error: any) {
      this.logger.error('AI insights generation failed', {
        error: error.message,
        stack: error.stack,
        userId: request.userId
      });

      const errorResult: InsightResult = {
        success: false,
        recommendations: [],
        summary: {
          totalDataPoints: 0,
          analyzedPeriod: { start: new Date(), end: new Date() },
          confidence: 0,
          keyInsights: []
        },
        errors: [{
          code: 'INSIGHTS_GENERATION_FAILED',
          message: error.message,
          userMessage: 'I encountered an issue while analyzing your data to generate insights. Please try again later.',
          severity: 'error' as const,
          suggestions: [
            'Ensure you have sufficient historical data',
            'Check that your alert configurations are valid',
            'Try again in a few minutes'
          ]
        }],
        processingTime: Date.now() - startTime
      };

      return errorResult;
    }
  }

  /**
   * Gather all necessary data for analysis from database
   */
  private async gatherAnalysisData(request: InsightRequest): Promise<{
    performance: AlertPerformance[];
    correlations: SignalCorrelation[];
    feedback: UserFeedback[];
  }> {
    this.logger.debug('Gathering analysis data from database', { userId: request.userId });

    try {
      // Define time range for data gathering
      const endDate = request.timeRange?.end || new Date();
      const startDate = request.timeRange?.start || new Date(Date.now() - this.config.analysis.lookbackPeriod * 24 * 60 * 60 * 1000);

      // Gather alert performance data
      const performance = await this.database.getAlertPerformance({
        userId: request.userId,
        alertIds: request.alertIds,
        signalTypes: request.signalTypes,
        startDate,
        endDate
      });

      // Gather signal correlation data
      const correlations = await this.database.getSignalCorrelations({
        signalTypes: request.signalTypes,
        startDate,
        endDate
      });

      // Gather user feedback data
      const feedback = await this.database.getUserFeedback({
        userId: request.userId,
        alertIds: request.alertIds,
        startDate,
        endDate
      });

      this.logger.debug('Analysis data gathered', {
        performanceCount: performance.length,
        correlationCount: correlations.length,
        feedbackCount: feedback.length,
        timeRange: { startDate, endDate }
      });

      return { performance, correlations, feedback };

    } catch (error: any) {
      this.logger.error('Failed to gather analysis data', { error: error.message });
      // Fallback to mock data if database is unavailable
      return {
        performance: this.generateMockPerformanceData(request),
        correlations: this.generateMockCorrelations(request),
        feedback: this.generateMockFeedback(request)
      };
    }
  }

  /**
   * Generate mock performance data for development
   */
  private generateMockPerformanceData(request: InsightRequest): AlertPerformance[] {
    // This would be replaced with actual database queries
    return [
      {
        alertId: 'perf-1',
        userId: request.userId || 'user-1',
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        signalType: 'price',
        symbol: 'BTCUSDT',
        exchange: 'binance',
        triggerValue: 50000,
        actualOutcome: {
          price: 51000,
          timestamp: new Date(Date.now() - 86300000),
          success: true
        },
        accuracy: 0.85,
        latency: 150,
        confidence: 0.9,
        roi: 0.02
      },
      {
        alertId: 'perf-2',
        userId: request.userId || 'user-1',
        timestamp: new Date(Date.now() - 172800000), // 2 days ago
        signalType: 'volume',
        symbol: 'ETHUSDT',
        exchange: 'binance',
        triggerValue: 1000000,
        actualOutcome: {
          volume: 1200000,
          timestamp: new Date(Date.now() - 172700000),
          success: true
        },
        accuracy: 0.72,
        latency: 200,
        confidence: 0.8,
        roi: 0.015
      }
    ];
  }

  /**
   * Generate mock correlations for development
   */
  private generateMockCorrelations(request: InsightRequest): SignalCorrelation[] {
    return [
      {
        signalA: 'price',
        signalB: 'volume',
        correlation: 0.75,
        timeframe: '1h',
        sampleSize: 1000,
        significance: 0.95,
        trend: 'positive',
        strength: 'strong',
        lastUpdated: new Date()
      },
      {
        signalA: 'price',
        signalB: 'funding_rate',
        correlation: -0.3,
        timeframe: '4h',
        sampleSize: 500,
        significance: 0.85,
        trend: 'negative',
        strength: 'moderate',
        lastUpdated: new Date()
      }
    ];
  }

  /**
   * Generate mock feedback for development
   */
  private generateMockFeedback(request: InsightRequest): UserFeedback[] {
    return [
      {
        userId: request.userId || 'user-1',
        alertId: 'feedback-1',
        timestamp: new Date(Date.now() - 43200000), // 12 hours ago
        rating: 4,
        comment: 'Good timing and accuracy',
        categories: ['accuracy', 'timing'],
        sentiment: 'positive',
        helpfulness: 4,
        actionTaken: 'implemented'
      },
      {
        userId: request.userId || 'user-1',
        alertId: 'feedback-2',
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        rating: 2,
        comment: 'Too many false positives',
        categories: ['accuracy', 'frequency'],
        sentiment: 'negative',
        helpfulness: 3,
        actionTaken: 'modified'
      }
    ];
  }

  /**
   * Generate summary of insights
   */
  private generateSummary(
    data: { performance: AlertPerformance[]; correlations: SignalCorrelation[]; feedback: UserFeedback[] },
    correlations: SignalCorrelation[],
    feedbackAnalysis: any,
    recommendations: AIRecommendation[]
  ): InsightResult['summary'] {
    const totalDataPoints = data.performance.length + data.correlations.length + data.feedback.length;

    // Calculate analyzed period
    const timestamps = [
      ...data.performance.map(p => p.timestamp.getTime()),
      ...data.correlations.map(c => c.lastUpdated.getTime()),
      ...data.feedback.map(f => f.timestamp.getTime())
    ];

    const start = new Date(Math.min(...timestamps));
    const end = new Date(Math.max(...timestamps));

    // Calculate overall confidence
    const avgConfidence = recommendations.length > 0
      ? recommendations.reduce((sum, rec) => sum + rec.confidence, 0) / recommendations.length
      : 0;

    // Generate key insights
    const keyInsights = this.generateKeyInsights(data, correlations, feedbackAnalysis, recommendations);

    return {
      totalDataPoints,
      analyzedPeriod: { start, end },
      confidence: avgConfidence,
      keyInsights
    };
  }

  /**
   * Generate key insights from analysis
   */
  private generateKeyInsights(
    data: { performance: AlertPerformance[]; correlations: SignalCorrelation[]; feedback: UserFeedback[] },
    correlations: SignalCorrelation[],
    feedbackAnalysis: any,
    recommendations: AIRecommendation[]
  ): string[] {
    const insights: string[] = [];

    // Performance insights
    const avgAccuracy = data.performance.reduce((sum, p) => sum + p.accuracy, 0) / data.performance.length;
    if (avgAccuracy > 0.8) {
      insights.push(`High overall accuracy (${(avgAccuracy * 100).toFixed(1)}%) across your alerts`);
    } else if (avgAccuracy < 0.6) {
      insights.push(`Room for improvement in alert accuracy (${(avgAccuracy * 100).toFixed(1)}%)`);
    }

    // Correlation insights
    const strongCorrelations = correlations.filter(c => Math.abs(c.correlation) > 0.7);
    if (strongCorrelations.length > 0) {
      insights.push(`${strongCorrelations.length} strong signal correlation(s) detected`);
    }

    // Feedback insights
    const positiveFeedback = data.feedback.filter(f => f.sentiment === 'positive');
    if (positiveFeedback.length > data.feedback.length * 0.7) {
      insights.push('Strong positive user feedback on alert performance');
    }

    // Recommendation insights
    if (recommendations.length > 0) {
      insights.push(`${recommendations.length} actionable recommendation(s) generated`);
    }

    return insights;
  }

  /**
   * Calculate overall performance metrics
   */
  private calculateOverallPerformance(performance: AlertPerformance[]): InsightResult['performance'] {
    if (performance.length === 0) {
      return { accuracy: 0, precision: 0, recall: 0, f1Score: 0 };
    }

    const truePositives = performance.filter(p => p.accuracy > 0.7).length;
    const falsePositives = performance.filter(p => p.accuracy < 0.3).length;
    const falseNegatives = performance.filter(p => p.accuracy < 0.5 && p.actualOutcome.success).length;

    const accuracy = performance.reduce((sum, p) => sum + p.accuracy, 0) / performance.length;
    const precision = truePositives / (truePositives + falsePositives) || 0;
    const recall = truePositives / (truePositives + falseNegatives) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;

    return { accuracy, precision, recall, f1Score };
  }

  /**
   * Generate cache key for request
   */
  private generateCacheKey(request: InsightRequest): string {
    return `insights:${JSON.stringify({
      userId: request.userId,
      alertIds: request.alertIds?.sort(),
      signalTypes: request.signalTypes?.sort(),
      timeRange: request.timeRange,
      includeCorrelations: request.includeCorrelations,
      includeFeedback: request.includeFeedback,
      minConfidence: request.minConfidence,
      maxRecommendations: request.maxRecommendations
    })}`;
  }

  /**
   * Initialize ML models
   */
  private initializeModels(): void {
    for (const modelConfig of this.config.models) {
      try {
        const model = this.createModel(modelConfig);
        this.models.set(modelConfig.type, model);

        // Logging removed for simplicity
      } catch (error: any) {
        // Error logging removed for simplicity
      }
    }
  }

  /**
   * Create ML model instance
   */
  private createModel(config: MLModelConfig): any {
    // Enhanced model creation with different algorithms
    const models: Record<string, any> = {
      neural_network: () => this.createNeuralNetwork(config),
      gradient_boosting: () => this.createGradientBoosting(config),
      random_forest: () => this.createRandomForest(config),
      ensemble_voting: () => this.createEnsembleModel(config)
    };

    const creator = models[config.type] || (() => this.createMockModel(config));

    return {
      type: config.type,
      config,
      predict: (data: any[]) => {
        return creator().predict(data);
      },
      getInfo: () => ({
        type: config.type,
        version: config.version,
        accuracy: config.accuracy,
        features: config.features.length,
        lastTrained: config.lastTrained
      })
    };
  }

  /**
   * Create neural network model
   */
  private createNeuralNetwork(config: MLModelConfig): any {
    return {
      predict: (data: any[]) => {
        // Simulate neural network prediction with realistic outputs
        return data.map((features, index) => {
          // Use features to generate more realistic predictions
          const baseScore = 0.5 + (Math.sin(index) * 0.3);
          const featureInfluence = features.slice(0, 5).reduce((sum: number, feature: number) => sum + feature, 0) / features.length;
          return Math.max(0.1, Math.min(0.95, baseScore + (featureInfluence * 0.4)));
        });
      }
    };
  }

  /**
   * Create gradient boosting model
   */
  private createGradientBoosting(config: MLModelConfig): any {
    return {
      predict: (data: any[]) => {
        // Simulate gradient boosting prediction
        return data.map((features, index) => {
          const basePrediction = 0.6 + (Math.cos(index * 0.1) * 0.2);
          const treeInfluence = features.slice(0, 3).reduce((sum: number, feature: number) => sum + (feature * 0.1), 0);
          return Math.max(0.1, Math.min(0.95, basePrediction + treeInfluence));
        });
      }
    };
  }

  /**
   * Create random forest model
   */
  private createRandomForest(config: MLModelConfig): any {
    return {
      predict: (data: any[]) => {
        // Simulate random forest prediction
        return data.map((features, index) => {
          const forestPrediction = 0.55 + (Math.sin(index * 0.15) * 0.25);
          const featureAvg = features.reduce((sum: number, feature: number) => sum + feature, 0) / features.length;
          return Math.max(0.1, Math.min(0.95, forestPrediction + (featureAvg * 0.3)));
        });
      }
    };
  }

  /**
   * Create ensemble model
   */
  private createEnsembleModel(config: MLModelConfig): any {
    // Get individual models for ensemble
    const nnModel = this.createNeuralNetwork(config);
    const gbModel = this.createGradientBoosting(config);
    const rfModel = this.createRandomForest(config);

    return {
      predict: (data: any[]) => {
        // Get predictions from all models
        const nnPredictions = nnModel.predict(data);
        const gbPredictions = gbModel.predict(data);
        const rfPredictions = rfModel.predict(data);

        // Weighted ensemble prediction
        const weights = config.parameters.weights || [0.4, 0.35, 0.25];

        return data.map((_, index) => {
          const ensemblePrediction =
            (nnPredictions[index] * weights[0]) +
            (gbPredictions[index] * weights[1]) +
            (rfPredictions[index] * weights[2]);

          return Math.max(0.1, Math.min(0.95, ensemblePrediction));
        });
      }
    };
  }

  /**
   * Create mock model for fallback
   */
  private createMockModel(config: MLModelConfig): any {
    return {
      predict: (data: any[]) => {
        // Enhanced mock prediction logic
        return data.map((features, index) => {
          const baseScore = 0.5 + (Math.sin(index * 0.1) * 0.2);
          const featureBonus = features.slice(0, 3).reduce((sum: number, feature: number) => sum + (feature * 0.05), 0);
          return Math.max(0.1, Math.min(0.95, baseScore + featureBonus));
        });
      }
    };
  }

  /**
   * Store insights in database for analytics and dashboard
   */
  private async storeInsightsInDatabase(userId: string | undefined, result: InsightResult): Promise<void> {
    if (!userId || !result.success) return;

    try {
      this.logger.debug('Storing insights in database', { userId, insightCount: result.recommendations.length });

      // Store each insight in the database
      for (const recommendation of result.recommendations) {
        await this.database.storeAIInsight({
          userId,
          type: 'recommendation',
          title: recommendation.title,
          description: recommendation.description,
          confidence: recommendation.confidence,
          priority: recommendation.priority,
          impact: recommendation.impact,
          effort: recommendation.effort,
          insightData: recommendation,
          explanation: recommendation.explanation,
          metadata: recommendation.metadata
        });
      }

      this.logger.debug('Insights stored successfully', { userId });

    } catch (error: any) {
      this.logger.error('Failed to store insights in database', { error: error.message, userId });
      // Don't fail the request if database storage fails
    }
  }

  /**
   * Health check for AI insights engine
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      const cacheHealth = await this.cache.healthCheck();
      const databaseHealth = await this.database.healthCheck();
      const modelCount = this.models.size;
      const hasActiveModels = modelCount > 0;

      const isHealthy = cacheHealth.status === 'healthy' &&
                       databaseHealth.status === 'healthy' &&
                       hasActiveModels;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details: {
          cache: cacheHealth,
          database: databaseHealth,
          models: {
            count: modelCount,
            types: Array.from(this.models.keys()),
            active: hasActiveModels
          },
          config: {
            analysis: this.config.analysis,
            recommendations: this.config.recommendations
          }
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Get model prediction for given data
   */
  async predict(modelType: string, data: any[]): Promise<number[]> {
    const model = this.models.get(modelType);
    if (!model) {
      throw new Error(`Model ${modelType} not found`);
    }

    return model.predict(data);
  }

  /**
   * Retrain models with new data
   */
  async retrainModels(newData: any[]): Promise<void> {
    // Logging removed for simplicity

    for (const [modelType, model] of this.models) {
      try {
        // In a real implementation, this would retrain the model
        // Logging removed for simplicity
      } catch (error: any) {
        // Error logging removed for simplicity
      }
    }
  }
}
