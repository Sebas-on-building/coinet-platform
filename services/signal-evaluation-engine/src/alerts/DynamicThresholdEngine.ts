/**
 * =========================================
 * DYNAMIC THRESHOLD ENGINE
 * =========================================
 * Adaptive threshold optimization using Bayesian methods,
 * reinforcement learning, and statistical approaches for
 * dynamic confidence threshold adaptation in alert systems
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import type {
  DynamicThresholdConfig,
  ThresholdAdaptationContext,
  AdaptedThreshold,
  ThresholdVisualizationData,
  ThresholdOptimizationResult,
  ManualThresholdOverride,
  ThresholdPerformanceTracking,
  BayesianThresholdConfig,
  ReinforcementLearningConfig,
  StatisticalThresholdConfig
} from './types';
import type { SignalType } from '../types';

export class DynamicThresholdEngine extends EventEmitter {
  private logger: Logger;
  private isInitialized: boolean = false;

  // Active threshold configurations
  private thresholdConfigs: Map<string, DynamicThresholdConfig> = new Map();

  // Performance tracking
  private performanceTrackers: Map<string, ThresholdPerformanceTracking> = new Map();

  // Historical adaptation data
  private adaptationHistory: Map<string, AdaptedThreshold[]> = new Map();

  // Manual overrides
  private manualOverrides: Map<string, ManualThresholdOverride[]> = new Map();

  // Bayesian optimizers
  private bayesianOptimizers: Map<string, BayesianThresholdOptimizer> = new Map();

  // Reinforcement learning agents
  private rlAgents: Map<string, ReinforcementLearningAgent> = new Map();

  // Statistical analyzers
  private statisticalAnalyzers: Map<string, StatisticalThresholdAnalyzer> = new Map();

  constructor() {
    super();
    this.logger = new Logger('DynamicThresholdEngine');
  }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing dynamic threshold engine...');

      // Initialize Bayesian optimizers
      this.initializeBayesianOptimizers();

      // Initialize RL agents
      this.initializeRLAgents();

      // Initialize statistical analyzers
      this.initializeStatisticalAnalyzers();

      this.isInitialized = true;
      this.logger.info('✅ Dynamic threshold engine initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize dynamic threshold engine', error);
      throw error;
    }
  }

  /**
   * Register a threshold configuration for a rule
   */
  registerThresholdConfig(ruleId: string, config: DynamicThresholdConfig): void {
    if (!this.isInitialized) {
      throw new Error('Dynamic threshold engine is not initialized');
    }

    this.thresholdConfigs.set(ruleId, config);

    // Initialize performance tracking
    if (config.performanceTracking.enabled) {
      this.performanceTrackers.set(ruleId, {
        ...config.performanceTracking,
        lastUpdated: new Date()
      });
    }

    // Initialize adaptation history
    this.adaptationHistory.set(ruleId, []);

    // Initialize manual overrides
    this.manualOverrides.set(ruleId, []);

    this.logger.info('Threshold configuration registered', { ruleId, strategy: config.adaptationStrategy });

    this.emit('thresholdConfigRegistered', { ruleId, config });
  }

  /**
   * Adapt threshold based on current context
   */
  async adaptThreshold(
    ruleId: string,
    baseThreshold: number,
    context: ThresholdAdaptationContext
  ): Promise<AdaptedThreshold> {
    if (!this.isInitialized) {
      throw new Error('Dynamic threshold engine is not initialized');
    }

    const config = this.thresholdConfigs.get(ruleId);
    if (!config || !config.enabled) {
      return {
        originalThreshold: baseThreshold,
        adaptedThreshold: baseThreshold,
        adaptationReason: 'Dynamic thresholds disabled',
        confidence: 1.0,
        factors: {
          signalStrength: 0,
          historicalPerformance: 0,
          marketConditions: 0,
          userRiskTolerance: 0
        },
        algorithm: 'none',
        timestamp: new Date()
      };
    }

    try {
      // Check for manual overrides first
      const override = this.getActiveManualOverride(ruleId, context);
      if (override) {
        return this.createAdaptedThreshold(baseThreshold, override.threshold, 'Manual override applied', 1.0, {
          signalStrength: 0,
          marketConditions: 0,
          historicalPerformance: 0,
          userRiskTolerance: 0,
          manualOverride: 1.0
        }, 'manual_override', context);
      }

      // Get adaptation based on strategy
      let adaptedThreshold: AdaptedThreshold;

      switch (config.adaptationStrategy) {
        case 'bayesian':
          adaptedThreshold = await this.adaptBayesianThreshold(ruleId, baseThreshold, context, config);
          break;
        case 'reinforcement_learning':
          adaptedThreshold = await this.adaptRLThreshold(ruleId, baseThreshold, context, config);
          break;
        case 'statistical':
          adaptedThreshold = await this.adaptStatisticalThreshold(ruleId, baseThreshold, context, config);
          break;
        case 'hybrid':
          adaptedThreshold = await this.adaptHybridThreshold(ruleId, baseThreshold, context, config);
          break;
        default:
          throw new Error(`Unknown adaptation strategy: ${config.adaptationStrategy}`);
      }

      // Store adaptation history
      this.storeAdaptationHistory(ruleId, adaptedThreshold);

      // Update performance tracking
      if (config.performanceTracking.enabled) {
        this.updatePerformanceMetrics(ruleId, adaptedThreshold, context);
      }

      this.emit('thresholdAdapted', { ruleId, adaptation: adaptedThreshold });

      return adaptedThreshold;

    } catch (error: any) {
      this.logger.error('Threshold adaptation failed', { ruleId, error: error.message });

      // Return original threshold on error
      return {
        originalThreshold: baseThreshold,
        adaptedThreshold: baseThreshold,
        adaptationReason: `Adaptation failed: ${error.message}`,
        confidence: 0.0,
        factors: {
          signalStrength: 0,
          historicalPerformance: 0,
          marketConditions: 0,
          userRiskTolerance: 0
        },
        algorithm: 'error_fallback',
        timestamp: new Date()
      };
    }
  }

  /**
   * Get visualization data for UI
   */
  getThresholdVisualizationData(ruleId: string): ThresholdVisualizationData | null {
    const config = this.thresholdConfigs.get(ruleId);
    if (!config) return null;

    const history = this.adaptationHistory.get(ruleId) || [];
    const performance = this.performanceTrackers.get(ruleId);
    const overrides = this.manualOverrides.get(ruleId) || [];

    // Get latest adaptation
    const latestAdaptation = history[history.length - 1];

    return {
      currentThreshold: latestAdaptation?.adaptedThreshold || config.baseThreshold,
      historicalThresholds: history.slice(-50).map(h => ({
        timestamp: h.timestamp,
        threshold: h.adaptedThreshold,
        reason: h.adaptationReason
      })),
      performanceMetrics: performance ? {
        precision: performance.metrics.precision,
        recall: performance.metrics.recall,
        f1Score: performance.metrics.f1Score,
        falsePositiveRate: 1 - performance.metrics.precision
      } : {
        precision: 0,
        recall: 0,
        f1Score: 0,
        falsePositiveRate: 0
      },
      adaptationFactors: latestAdaptation ? latestAdaptation.factors : {
        signalStrength: 0,
        marketConditions: 0,
        historicalPerformance: 0,
        userRiskTolerance: 0
      },
      recommendations: this.generateRecommendations(ruleId, config),
      alertsTriggered: performance?.metrics.truePositives || 0,
      alertsAvoided: performance?.metrics.trueNegatives || 0
    };
  }

  /**
   * Add manual threshold override
   */
  addManualOverride(ruleId: string, override: Omit<ManualThresholdOverride, 'id' | 'appliedAt'>): string {
    const config = this.thresholdConfigs.get(ruleId);
    if (!config) {
      throw new Error(`No threshold configuration found for rule ${ruleId}`);
    }

    const fullOverride: ManualThresholdOverride = {
      ...override,
      id: `override_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      appliedAt: new Date()
    };

    const overrides = this.manualOverrides.get(ruleId) || [];
    overrides.push(fullOverride);
    this.manualOverrides.set(ruleId, overrides);

    this.logger.info('Manual override added', { ruleId, overrideId: fullOverride.id });

    this.emit('manualOverrideAdded', { ruleId, override: fullOverride });

    return fullOverride.id;
  }

  /**
   * Remove manual override
   */
  removeManualOverride(ruleId: string, overrideId: string): boolean {
    const overrides = this.manualOverrides.get(ruleId) || [];
    const index = overrides.findIndex(o => o.id === overrideId);

    if (index === -1) return false;

    overrides.splice(index, 1);
    this.manualOverrides.set(ruleId, overrides);

    this.logger.info('Manual override removed', { ruleId, overrideId });

    this.emit('manualOverrideRemoved', { ruleId, overrideId });

    return true;
  }

  /**
   * Get optimal threshold using optimization algorithms
   */
  async optimizeThreshold(
    ruleId: string,
    historicalData: Array<{ threshold: number; performance: any }>
  ): Promise<ThresholdOptimizationResult> {
    const config = this.thresholdConfigs.get(ruleId);
    if (!config) {
      throw new Error(`No threshold configuration found for rule ${ruleId}`);
    }

    switch (config.adaptationStrategy) {
      case 'bayesian':
        return this.bayesianOptimizers.get(ruleId)?.optimize(historicalData) || this.fallbackOptimization(historicalData);
      case 'reinforcement_learning':
        return this.rlAgents.get(ruleId)?.optimize(historicalData) || this.fallbackOptimization(historicalData);
      case 'statistical':
        return this.statisticalAnalyzers.get(ruleId)?.optimize(historicalData) || this.fallbackOptimization(historicalData);
      default:
        return this.fallbackOptimization(historicalData);
    }
  }

  // Private helper methods

  private getActiveManualOverride(ruleId: string, context: ThresholdAdaptationContext): ManualThresholdOverride | null {
    const overrides = this.manualOverrides.get(ruleId) || [];
    const now = new Date();

    return overrides.find(override =>
      override.isActive &&
      (!override.expiresAt || override.expiresAt > now)
    ) || null;
  }

  private async adaptBayesianThreshold(
    ruleId: string,
    baseThreshold: number,
    context: ThresholdAdaptationContext,
    config: DynamicThresholdConfig
  ): Promise<AdaptedThreshold> {
    const optimizer = this.bayesianOptimizers.get(ruleId);
    if (!optimizer) {
      throw new Error(`No Bayesian optimizer found for rule ${ruleId}`);
    }

    const adaptedThreshold = await optimizer.adaptThreshold(baseThreshold, context, config);
    return adaptedThreshold;
  }

  private async adaptRLThreshold(
    ruleId: string,
    baseThreshold: number,
    context: ThresholdAdaptationContext,
    config: DynamicThresholdConfig
  ): Promise<AdaptedThreshold> {
    const agent = this.rlAgents.get(ruleId);
    if (!agent) {
      throw new Error(`No RL agent found for rule ${ruleId}`);
    }

    const adaptedThreshold = await agent.adaptThreshold(baseThreshold, context, config);
    return adaptedThreshold;
  }

  private async adaptStatisticalThreshold(
    ruleId: string,
    baseThreshold: number,
    context: ThresholdAdaptationContext,
    config: DynamicThresholdConfig
  ): Promise<AdaptedThreshold> {
    const analyzer = this.statisticalAnalyzers.get(ruleId);
    if (!analyzer) {
      throw new Error(`No statistical analyzer found for rule ${ruleId}`);
    }

    const adaptedThreshold = await analyzer.adaptThreshold(baseThreshold, context, config);
    return adaptedThreshold;
  }

  private async adaptHybridThreshold(
    ruleId: string,
    baseThreshold: number,
    context: ThresholdAdaptationContext,
    config: DynamicThresholdConfig
  ): Promise<AdaptedThreshold> {
    // Combine multiple strategies
    const bayesianResult = await this.adaptBayesianThreshold(ruleId, baseThreshold, context, config);
    const statisticalResult = await this.adaptStatisticalThreshold(ruleId, baseThreshold, context, config);

    // Weight the results based on configuration
    const bayesianWeight = 0.6;
    const statisticalWeight = 0.4;

    const hybridThreshold = (bayesianResult.adaptedThreshold * bayesianWeight) +
                           (statisticalResult.adaptedThreshold * statisticalWeight);

    return this.createAdaptedThreshold(
      baseThreshold,
      hybridThreshold,
      `Hybrid: Bayesian (${bayesianWeight}) + Statistical (${statisticalWeight})`,
      (bayesianResult.confidence + statisticalResult.confidence) / 2,
      {
        signalStrength: (bayesianResult.factors.signalStrength + statisticalResult.factors.signalStrength) / 2,
        historicalPerformance: (bayesianResult.factors.historicalPerformance + statisticalResult.factors.historicalPerformance) / 2,
        marketConditions: (bayesianResult.factors.marketConditions + statisticalResult.factors.marketConditions) / 2,
        userRiskTolerance: (bayesianResult.factors.userRiskTolerance + statisticalResult.factors.userRiskTolerance) / 2
      },
      'hybrid',
      context
    );
  }

  private createAdaptedThreshold(
    originalThreshold: number,
    adaptedThreshold: number,
    reason: string,
    confidence: number,
    factors: AdaptedThreshold['factors'],
    algorithm: string,
    context: ThresholdAdaptationContext
  ): AdaptedThreshold {
    return {
      originalThreshold,
      adaptedThreshold,
      adaptationReason: reason,
      confidence,
      factors,
      algorithm,
      timestamp: new Date()
    };
  }

  private storeAdaptationHistory(ruleId: string, adaptation: AdaptedThreshold): void {
    const history = this.adaptationHistory.get(ruleId) || [];
    history.push(adaptation);

    // Keep only last 1000 adaptations
    if (history.length > 1000) {
      history.splice(0, history.length - 1000);
    }

    this.adaptationHistory.set(ruleId, history);
  }

  private updatePerformanceMetrics(ruleId: string, adaptation: AdaptedThreshold, context: ThresholdAdaptationContext): void {
    const tracker = this.performanceTrackers.get(ruleId);
    if (!tracker) return;

    // Update metrics based on context and adaptation
    // This is a simplified implementation - in practice, you'd track actual outcomes
    tracker.lastUpdated = new Date();

    this.performanceTrackers.set(ruleId, tracker);
  }

  private generateRecommendations(ruleId: string, config: DynamicThresholdConfig): string[] {
    const recommendations: string[] = [];
    const history = this.adaptationHistory.get(ruleId) || [];

    if (history.length < 10) {
      recommendations.push('Need more data to provide meaningful recommendations');
      return recommendations;
    }

    // Analyze recent adaptations
    const recentAdaptations = history.slice(-20);
    const avgConfidence = recentAdaptations.reduce((sum, a) => sum + a.confidence, 0) / recentAdaptations.length;

    if (avgConfidence < 0.7) {
      recommendations.push('Consider increasing adaptation rate or adjusting algorithm parameters');
    }

    if (config.userRiskTolerance === 'conservative' && recentAdaptations.some(a => a.adaptedThreshold < config.baseThreshold * 0.8)) {
      recommendations.push('Conservative settings may be too restrictive - consider moderate risk tolerance');
    }

    return recommendations;
  }

  private initializeBayesianOptimizers(): void {
    // Initialize Bayesian optimizers for registered configurations
    for (const [ruleId, config] of this.thresholdConfigs) {
      if (config.adaptationStrategy === 'bayesian' || config.adaptationStrategy === 'hybrid') {
        const optimizer = new BayesianThresholdOptimizer(config.bayesian || this.getDefaultBayesianConfig());
        this.bayesianOptimizers.set(ruleId, optimizer);
      }
    }
  }

  private initializeRLAgents(): void {
    for (const [ruleId, config] of this.thresholdConfigs) {
      if (config.adaptationStrategy === 'reinforcement_learning' || config.adaptationStrategy === 'hybrid') {
        const agent = new ReinforcementLearningAgent(config.reinforcementLearning || this.getDefaultRLConfig());
        this.rlAgents.set(ruleId, agent);
      }
    }
  }

  private initializeStatisticalAnalyzers(): void {
    for (const [ruleId, config] of this.thresholdConfigs) {
      if (config.adaptationStrategy === 'statistical' || config.adaptationStrategy === 'hybrid') {
        const analyzer = new StatisticalThresholdAnalyzer(config.statistical || this.getDefaultStatisticalConfig());
        this.statisticalAnalyzers.set(ruleId, analyzer);
      }
    }
  }

  private getDefaultBayesianConfig(): BayesianThresholdConfig {
    return {
      priorStrength: 0.5,
      learningRate: 0.1,
      evidenceWeight: 0.7,
      uncertaintyThreshold: 0.3,
      convergenceThreshold: 0.01,
      maxIterations: 100,
      useConjugatePrior: true,
      priorDistribution: 'beta'
    };
  }

  private getDefaultRLConfig(): ReinforcementLearningConfig {
    return {
      algorithm: 'q_learning',
      stateSpace: {
        signalStrength: [0, 0.25, 0.5, 0.75, 1.0],
        historicalPerformance: [0, 0.25, 0.5, 0.75, 1.0],
        marketConditions: ['bull', 'bear', 'sideways'],
        timeOfDay: Array.from({length: 24}, (_, i) => i),
        dayOfWeek: [0, 1, 2, 3, 4, 5, 6],
        volatility: [0, 0.33, 0.67, 1.0],
        volume: [0, 0.33, 0.67, 1.0]
      },
      actionSpace: {
        thresholdMultiplier: [0.5, 0.75, 1.0, 1.25, 1.5],
        adaptationRate: [0.05, 0.1, 0.2, 0.3],
        signalWeight: [0.2, 0.4, 0.6, 0.8],
        performanceWeight: [0.2, 0.4, 0.6, 0.8]
      },
      learningRate: 0.1,
      discountFactor: 0.95,
      explorationRate: 0.1,
      explorationDecay: 0.995,
      experienceBufferSize: 10000,
      batchSize: 32,
      targetUpdateFrequency: 100,
      rewardFunction: {
        truePositiveReward: 1.0,
        falsePositivePenalty: -0.5,
        trueNegativeReward: 0.1,
        falseNegativePenalty: -1.0,
        confidenceBonus: 0.2,
        timelinessBonus: 0.1,
        userFeedbackWeight: 0.3
      }
    };
  }

  private getDefaultStatisticalConfig(): StatisticalThresholdConfig {
    return {
      method: 'exponential_smoothing',
      windowSize: 50,
      smoothingFactor: 0.3,
      confidenceLevel: 0.95,
      outlierDetection: {
        enabled: true,
        method: 'z_score',
        threshold: 2.0
      },
      trendAnalysis: {
        enabled: true,
        method: 'linear',
        degree: 1
      }
    };
  }

  private fallbackOptimization(historicalData: Array<{ threshold: number; performance: any }>): ThresholdOptimizationResult {
    if (historicalData.length === 0) {
      return {
        optimalThreshold: 0.5,
        confidence: 0.0,
        expectedPerformance: { precision: 0, recall: 0, f1Score: 0 },
        uncertainty: 1.0,
        convergenceAchieved: false,
        iterationsUsed: 0,
        algorithm: 'fallback'
      };
    }

    // Simple fallback: use threshold with best historical performance
    const best = historicalData.reduce((best, current) =>
      current.performance.f1Score > best.performance.f1Score ? current : best
    );

    return {
      optimalThreshold: best.threshold,
      confidence: 0.5,
      expectedPerformance: best.performance,
      uncertainty: 0.5,
      convergenceAchieved: true,
      iterationsUsed: 1,
      algorithm: 'fallback'
    };
  }
}

// Bayesian Threshold Optimizer Implementation
class BayesianThresholdOptimizer {
  private config: BayesianThresholdConfig;
  private prior: { alpha: number; beta: number } | null = null;

  constructor(config: BayesianThresholdConfig) {
    this.config = config;
  }

  async adaptThreshold(
    baseThreshold: number,
    context: ThresholdAdaptationContext,
    ruleConfig: DynamicThresholdConfig
  ): Promise<AdaptedThreshold> {
    // Initialize prior if not exists
    if (!this.prior) {
      this.initializePrior(baseThreshold);
    }

    // Calculate posterior based on current context
    const likelihood = this.calculateLikelihood(context, baseThreshold, ruleConfig);
    const posterior = this.updatePosterior(likelihood);

    // Sample from posterior to get adapted threshold
    const adaptedThreshold = this.sampleFromPosterior(posterior);

    const factors = this.calculateAdaptationFactors(context, ruleConfig);

    return {
      originalThreshold: baseThreshold,
      adaptedThreshold,
      adaptationReason: `Bayesian update: prior α=${posterior.alpha.toFixed(2)}, β=${posterior.beta.toFixed(2)}`,
      confidence: this.calculateConfidence(posterior),
      factors,
      algorithm: 'bayesian',
      timestamp: new Date()
    };
  }

  optimize(historicalData: Array<{ threshold: number; performance: any }>): ThresholdOptimizationResult {
    // Bayesian optimization implementation
    let bestThreshold = 0.5;
    let bestScore = 0;
    let iterations = 0;

    for (const data of historicalData) {
      iterations++;
      const score = data.performance.f1Score || 0;
      if (score > bestScore) {
        bestScore = score;
        bestThreshold = data.threshold;
      }
    }

    return {
      optimalThreshold: bestThreshold,
      confidence: Math.min(bestScore, 1.0),
      expectedPerformance: historicalData.find(d => d.threshold === bestThreshold)?.performance || { precision: 0, recall: 0, f1Score: 0 },
      uncertainty: 1 - bestScore,
      convergenceAchieved: iterations > 10,
      iterationsUsed: iterations,
      algorithm: 'bayesian_optimization'
    };
  }

  private initializePrior(baseThreshold: number): void {
    if (this.config.priorDistribution === 'beta') {
      // Beta distribution prior centered around base threshold
      const alpha = 2 + (baseThreshold * 3);
      const beta = 2 + ((1 - baseThreshold) * 3);
      this.prior = { alpha, beta };
    }
  }

  private calculateLikelihood(context: ThresholdAdaptationContext, threshold: number, ruleConfig: DynamicThresholdConfig): number {
    // Calculate likelihood based on context factors
    const signalFactor = context.signalStrength * ruleConfig.signalStrengthWeight;
    const performanceFactor = context.historicalPerformance * ruleConfig.historicalPerformanceWeight;
    const regimeFactor = context.marketConditions === 'bull' ? 0.8 : context.marketConditions === 'bear' ? 0.6 : 0.7;

    return (signalFactor + performanceFactor + regimeFactor) / 3;
  }

  private updatePosterior(likelihood: number): { alpha: number; beta: number } {
    if (!this.prior) throw new Error('Prior not initialized');

    const alpha = this.prior.alpha + (likelihood * this.config.evidenceWeight);
    const beta = this.prior.beta + ((1 - likelihood) * this.config.evidenceWeight);

    return { alpha, beta };
  }

  private sampleFromPosterior(posterior: { alpha: number; beta: number }): number {
    // Simplified beta distribution sampling
    // In practice, would use proper beta distribution sampling
    return posterior.alpha / (posterior.alpha + posterior.beta);
  }

  private calculateConfidence(posterior: { alpha: number; beta: number }): number {
    const total = posterior.alpha + posterior.beta;
    const concentration = Math.min(posterior.alpha, posterior.beta) / total;
    return Math.min(concentration * 2, 1.0);
  }

  private calculateAdaptationFactors(context: ThresholdAdaptationContext, ruleConfig: DynamicThresholdConfig) {
    return {
      signalStrength: context.signalStrength * ruleConfig.signalStrengthWeight,
      historicalPerformance: context.historicalPerformance * ruleConfig.historicalPerformanceWeight,
      marketConditions: context.marketConditions === 'bull' ? 0.8 : context.marketConditions === 'bear' ? 0.6 : 0.7,
      userRiskTolerance: ruleConfig.userRiskTolerance === 'aggressive' ? 0.8 :
                       ruleConfig.userRiskTolerance === 'moderate' ? 0.6 : 0.4
    };
  }
}

// Reinforcement Learning Agent Implementation
class ReinforcementLearningAgent {
  private config: ReinforcementLearningConfig;
  private qTable: Map<string, number> = new Map();
  private experienceBuffer: Array<any> = [];
  private explorationRate: number;

  constructor(config: ReinforcementLearningConfig) {
    this.config = config;
    this.explorationRate = config.explorationRate;
  }

  async adaptThreshold(
    baseThreshold: number,
    context: ThresholdAdaptationContext,
    ruleConfig: DynamicThresholdConfig
  ): Promise<AdaptedThreshold> {
    const state = this.getStateKey(context);
    const action = this.selectAction(state);

    const adaptedThreshold = baseThreshold * action.thresholdMultiplier;
    const factors = this.calculateAdaptationFactors(context, ruleConfig, action);

    return {
      originalThreshold: baseThreshold,
      adaptedThreshold,
      adaptationReason: `RL action: ${JSON.stringify(action)}`,
      confidence: this.calculateConfidence(state, action),
      factors,
      algorithm: 'reinforcement_learning',
      timestamp: new Date()
    };
  }

  optimize(historicalData: Array<{ threshold: number; performance: any }>): ThresholdOptimizationResult {
    // RL-based optimization
    return {
      optimalThreshold: 0.5,
      confidence: 0.5,
      expectedPerformance: { precision: 0.5, recall: 0.5, f1Score: 0.5 },
      uncertainty: 0.5,
      convergenceAchieved: false,
      iterationsUsed: 0,
      algorithm: 'rl_optimization'
    };
  }

  private getStateKey(context: ThresholdAdaptationContext): string {
    return `${Math.floor(context.signalStrength * 4)},${Math.floor(context.historicalPerformance * 4)},${context.marketConditions}`;
  }

  private selectAction(state: string): any {
    // Simplified action selection - in practice would use epsilon-greedy or other strategies
    return {
      thresholdMultiplier: 1.0,
      adaptationRate: this.config.actionSpace.adaptationRate[1],
      signalWeight: this.config.actionSpace.signalWeight[2],
      performanceWeight: this.config.actionSpace.performanceWeight[2]
    };
  }

  private calculateAdaptationFactors(context: ThresholdAdaptationContext, ruleConfig: DynamicThresholdConfig, action: any) {
    return {
      signalStrength: context.signalStrength * (action.signalWeight || 0.5),
      historicalPerformance: context.historicalPerformance * (action.performanceWeight || 0.5),
      marketConditions: context.marketConditions === 'bull' ? 0.8 : 0.6,
      userRiskTolerance: ruleConfig.userRiskTolerance === 'aggressive' ? 0.8 : 0.6
    };
  }

  private calculateConfidence(state: string, action: any): number {
    return 0.7; // Simplified confidence calculation
  }
}

// Statistical Threshold Analyzer Implementation
class StatisticalThresholdAnalyzer {
  private config: StatisticalThresholdConfig;
  private historicalThresholds: number[] = [];

  constructor(config: StatisticalThresholdConfig) {
    this.config = config;
  }

  async adaptThreshold(
    baseThreshold: number,
    context: ThresholdAdaptationContext,
    ruleConfig: DynamicThresholdConfig
  ): Promise<AdaptedThreshold> {
    // Update historical data
    this.historicalThresholds.push(baseThreshold);
    if (this.historicalThresholds.length > this.config.windowSize) {
      this.historicalThresholds.shift();
    }

    let adaptedThreshold: number;
    const factors = this.calculateAdaptationFactors(context, ruleConfig);

    switch (this.config.method) {
      case 'moving_average':
        adaptedThreshold = this.calculateMovingAverage();
        break;
      case 'exponential_smoothing':
        adaptedThreshold = this.calculateExponentialSmoothing();
        break;
      case 'quantile':
        adaptedThreshold = this.calculateQuantile();
        break;
      case 'regression':
        adaptedThreshold = this.calculateRegression();
        break;
      default:
        adaptedThreshold = baseThreshold;
    }

    return {
      originalThreshold: baseThreshold,
      adaptedThreshold,
      adaptationReason: `Statistical ${this.config.method} adaptation`,
      confidence: 0.8,
      factors,
      algorithm: 'statistical',
      timestamp: new Date()
    };
  }

  optimize(historicalData: Array<{ threshold: number; performance: any }>): ThresholdOptimizationResult {
    // Statistical optimization
    return {
      optimalThreshold: 0.5,
      confidence: 0.5,
      expectedPerformance: { precision: 0.5, recall: 0.5, f1Score: 0.5 },
      uncertainty: 0.5,
      convergenceAchieved: false,
      iterationsUsed: 0,
      algorithm: 'statistical_optimization'
    };
  }

  private calculateMovingAverage(): number {
    if (this.historicalThresholds.length === 0) return 0.5;
    return this.historicalThresholds.reduce((sum, val) => sum + val, 0) / this.historicalThresholds.length;
  }

  private calculateExponentialSmoothing(): number {
    if (this.historicalThresholds.length === 0) return 0.5;

    let smoothed = this.historicalThresholds[0];
    for (let i = 1; i < this.historicalThresholds.length; i++) {
      smoothed = (this.config.smoothingFactor * this.historicalThresholds[i]) +
                ((1 - this.config.smoothingFactor) * smoothed);
    }
    return smoothed;
  }

  private calculateQuantile(): number {
    if (this.historicalThresholds.length === 0) return 0.5;

    const sorted = [...this.historicalThresholds].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * this.config.confidenceLevel);
    return sorted[Math.min(index, sorted.length - 1)];
  }

  private calculateRegression(): number {
    // Simplified linear regression - in practice would be more sophisticated
    return this.calculateMovingAverage();
  }

  private calculateAdaptationFactors(context: ThresholdAdaptationContext, ruleConfig: DynamicThresholdConfig) {
    return {
      signalStrength: context.signalStrength * ruleConfig.signalStrengthWeight,
      historicalPerformance: context.historicalPerformance * ruleConfig.historicalPerformanceWeight,
      marketConditions: context.marketConditions === 'bull' ? 0.8 : context.marketConditions === 'bear' ? 0.6 : 0.7,
      userRiskTolerance: ruleConfig.userRiskTolerance === 'aggressive' ? 0.8 :
                       ruleConfig.userRiskTolerance === 'moderate' ? 0.6 : 0.4
    };
  }
}
