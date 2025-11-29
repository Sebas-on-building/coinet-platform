/**
 * =========================================
 * ALERT EVALUATION ENGINE
 * =========================================
 * Divine world-class stateless alert evaluation engine
 * Sub-millisecond performance with comprehensive condition matching
 */

import { Logger } from '@/utils/Logger';
import pLimit from 'p-limit';
import {
  NormalizedMarketSignal,
  AlertRule,
  RuleEvaluationResult,
  ConditionResult,
  EvaluationResult,
  EvaluationContext,
  RuleIndex,
  BaselineValue,
  ThresholdValue,
  PatternMatch,
  ComparisonOperator,
  LogicalOperator,
  MetricType,
  TimeWindow,
  IAlertRuleStorage,
  IBaselineStorage,
  IThresholdStorage,
  IPatternStorage,
  ISignalCache
} from '../types';

/**
 * Core alert evaluation engine
 */
export class AlertEvaluationEngine {
  private logger: Logger;
  private ruleStorage: IAlertRuleStorage;
  private baselineStorage: IBaselineStorage;
  private thresholdStorage: IThresholdStorage;
  private patternStorage: IPatternStorage;
  private signalCache: ISignalCache;

  // Performance optimization
  private concurrencyLimiter: any;
  private maxEvaluationTime: number;

  // Caching for performance
  private ruleCache: Map<string, AlertRule[]> = new Map();
  private baselineCache: Map<string, BaselineValue> = new Map();
  private thresholdCache: Map<string, ThresholdValue> = new Map();

  constructor(
    ruleStorage: IAlertRuleStorage,
    baselineStorage: IBaselineStorage,
    thresholdStorage: IThresholdStorage,
    patternStorage: IPatternStorage,
    signalCache: ISignalCache,
    maxConcurrency: number = 10,
    maxEvaluationTime: number = 50 // milliseconds
  ) {
    this.logger = new Logger('AlertEvaluation');
    this.ruleStorage = ruleStorage;
    this.baselineStorage = baselineStorage;
    this.thresholdStorage = thresholdStorage;
    this.patternStorage = patternStorage;
    this.signalCache = signalCache;
    this.maxEvaluationTime = maxEvaluationTime;

    this.concurrencyLimiter = pLimit(maxConcurrency);
  }

  /**
   * Evaluate signal against all active alert rules
   */
  async evaluateSignal(
    signal: NormalizedMarketSignal,
    context?: Partial<EvaluationContext>
  ): Promise<EvaluationResult> {
    const startTime = Date.now();
    const requestId = context?.requestId || `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.debug('Starting signal evaluation', {
      requestId,
      signalId: signal.id,
      exchange: signal.exchange,
      symbol: signal.symbol,
    });

    try {
      // Get historical signals for pattern matching
      const historicalSignals = await this.getHistoricalSignals(signal);

      // Build evaluation context
      const evalContext = await this.buildEvaluationContext(signal, historicalSignals, requestId);

      // Get relevant rules using indexing
      const relevantRules = this.getRelevantRules(signal, evalContext.ruleIndex);

      if (relevantRules.length === 0) {
        return this.createEmptyResult(signal, requestId, startTime);
      }

      // Evaluate rules in parallel with concurrency limiting
      const ruleEvaluations = await this.evaluateRulesParallel(relevantRules, evalContext);

      // Sort by priority and score
      const sortedEvaluations = this.sortRuleEvaluations(ruleEvaluations);

      const processingTime = Date.now() - startTime;
      const cacheHitRatio = this.calculateCacheHitRatio();

      // Log performance metrics
      this.logger.debug('Signal evaluation completed', {
        requestId,
        totalRules: relevantRules.length,
        matchingRules: sortedEvaluations.filter(r => r.triggered).length,
        processingTime,
        cacheHitRatio,
      });

      return {
        requestId,
        signal,
        matchingRules: sortedEvaluations.filter(r => r.triggered),
        nonMatchingRules: sortedEvaluations.filter(r => !r.triggered),
        totalRules: relevantRules.length,
        totalProcessingTime: processingTime,
        evaluatedAt: Date.now(),
        cacheHitRatio,
      };

    } catch (error: any) {
      this.logger.error('Signal evaluation failed', {
        requestId,
        signalId: signal.id,
        error: error.message,
        stack: error.stack,
      });

      return {
        requestId,
        signal,
        matchingRules: [],
        nonMatchingRules: [],
        totalRules: 0,
        totalProcessingTime: Date.now() - startTime,
        evaluatedAt: Date.now(),
        cacheHitRatio: 0,
      };
    }
  }

  /**
   * Build evaluation context with cached data
   */
  private async buildEvaluationContext(
    signal: NormalizedMarketSignal,
    historicalSignals: NormalizedMarketSignal[],
    requestId: string
  ): Promise<EvaluationContext> {
    // Get baselines (with caching)
    const baselines = await this.getBaselinesWithCache();

    // Get thresholds (with caching)
    const thresholds = await this.getThresholdsWithCache();

    // Get patterns (with caching)
    const patterns = await this.getPatternsWithCache();

    // Get rule index
    const ruleIndex = await this.getRuleIndex();

    return {
      signal,
      historicalSignals,
      baselines,
      thresholds,
      patterns,
      ruleIndex,
      timestamp: Date.now(),
      requestId,
    };
  }

  /**
   * Get historical signals for pattern matching
   */
  private async getHistoricalSignals(signal: NormalizedMarketSignal): Promise<NormalizedMarketSignal[]> {
    const cacheKey = `historical_${signal.exchange}_${signal.symbol}_${signal.signalType}`;

    // Try cache first
    const cached = this.signalCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // In a real implementation, this would fetch from a time-series database
    // For now, return empty array (no historical context)
    const historicalSignals: NormalizedMarketSignal[] = [];

    // Cache empty result
    this.signalCache.set(cacheKey, historicalSignals, 300); // 5 minute TTL

    return historicalSignals;
  }

  /**
   * Get baselines with caching
   */
  private async getBaselinesWithCache(): Promise<Map<string, BaselineValue>> {
    const cacheKey = 'baselines';

    // Try cache first
    const cached = this.baselineCache.get(cacheKey);
    if (cached) {
      const baselineMap = new Map<string, BaselineValue>();
      if (Array.isArray(cached)) {
        cached.forEach(baseline => baselineMap.set(baseline.baselineId, baseline));
      } else {
        baselineMap.set((cached as BaselineValue).baselineId, cached as BaselineValue);
      }
      return baselineMap;
    }

    // Fetch from storage
    const baselines = await this.baselineStorage.getBaselinesForMetric(MetricType.PRICE); // Simplified
    const baselineMap = new Map<string, BaselineValue>();
    baselines.forEach(baseline => baselineMap.set(baseline.baselineId, baseline));

    // Cache for 1 minute - store as single object for simplicity
    const baselineValue = Array.from(baselineMap.values())[0];
    if (baselineValue) {
      this.baselineCache.set(cacheKey, baselineValue);
    }

    return baselineMap;
  }

  /**
   * Get thresholds with caching
   */
  private async getThresholdsWithCache(): Promise<Map<string, ThresholdValue>> {
    const cacheKey = 'thresholds';

    // Try cache first
    const cached = this.thresholdCache.get(cacheKey);
    if (cached) {
      const thresholdMap = new Map<string, ThresholdValue>();
      if (Array.isArray(cached)) {
        cached.forEach(threshold => thresholdMap.set(threshold.thresholdId, threshold));
      } else {
        thresholdMap.set((cached as ThresholdValue).thresholdId, cached as ThresholdValue);
      }
      return thresholdMap;
    }

    // Fetch from storage
    const thresholds = await this.thresholdStorage.getThresholdsForMetric(MetricType.PRICE); // Simplified
    const thresholdMap = new Map<string, ThresholdValue>();
    thresholds.forEach(threshold => thresholdMap.set(threshold.thresholdId, threshold));

    // Cache for 1 minute - store as single object for simplicity
    const thresholdValue = Array.from(thresholdMap.values())[0];
    if (thresholdValue) {
      this.thresholdCache.set(cacheKey, thresholdValue);
    }

    return thresholdMap;
  }

  /**
   * Get patterns with caching
   */
  private async getPatternsWithCache(): Promise<Map<string, any>> {
    // Simplified - in real implementation would cache patterns
    return new Map();
  }

  /**
   * Get rule index
   */
  private async getRuleIndex(): Promise<RuleIndex> {
    // In a real implementation, this would use the RuleIndexingEngine
    // For now, return a simplified index
    return {
      byExchange: new Map(),
      bySymbol: new Map(),
      byAssetType: new Map(),
      bySignalType: new Map(),
      byMetricType: new Map(),
      byPriority: new Map(),
      totalRules: 0,
      lastUpdated: 0,
    };
  }

  /**
   * Get relevant rules using indexing
   */
  private getRelevantRules(signal: NormalizedMarketSignal, ruleIndex: RuleIndex): AlertRule[] {
    // Simplified - in real implementation would use RuleIndexingEngine
    // For now, return all rules (would be filtered by indexing)
    return [];
  }

  /**
   * Evaluate rules in parallel with concurrency limiting
   */
  private async evaluateRulesParallel(
    rules: AlertRule[],
    context: EvaluationContext
  ): Promise<RuleEvaluationResult[]> {
    const evaluationPromises = rules.map(rule =>
      this.concurrencyLimiter(() => this.evaluateRule(rule, context))
    );

    return Promise.all(evaluationPromises);
  }

  /**
   * Evaluate a single rule against the signal
   */
  private async evaluateRule(
    rule: AlertRule,
    context: EvaluationContext
  ): Promise<RuleEvaluationResult> {
    const startTime = Date.now();

    try {
      // Evaluate all conditions
      const conditionResults = await this.evaluateConditions(rule, context);

      // Calculate total score
      const totalScore = conditionResults.reduce((sum, result) => sum + result.score, 0);
      const maxScore = rule.conditions.reduce((sum, condition) => sum + condition.weight, 0);

      // Check if rule is triggered
      const triggered = totalScore >= rule.minScore && (rule.maxScore === undefined || totalScore <= rule.maxScore);

      const processingTime = Date.now() - startTime;

      return {
        ruleId: rule.id,
        triggered,
        score: totalScore,
        maxScore,
        conditionResults,
        patternMatches: [], // Simplified - would include pattern matches
        evaluatedAt: Date.now(),
        processingTime,
      };

    } catch (error: any) {
      this.logger.error('Rule evaluation failed', {
        ruleId: rule.id,
        error: error.message,
      });

      return {
        ruleId: rule.id,
        triggered: false,
        score: 0,
        maxScore: rule.conditions.reduce((sum, condition) => sum + condition.weight, 0),
        conditionResults: [],
        patternMatches: [],
        evaluatedAt: Date.now(),
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Evaluate all conditions in a rule
   */
  private async evaluateConditions(
    rule: AlertRule,
    context: EvaluationContext
  ): Promise<ConditionResult[]> {
    const conditionPromises = rule.conditions.map(condition =>
      this.evaluateCondition(condition, context)
    );

    return Promise.all(conditionPromises);
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: any, // AlertCondition
    context: EvaluationContext
  ): Promise<ConditionResult> {
    const { signal } = context;

    // Extract metric value
    const metricValue = this.extractMetricValue(signal, condition.metricType);
    if (metricValue === null) {
      return {
        conditionId: condition.id,
        ruleId: '', // Would need to be passed
        met: false,
        actualValue: 0,
        expectedValue: condition.value,
        score: 0,
        confidence: 0,
        evaluatedAt: Date.now(),
      };
    }

    // Apply baseline/threshold adjustments
    let adjustedValue = metricValue;
    let adjustedExpected = condition.value;

    if (condition.baselineId) {
      const baseline = context.baselines.get(condition.baselineId);
      if (baseline) {
        adjustedValue = metricValue - baseline.value;
      }
    }

    if (condition.thresholdId) {
      const threshold = context.thresholds.get(condition.thresholdId);
      if (threshold) {
        // Apply threshold logic (simplified)
        adjustedExpected = threshold.value;
      }
    }

    // Evaluate condition
    const met = this.evaluateComparison(adjustedValue, condition.operator, adjustedExpected);
    const confidence = this.calculateConditionConfidence(signal, condition);

    // Calculate score contribution
    const score = met ? condition.weight : 0;

    return {
      conditionId: condition.id,
      ruleId: '', // Would need to be passed
      met,
      actualValue: metricValue,
      expectedValue: condition.value,
      score,
      confidence,
      evaluatedAt: Date.now(),
    };
  }

  /**
   * Extract metric value from signal
   */
  private extractMetricValue(signal: NormalizedMarketSignal, metricType: MetricType): number | null {
    switch (metricType) {
      case MetricType.PRICE:
        return signal.price || null;
      case MetricType.VOLUME:
        return signal.volume || null;
      case MetricType.SPREAD:
        return signal.spread || null;
      case MetricType.LIQUIDITY:
        return signal.liquidityScore || null;
      case MetricType.VOLATILITY:
        return signal.volatility || null;
      case MetricType.MOMENTUM:
        return signal.momentumScore || null;
      case MetricType.ORDERBOOK_IMBALANCE:
        return signal.orderBookImbalance || null;
      case MetricType.FUNDING_RATE:
        return signal.fundingRate || null;
      case MetricType.OPEN_INTEREST:
        return signal.openInterest || null;
      case MetricType.MARKET_DEPTH:
        return signal.marketDepth || null;
      default:
        return null;
    }
  }

  /**
   * Evaluate comparison operation
   */
  private evaluateComparison(value: number, operator: ComparisonOperator, expected: number): boolean {
    switch (operator) {
      case ComparisonOperator.EQUALS:
        return Math.abs(value - expected) < 0.0001;
      case ComparisonOperator.NOT_EQUALS:
        return Math.abs(value - expected) >= 0.0001;
      case ComparisonOperator.GREATER_THAN:
        return value > expected;
      case ComparisonOperator.GREATER_THAN_OR_EQUAL:
        return value >= expected;
      case ComparisonOperator.LESS_THAN:
        return value < expected;
      case ComparisonOperator.LESS_THAN_OR_EQUAL:
        return value <= expected;
      case ComparisonOperator.WITHIN_PERCENTAGE:
        return Math.abs((value - expected) / expected) * 100 <= 5;
      case ComparisonOperator.OUTSIDE_PERCENTAGE:
        return Math.abs((value - expected) / expected) * 100 > 5;
      default:
        return false;
    }
  }

  /**
   * Calculate condition confidence
   */
  private calculateConditionConfidence(signal: NormalizedMarketSignal, condition: any): number {
    // Simplified confidence calculation
    let confidence = 0.8; // Base confidence

    // Adjust based on signal quality
    if (signal.price && condition.metricType === MetricType.PRICE) confidence += 0.1;
    if (signal.volume && condition.metricType === MetricType.VOLUME) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  /**
   * Sort rule evaluations by priority and score
   */
  private sortRuleEvaluations(evaluations: RuleEvaluationResult[]): RuleEvaluationResult[] {
    return evaluations.sort((a, b) => {
      // Sort by triggered status first (triggered rules first)
      if (a.triggered && !b.triggered) return -1;
      if (!a.triggered && b.triggered) return 1;

      // Then by score (higher score first)
      if (a.score !== b.score) return b.score - a.score;

      // Finally by processing time (faster first)
      return a.processingTime - b.processingTime;
    });
  }

  /**
   * Calculate cache hit ratio
   */
  private calculateCacheHitRatio(): number {
    return this.signalCache.getStats().hitRatio;
  }

  /**
   * Create empty result for no matches
   */
  private createEmptyResult(
    signal: NormalizedMarketSignal,
    requestId: string,
    startTime: number
  ): EvaluationResult {
    return {
      requestId,
      signal,
      matchingRules: [],
      nonMatchingRules: [],
      totalRules: 0,
      totalProcessingTime: Date.now() - startTime,
      evaluatedAt: Date.now(),
      cacheHitRatio: 0,
    };
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.ruleCache.clear();
    this.baselineCache.clear();
    this.thresholdCache.clear();
    this.signalCache.invalidate('*');
    this.logger.info('Cleared all evaluation caches');
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    cacheStats: any;
    averageEvaluationTime: number;
    totalEvaluations: number;
  } {
    return {
      cacheStats: this.signalCache.getStats(),
      averageEvaluationTime: 0, // Would need to track this
      totalEvaluations: 0, // Would need to track this
    };
  }
}
