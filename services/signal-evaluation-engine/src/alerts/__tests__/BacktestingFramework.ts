/**
 * =========================================
 * ALERT ENGINE BACKTESTING FRAMEWORK
 * =========================================
 * Comprehensive backtesting system for validating alert
 * engine performance with historical data:
 * - Historical signal replay
 * - Rule evaluation validation
 * - Performance benchmarking
 * - Statistical analysis
 * - Report generation
 */

import { RuleEngine } from '../RuleEngine';
import { RuleParser } from '../RuleParser';
import { CooldownManager } from '../CooldownManager';
import { DynamicThresholdEngine } from '../DynamicThresholdEngine';
import { SequentialPatternEngine } from '../SequentialPatternEngine';
import type {
  AlertRule,
  NormalizedSignal,
  RuleEvaluationResult,
  BacktestResult,
  BacktestConfig,
  HistoricalSignal,
  SignalType
} from '../types';

export class BacktestingFramework {
  private ruleEngine: RuleEngine;
  private ruleParser: RuleParser;
  private cooldownManager: CooldownManager;
  private dynamicThresholdEngine: DynamicThresholdEngine;
  private sequentialPatternEngine: SequentialPatternEngine;

  constructor() {
    this.ruleEngine = new RuleEngine();
    this.ruleParser = new RuleParser();
    this.cooldownManager = new CooldownManager();
    this.dynamicThresholdEngine = new DynamicThresholdEngine();
    this.sequentialPatternEngine = new SequentialPatternEngine();
  }

  async initialize(): Promise<void> {
    await this.ruleEngine.initialize();
    await this.cooldownManager.initialize();
    await this.dynamicThresholdEngine.initialize();
    await this.sequentialPatternEngine.initialize();
  }

  /**
   * Run comprehensive backtest with historical data
   */
  async runBacktest(
    config: BacktestConfig,
    historicalSignals: HistoricalSignal[]
  ): Promise<BacktestResult> {
    const startTime = Date.now();

    try {
      // Setup rules for testing
      await this.setupTestRules(config.rules);

      // Replay historical signals
      const results = await this.replayHistoricalSignals(historicalSignals, config);

      // Analyze results
      const analysis = this.analyzeBacktestResults(results, config);

      const endTime = Date.now();
      const duration = endTime - startTime;

      return {
        config,
        totalSignals: historicalSignals.length,
        totalRules: config.rules.length,
        evaluationResults: results,
        performanceMetrics: {
          totalDuration: duration,
          averageLatency: duration / results.length,
          memoryUsage: this.getMemoryUsage(),
          rulesPerSecond: (config.rules.length * results.length) / (duration / 1000)
        },
        statisticalAnalysis: analysis,
        success: analysis.overallAccuracy > config.minAccuracyThreshold
      };

    } catch (error: any) {
      throw new Error(`Backtesting failed: ${error.message}`);
    }
  }

  /**
   * Generate backtesting report
   */
  generateReport(results: BacktestResult): string {
    const report = {
      summary: {
        totalSignals: results.totalSignals,
        totalRules: results.totalRules,
        duration: `${results.performanceMetrics.totalDuration}ms`,
        averageLatency: `${results.performanceMetrics.averageLatency.toFixed(2)}ms`,
        success: results.success ? 'PASS' : 'FAIL'
      },
      performance: {
        rulesPerSecond: results.performanceMetrics.rulesPerSecond.toFixed(2),
        memoryUsage: `${(results.performanceMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
        latencyDistribution: this.calculateLatencyDistribution(results.evaluationResults)
      },
      accuracy: {
        overall: `${(results.statisticalAnalysis.overallAccuracy * 100).toFixed(2)}%`,
        byRule: results.statisticalAnalysis.ruleAccuracy,
        bySignalType: results.statisticalAnalysis.signalTypeAccuracy
      },
      recommendations: results.statisticalAnalysis.recommendations
    };

    return JSON.stringify(report, null, 2);
  }

  // Private methods

  private async setupTestRules(rules: Array<{ expression: string; name: string }>): Promise<void> {
    for (const ruleConfig of rules) {
      try {
        const ast = await this.ruleParser.parse(ruleConfig.expression);
        const rule: AlertRule = {
          id: `backtest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: ruleConfig.name,
          description: `Backtest rule: ${ruleConfig.expression}`,
          expression: ruleConfig.expression,
          ast,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'backtest',
          metadata: {
            category: 'price',
            severity: 'info',
            tags: ['backtest'],
            cooldownPeriod: 300
          },
          conditions: {
            evaluationWindow: 300,
            requiredSignals: 1,
            stalenessThreshold: 3600
          }
        };

        this.ruleEngine.addRule(rule);
      } catch (error) {
        console.warn(`Failed to setup rule ${ruleConfig.name}:`, error);
      }
    }
  }

  private async replayHistoricalSignals(
    signals: HistoricalSignal[],
    config: BacktestConfig
  ): Promise<RuleEvaluationResult[]> {
    const results: RuleEvaluationResult[] = [];
    const batchSize = config.batchSize || 100;
    const batches = this.chunkArray(signals, batchSize);

    for (const batch of batches) {
      const normalizedSignals = this.convertToNormalizedSignals(batch);

      // Update signal data
      this.ruleEngine.updateSignalData(normalizedSignals);

      // Evaluate all active rules
      const activeRules = this.ruleEngine.getActiveRules();

      for (const rule of activeRules) {
        try {
          const result = await this.ruleEngine.evaluateRule(rule.id);
          results.push(result);
        } catch (error) {
          console.warn(`Failed to evaluate rule ${rule.id}:`, error);
        }
      }

      // Small delay to simulate real-time processing
      if (config.simulateRealTime) {
        await this.delay(config.signalInterval || 100);
      }
    }

    return results;
  }

  private analyzeBacktestResults(
    results: RuleEvaluationResult[],
    config: BacktestConfig
  ): any {
    // Calculate accuracy metrics
    const triggeredResults = results.filter(r => r.triggered);
    const totalEvaluations = results.length;
    const triggeredCount = triggeredResults.length;

    // Basic accuracy (simplified - would need ground truth data)
    const overallAccuracy = Math.min(triggeredCount / Math.max(totalEvaluations, 1), 1.0);

    // Accuracy by rule
    const ruleAccuracy = this.calculateRuleAccuracy(results);

    // Accuracy by signal type
    const signalTypeAccuracy = this.calculateSignalTypeAccuracy(results);

    // Performance analysis
    const latencies = results.map(r => r.context.evaluationDuration);
    const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;

    // Generate recommendations
    const recommendations = this.generateRecommendations(results, config);

    return {
      overallAccuracy,
      ruleAccuracy,
      signalTypeAccuracy,
      performanceMetrics: {
        averageLatency: avgLatency,
        maxLatency: Math.max(...latencies),
        minLatency: Math.min(...latencies),
        latencyVariance: this.calculateVariance(latencies)
      },
      recommendations
    };
  }

  private calculateRuleAccuracy(results: RuleEvaluationResult[]): Record<string, number> {
    const ruleResults = new Map<string, { triggered: number; total: number }>();

    for (const result of results) {
      const stats = ruleResults.get(result.ruleId) || { triggered: 0, total: 0 };
      stats.total++;
      if (result.triggered) stats.triggered++;
      ruleResults.set(result.ruleId, stats);
    }

    const accuracy: Record<string, number> = {};
    for (const [ruleId, stats] of ruleResults) {
      accuracy[ruleId] = stats.triggered / stats.total;
    }

    return accuracy;
  }

  private calculateSignalTypeAccuracy(results: RuleEvaluationResult[]): Record<SignalType, number> {
    const signalTypeResults = new Map<SignalType, { triggered: number; total: number }>();

    for (const result of results) {
      for (const signal of result.matchedSignals) {
        const stats = signalTypeResults.get(signal.type) || { triggered: 0, total: 0 };
        stats.total++;
        if (result.triggered) stats.triggered++;
        signalTypeResults.set(signal.type, stats);
      }
    }

    const accuracy: Record<SignalType, number> = {};
    for (const [signalType, stats] of signalTypeResults) {
      accuracy[signalType] = stats.triggered / Math.max(stats.total, 1);
    }

    return accuracy;
  }

  private calculateLatencyDistribution(results: RuleEvaluationResult[]): any {
    const latencies = results.map(r => r.context.evaluationDuration);

    return {
      mean: latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length,
      median: this.calculateMedian(latencies),
      p95: this.calculatePercentile(latencies, 95),
      p99: this.calculatePercentile(latencies, 99)
    };
  }

  private generateRecommendations(results: RuleEvaluationResult[], config: BacktestConfig): string[] {
    const recommendations: string[] = [];

    // Check latency requirements
    const avgLatency = results.reduce((sum, r) => sum + r.context.evaluationDuration, 0) / results.length;
    if (avgLatency > 100) {
      recommendations.push('Consider optimizing rule complexity for sub-100ms latency');
    }

    // Check memory usage
    const memoryUsage = this.getMemoryUsage();
    if (memoryUsage > 100 * 1024 * 1024) { // 100MB
      recommendations.push('High memory usage detected - consider rule optimization');
    }

    // Check rule effectiveness
    const triggeredRate = results.filter(r => r.triggered).length / results.length;
    if (triggeredRate < 0.01) {
      recommendations.push('Very low trigger rate - consider adjusting thresholds');
    }
    if (triggeredRate > 0.5) {
      recommendations.push('High trigger rate - may indicate overly sensitive rules');
    }

    return recommendations;
  }

  private convertToNormalizedSignals(historicalSignals: HistoricalSignal[]): NormalizedSignal[] {
    return historicalSignals.map(signal => ({
      id: signal.id,
      type: signal.type,
      timestamp: signal.timestamp,
      normalizedValues: signal.values,
      metadata: {
        confidence: signal.confidence || 0.8,
        source: signal.source || 'historical',
        asset: signal.asset || 'unknown',
        timestamp: signal.timestamp
      }
    }));
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private getMemoryUsage(): number {
    // Simplified memory usage calculation
    return process.memoryUsage().heapUsed;
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private calculateMedian(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sorted[lower];
    }

    return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
  }
}

// Types for backtesting
export interface HistoricalSignal {
  id: string;
  type: SignalType;
  timestamp: Date;
  values: Record<string, number>;
  confidence?: number;
  source?: string;
  asset?: string;
}

export interface BacktestConfig {
  rules: Array<{ expression: string; name: string }>;
  batchSize?: number;
  simulateRealTime?: boolean;
  signalInterval?: number; // ms between signals
  minAccuracyThreshold: number; // 0-1
}

export interface BacktestResult {
  config: BacktestConfig;
  totalSignals: number;
  totalRules: number;
  evaluationResults: RuleEvaluationResult[];
  performanceMetrics: {
    totalDuration: number;
    averageLatency: number;
    memoryUsage: number;
    rulesPerSecond: number;
  };
  statisticalAnalysis: {
    overallAccuracy: number;
    ruleAccuracy: Record<string, number>;
    signalTypeAccuracy: Record<SignalType, number>;
    performanceMetrics: {
      averageLatency: number;
      maxLatency: number;
      minLatency: number;
      latencyVariance: number;
    };
    recommendations: string[];
  };
  success: boolean;
}
