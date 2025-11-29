/**
 * =========================================
 * ADAPTIVE WEIGHTING ENGINE
 * =========================================
 * Divine world-class adaptive weighting system that adjusts alert parameters
 * based on market condition correlations and performance patterns
 */

import { EventEmitter } from 'events';
import { Logger } from '../../../services/signal-evaluation-engine/src/utils/Logger';
import { MetricsCollector } from '../../../services/signal-evaluation-engine/src/monitoring/MetricsCollector';
import { Pool } from 'pg';

import { MarketCondition, MarketRegime, MarketConditionTracker } from './market_condition_tracker';
import { CorrelationResult, CorrelationAnalysisEngine } from './correlation_analysis_engine';

export interface AdaptiveWeight {
  signalType: string;
  ruleId: string;
  currentWeight: number;
  baseWeight: number;
  regimeWeights: Record<MarketRegime, number>;
  adaptiveFactors: {
    performanceCorrelation: number; // Correlation with alert performance
    regimeSensitivity: number; // How sensitive to market regimes
    stabilityFactor: number; // Weight stability over time
    confidenceAdjustment: number; // Based on data confidence
  };
  lastUpdated: Date;
  rationale: string; // Explanation for weight changes
}

export interface WeightAdjustment {
  signalType: string;
  ruleId: string;
  oldWeight: number;
  newWeight: number;
  adjustmentReason: string;
  confidence: number;
  effectiveDate: Date;
  expectedImpact: {
    performanceImprovement: number; // Expected % improvement
    falsePositiveReduction: number; // Expected % reduction in false positives
    regimeSpecificImprovement: Record<MarketRegime, number>;
  };
}

export interface AdaptiveWeightingConfig {
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  weighting: {
    updateInterval: number; // minutes
    minAdjustmentThreshold: number; // Minimum change to trigger adjustment
    maxAdjustmentRate: number; // Max % change per update
    stabilityWeight: number; // Weight for historical stability
    performanceWeight: number; // Weight for performance correlation
    regimeWeight: number; // Weight for regime-specific performance
  };
  adjustmentRules: {
    correlationThreshold: number; // Minimum correlation to trigger adjustment
    significanceThreshold: number; // Minimum p-value for significance
    minSampleSize: number; // Minimum data points for adjustment
    regimeSpecificAdjustment: boolean; // Enable regime-specific adjustments
  };
}

export class AdaptiveWeightingEngine extends EventEmitter {
  private logger: Logger;
  private metrics: MetricsCollector;
  private db: Pool;
  private config: AdaptiveWeightingConfig;
  private isInitialized: boolean = false;
  private marketTracker: MarketConditionTracker;
  private correlationEngine: CorrelationAnalysisEngine;
  private updateInterval?: NodeJS.Timeout;

  // Adaptive weights storage
  private adaptiveWeights: Map<string, AdaptiveWeight> = new Map();
  private weightHistory: Map<string, Array<{ weight: number; timestamp: Date; reason: string }>> = new Map();

  constructor(
    config: AdaptiveWeightingConfig,
    marketTracker: MarketConditionTracker,
    correlationEngine: CorrelationAnalysisEngine
  ) {
    super();
    this.logger = new Logger('AdaptiveWeightingEngine');
    this.metrics = new MetricsCollector();
    this.config = config;
    this.marketTracker = marketTracker;
    this.correlationEngine = correlationEngine;
    this.db = new Pool(config.database);

    this.initializeDatabase();
  }

  /**
   * Initialize database tables for adaptive weighting
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS adaptive_weights (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          signal_type VARCHAR(100) NOT NULL,
          rule_id VARCHAR(255) NOT NULL,
          current_weight DECIMAL(5,4) NOT NULL,
          base_weight DECIMAL(5,4) NOT NULL,
          regime_weights JSONB NOT NULL,
          adaptive_factors JSONB NOT NULL,
          last_updated TIMESTAMP WITH TIME ZONE NOT NULL,
          rationale TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_adaptive_weights_signal_rule ON adaptive_weights(signal_type, rule_id);
        CREATE INDEX IF NOT EXISTS idx_adaptive_weights_updated ON adaptive_weights(last_updated);
      `);

      // Create weight adjustment history table
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS weight_adjustments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          signal_type VARCHAR(100) NOT NULL,
          rule_id VARCHAR(255) NOT NULL,
          old_weight DECIMAL(5,4) NOT NULL,
          new_weight DECIMAL(5,4) NOT NULL,
          adjustment_reason TEXT NOT NULL,
          confidence DECIMAL(5,4) NOT NULL,
          effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
          expected_impact JSONB NOT NULL,
          applied_by VARCHAR(50) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_weight_adjustments_signal_rule ON weight_adjustments(signal_type, rule_id);
        CREATE INDEX IF NOT EXISTS idx_weight_adjustments_date ON weight_adjustments(effective_date);
      `);

      this.isInitialized = true;
      this.logger.info('✅ Adaptive weighting database initialized');
    } catch (error: any) {
      this.logger.error('❌ Failed to initialize adaptive weighting database', error);
      throw error;
    }
  }

  /**
   * Start adaptive weighting engine
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Adaptive weighting engine not initialized');
    }

    try {
      this.logger.info('Starting adaptive weighting engine...');

      // Start periodic weight updates
      this.updateInterval = setInterval(async () => {
        try {
          await this.updateAdaptiveWeights();
        } catch (error: any) {
          this.logger.error('Error updating adaptive weights', error);
        }
      }, this.config.weighting.updateInterval * 60 * 1000);

      // Perform initial weight update
      await this.updateAdaptiveWeights();

      this.logger.info('✅ Adaptive weighting engine started');
      this.emit('started');
    } catch (error: any) {
      this.logger.error('❌ Failed to start adaptive weighting engine', error);
      throw error;
    }
  }

  /**
   * Stop adaptive weighting engine
   */
  async stop(): Promise<void> {
    try {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = undefined;
      }

      await this.db.end();
      this.isInitialized = false;

      this.logger.info('✅ Adaptive weighting engine stopped');
      this.emit('stopped');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop adaptive weighting engine', error);
      throw error;
    }
  }

  /**
   * Update adaptive weights based on correlation analysis
   */
  async updateAdaptiveWeights(): Promise<void> {
    try {
      this.logger.info('Starting adaptive weight updates...');

      // Get current market conditions
      const currentConditions = this.marketTracker.getCurrentConditions();
      if (!currentConditions) {
        this.logger.warn('No current market conditions available for weight updates');
        return;
      }

      // Get recent correlation analysis results
      const correlationResults = await this.getRecentCorrelations();

      if (correlationResults.length === 0) {
        this.logger.debug('No correlation results available for weight updates');
        return;
      }

      // Update weights for each signal type and rule
      const adjustments: WeightAdjustment[] = [];

      for (const result of correlationResults) {
        try {
          const adjustment = await this.calculateWeightAdjustment(result, currentConditions);
          if (adjustment) {
            adjustments.push(adjustment);

            // Apply the adjustment
            await this.applyWeightAdjustment(adjustment);

            // Store adjustment history
            await this.storeWeightAdjustment(adjustment);
          }
        } catch (error: any) {
          this.logger.error('Error calculating weight adjustment', {
            signalType: result.variable,
            ruleId: result.alertMetric,
            error: error.message
          });
        }
      }

      // Emit weight update events
      if (adjustments.length > 0) {
        this.emit('weightsUpdated', {
          adjustments,
          totalAdjustments: adjustments.length,
          timestamp: new Date()
        });

        this.logger.info('Adaptive weights updated', {
          adjustmentsApplied: adjustments.length,
          averageConfidence: adjustments.reduce((sum, adj) => sum + adj.confidence, 0) / adjustments.length
        });
      }

      this.metrics.recordMetric('adaptive_weights_updated', adjustments.length);
    } catch (error: any) {
      this.logger.error('Failed to update adaptive weights', error);
      this.metrics.recordMetric('adaptive_weighting_errors', 1);
    }
  }

  /**
   * Calculate weight adjustment for a correlation result
   */
  private async calculateWeightAdjustment(
    correlation: CorrelationResult,
    currentConditions: MarketCondition
  ): Promise<WeightAdjustment | null> {
    try {
      // Check if correlation is significant enough for adjustment
      if (!correlation.significance.isSignificant ||
          Math.abs(correlation.correlation.pearson) < this.config.adjustmentRules.correlationThreshold) {
        return null;
      }

      // Get current adaptive weight
      const currentWeight = await this.getCurrentAdaptiveWeight(correlation.variable, correlation.alertMetric);

      // Calculate new weight based on correlation strength and regime
      const correlationStrength = Math.abs(correlation.correlation.pearson);
      const regimeMultiplier = this.getRegimeMultiplier(correlation.regime, currentConditions.regime);

      // Calculate adjustment magnitude (bounded by max adjustment rate)
      const maxAdjustment = currentWeight * this.config.weighting.maxAdjustmentRate;
      const targetAdjustment = correlationStrength * regimeMultiplier * 0.1; // Scale adjustment
      const adjustmentMagnitude = Math.max(-maxAdjustment, Math.min(maxAdjustment, targetAdjustment));

      const newWeight = Math.max(0.1, Math.min(2.0, currentWeight + adjustmentMagnitude));

      // Only apply if adjustment is significant enough
      if (Math.abs(newWeight - currentWeight) < this.config.weighting.minAdjustmentThreshold) {
        return null;
      }

      // Calculate expected impact
      const expectedImpact = this.calculateExpectedImpact(correlation, adjustmentMagnitude);

      // Generate adjustment rationale
      const rationale = this.generateAdjustmentRationale(correlation, adjustmentMagnitude, currentConditions);

      return {
        signalType: correlation.variable,
        ruleId: correlation.alertMetric,
        oldWeight: currentWeight,
        newWeight,
        adjustmentReason: rationale,
        confidence: correlation.significance.confidenceInterval[0] > 0 ? 0.8 : 0.6, // Based on confidence interval
        effectiveDate: new Date(),
        expectedImpact
      };
    } catch (error: any) {
      this.logger.error('Failed to calculate weight adjustment', error);
      return null;
    }
  }

  /**
   * Get current adaptive weight for signal/rule combination
   */
  private async getCurrentAdaptiveWeight(signalType: string, ruleId: string): Promise<number> {
    const key = `${signalType}_${ruleId}`;

    // Check memory cache first
    if (this.adaptiveWeights.has(key)) {
      return this.adaptiveWeights.get(key)!.currentWeight;
    }

    // Query database for current weight
    try {
      const { rows } = await this.db.query(`
        SELECT current_weight FROM adaptive_weights
        WHERE signal_type = $1 AND rule_id = $2
        ORDER BY last_updated DESC
        LIMIT 1
      `, [signalType, ruleId]);

      if (rows.length > 0) {
        return parseFloat(rows[0].current_weight);
      }
    } catch (error: any) {
      this.logger.error('Failed to get current adaptive weight', error);
    }

    // Return default weight (1.0) if not found
    return 1.0;
  }

  /**
   * Get regime multiplier for weight adjustment
   */
  private getRegimeMultiplier(correlationRegime: MarketRegime | 'all', currentRegime: MarketRegime): number {
    if (correlationRegime === 'all' || correlationRegime === currentRegime) {
      return 1.0; // Full weight for matching regimes
    }

    // Apply reduced weight for different regimes
    const regimeSimilarity = this.calculateRegimeSimilarity(correlationRegime, currentRegime);
    return Math.max(0.1, regimeSimilarity * 0.5); // Minimum 10% weight for similar regimes
  }

  /**
   * Calculate similarity between market regimes
   */
  private calculateRegimeSimilarity(regime1: MarketRegime | 'all', regime2: MarketRegime): number {
    if (regime1 === 'all') return 0.8; // All regimes get high similarity

    const regimePairs: Record<string, number> = {
      'bull_bull': 1.0,
      'bull_bear': 0.2,
      'bull_sideways': 0.6,
      'bull_volatile': 0.3,
      'bull_stable': 0.8,
      'bull_crash': 0.1,
      'bull_recovery': 0.9,

      'bear_bull': 0.2,
      'bear_bear': 1.0,
      'bear_sideways': 0.4,
      'bear_volatile': 0.8,
      'bear_stable': 0.1,
      'bear_crash': 0.9,
      'bear_recovery': 0.3,

      'sideways_bull': 0.6,
      'sideways_bear': 0.4,
      'sideways_sideways': 1.0,
      'sideways_volatile': 0.5,
      'sideways_stable': 0.7,
      'sideways_crash': 0.2,
      'sideways_recovery': 0.5,

      'volatile_bull': 0.3,
      'volatile_bear': 0.8,
      'volatile_sideways': 0.5,
      'volatile_volatile': 1.0,
      'volatile_stable': 0.2,
      'volatile_crash': 0.7,
      'volatile_recovery': 0.4,

      'stable_bull': 0.8,
      'stable_bear': 0.1,
      'stable_sideways': 0.7,
      'stable_volatile': 0.2,
      'stable_stable': 1.0,
      'stable_crash': 0.1,
      'stable_recovery': 0.8,

      'crash_bull': 0.1,
      'crash_bear': 0.9,
      'crash_sideways': 0.2,
      'crash_volatile': 0.7,
      'crash_crash': 1.0,
      'crash_stable': 0.1,
      'crash_recovery': 0.2,

      'recovery_bull': 0.9,
      'recovery_bear': 0.3,
      'recovery_sideways': 0.5,
      'recovery_volatile': 0.4,
      'recovery_stable': 0.8,
      'recovery_recovery': 1.0,
      'recovery_crash': 0.2
    };

    const key = `${regime1}_${regime2}`;
    return regimePairs[key] || 0.5; // Default similarity
  }

  /**
   * Calculate expected impact of weight adjustment
   */
  private calculateExpectedImpact(correlation: CorrelationResult, adjustmentMagnitude: number): {
    performanceImprovement: number;
    falsePositiveReduction: number;
    regimeSpecificImprovement: Record<MarketRegime, number>;
  } {
    // Estimate performance improvement based on correlation strength
    const correlationStrength = Math.abs(correlation.correlation.pearson);
    const performanceImprovement = correlationStrength * adjustmentMagnitude * 0.3; // Scale factor

    // Estimate false positive reduction (inverse relationship)
    const falsePositiveReduction = correlationStrength * adjustmentMagnitude * 0.2;

    // Regime-specific improvements
    const regimeSpecificImprovement: Record<MarketRegime, number> = {
      bull: correlation.regime === 'bull' ? performanceImprovement : performanceImprovement * 0.7,
      bear: correlation.regime === 'bear' ? performanceImprovement : performanceImprovement * 0.6,
      sideways: correlation.regime === 'sideways' ? performanceImprovement : performanceImprovement * 0.8,
      volatile: correlation.regime === 'volatile' ? performanceImprovement : performanceImprovement * 0.5,
      stable: correlation.regime === 'stable' ? performanceImprovement : performanceImprovement * 0.9,
      crash: correlation.regime === 'crash' ? performanceImprovement : performanceImprovement * 0.4,
      recovery: correlation.regime === 'recovery' ? performanceImprovement : performanceImprovement * 0.7
    };

    return {
      performanceImprovement: Math.min(0.5, performanceImprovement), // Cap at 50%
      falsePositiveReduction: Math.min(0.3, falsePositiveReduction), // Cap at 30%
      regimeSpecificImprovement
    };
  }

  /**
   * Generate rationale for weight adjustment
   */
  private generateAdjustmentRationale(
    correlation: CorrelationResult,
    adjustmentMagnitude: number,
    currentConditions: MarketCondition
  ): string {
    const direction = adjustmentMagnitude > 0 ? 'increased' : 'decreased';
    const strength = Math.abs(correlation.correlation.pearson);

    let rationale = `Weight ${direction} by ${Math.abs(adjustmentMagnitude * 100).toFixed(1)}% `;

    if (correlation.regime !== 'all') {
      rationale += `for ${correlation.regime} market regime `;
    }

    rationale += `due to ${strength.toFixed(3)} correlation with ${correlation.variable} `;

    if (correlation.significance.pValue < 0.001) {
      rationale += `(p < 0.001, highly significant)`;
    } else if (correlation.significance.pValue < 0.05) {
      rationale += `(p < 0.05, statistically significant)`;
    } else {
      rationale += `(p = ${correlation.significance.pValue.toFixed(3)})`;
    }

    return rationale;
  }

  /**
   * Apply weight adjustment
   */
  private async applyWeightAdjustment(adjustment: WeightAdjustment): Promise<void> {
    try {
      const key = `${adjustment.signalType}_${adjustment.ruleId}`;

      // Get current adaptive weight or create new one
      let adaptiveWeight = this.adaptiveWeights.get(key);

      if (!adaptiveWeight) {
        // Create new adaptive weight
        adaptiveWeight = {
          signalType: adjustment.signalType,
          ruleId: adjustment.ruleId,
          currentWeight: adjustment.newWeight,
          baseWeight: 1.0, // Default base weight
          regimeWeights: {
            bull: adjustment.newWeight,
            bear: adjustment.newWeight,
            sideways: adjustment.newWeight,
            volatile: adjustment.newWeight,
            stable: adjustment.newWeight,
            crash: adjustment.newWeight,
            recovery: adjustment.newWeight
          },
          adaptiveFactors: {
            performanceCorrelation: 0.5,
            regimeSensitivity: 0.5,
            stabilityFactor: 0.5,
            confidenceAdjustment: adjustment.confidence
          },
          lastUpdated: adjustment.effectiveDate,
          rationale: adjustment.adjustmentReason
        };
      } else {
        // Update existing weight
        adaptiveWeight.currentWeight = adjustment.newWeight;
        adaptiveWeight.lastUpdated = adjustment.effectiveDate;
        adaptiveWeight.rationale = adjustment.adjustmentReason;
        adaptiveWeight.adaptiveFactors.confidenceAdjustment = adjustment.confidence;
      }

      // Update weight history
      if (!this.weightHistory.has(key)) {
        this.weightHistory.set(key, []);
      }

      this.weightHistory.get(key)!.push({
        weight: adjustment.newWeight,
        timestamp: adjustment.effectiveDate,
        reason: adjustment.adjustmentReason
      });

      // Keep only recent history (last 100 entries)
      const history = this.weightHistory.get(key)!;
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }

      // Update memory cache
      this.adaptiveWeights.set(key, adaptiveWeight);

      // Store in database
      await this.storeAdaptiveWeight(adaptiveWeight);

      this.logger.debug('Weight adjustment applied', {
        signalType: adjustment.signalType,
        ruleId: adjustment.ruleId,
        oldWeight: adjustment.oldWeight,
        newWeight: adjustment.newWeight,
        confidence: adjustment.confidence
      });

    } catch (error: any) {
      this.logger.error('Failed to apply weight adjustment', error);
    }
  }

  /**
   * Store adaptive weight in database
   */
  private async storeAdaptiveWeight(weight: AdaptiveWeight): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO adaptive_weights (
          signal_type, rule_id, current_weight, base_weight, regime_weights,
          adaptive_factors, last_updated, rationale
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (signal_type, rule_id)
        DO UPDATE SET
          current_weight = EXCLUDED.current_weight,
          regime_weights = EXCLUDED.regime_weights,
          adaptive_factors = EXCLUDED.adaptive_factors,
          last_updated = EXCLUDED.last_updated,
          rationale = EXCLUDED.rationale
      `, [
        weight.signalType,
        weight.ruleId,
        weight.currentWeight,
        weight.baseWeight,
        JSON.stringify(weight.regimeWeights),
        JSON.stringify(weight.adaptiveFactors),
        weight.lastUpdated,
        weight.rationale
      ]);
    } catch (error: any) {
      this.logger.error('Failed to store adaptive weight', error);
    }
  }

  /**
   * Store weight adjustment in history
   */
  private async storeWeightAdjustment(adjustment: WeightAdjustment): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO weight_adjustments (
          signal_type, rule_id, old_weight, new_weight, adjustment_reason,
          confidence, effective_date, expected_impact, applied_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        adjustment.signalType,
        adjustment.ruleId,
        adjustment.oldWeight,
        adjustment.newWeight,
        adjustment.adjustmentReason,
        adjustment.confidence,
        adjustment.effectiveDate,
        JSON.stringify(adjustment.expectedImpact),
        'adaptive_weighting_engine'
      ]);
    } catch (error: any) {
      this.logger.error('Failed to store weight adjustment', error);
    }
  }

  /**
   * Get recent correlation results for analysis
   */
  private async getRecentCorrelations(): Promise<CorrelationResult[]> {
    try {
      const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours

      const { rows } = await this.db.query(`
        SELECT * FROM correlation_analysis_results
        WHERE created_at >= $1
        ORDER BY created_at DESC
      `, [cutoffDate]);

      return rows.map(row => ({
        variable: row.variable,
        alertMetric: row.alert_metric,
        correlation: row.correlation_data,
        significance: row.significance_data,
        sampleSize: row.sample_size,
        regime: row.regime as MarketRegime,
        timeWindow: {
          start: row.time_window_start,
          end: row.time_window_end
        },
        metadata: row.metadata
      }));
    } catch (error: any) {
      this.logger.error('Failed to get recent correlations', error);
      return [];
    }
  }

  /**
   * Get adaptive weight for signal/rule combination
   */
  async getAdaptiveWeight(signalType: string, ruleId: string, regime?: MarketRegime): Promise<number> {
    const key = `${signalType}_${ruleId}`;

    // Check memory cache first
    const cachedWeight = this.adaptiveWeights.get(key);
    if (cachedWeight) {
      return regime ? cachedWeight.regimeWeights[regime] : cachedWeight.currentWeight;
    }

    // Query database
    try {
      const { rows } = await this.db.query(`
        SELECT * FROM adaptive_weights
        WHERE signal_type = $1 AND rule_id = $2
        ORDER BY last_updated DESC
        LIMIT 1
      `, [signalType, ruleId]);

      if (rows.length > 0) {
        const weight = rows[0];
        return regime ? weight.regime_weights[regime] : weight.current_weight;
      }
    } catch (error: any) {
      this.logger.error('Failed to get adaptive weight', error);
    }

    return 1.0; // Default weight
  }

  /**
   * Get weight adjustment history
   */
  async getWeightHistory(signalType: string, ruleId: string): Promise<Array<{
    weight: number;
    timestamp: Date;
    reason: string;
  }>> {
    try {
      const { rows } = await this.db.query(`
        SELECT new_weight, effective_date, adjustment_reason
        FROM weight_adjustments
        WHERE signal_type = $1 AND rule_id = $2
        ORDER BY effective_date DESC
        LIMIT 50
      `, [signalType, ruleId]);

      return rows.map(row => ({
        weight: parseFloat(row.new_weight),
        timestamp: row.effective_date,
        reason: row.adjustment_reason
      }));
    } catch (error: any) {
      this.logger.error('Failed to get weight history', error);
      return [];
    }
  }

  /**
   * Get adaptive weighting summary
   */
  async getWeightingSummary(): Promise<{
    totalWeights: number;
    adjustedWeights: number;
    averageAdjustment: number;
    regimeDistribution: Record<MarketRegime, number>;
    recentAdjustments: number;
  }> {
    try {
      const { rows: weightRows } = await this.db.query(`
        SELECT COUNT(*) as total, AVG(current_weight) as avg_weight FROM adaptive_weights
      `);

      const { rows: adjustmentRows } = await this.db.query(`
        SELECT COUNT(*) as recent_adjustments
        FROM weight_adjustments
        WHERE effective_date >= $1
      `, [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)]);

      const totalWeights = parseInt(weightRows[0].total) || 0;
      const recentAdjustments = parseInt(adjustmentRows[0].recent_adjustments) || 0;

      // Calculate regime distribution
      const regimeDistribution: Record<MarketRegime, number> = {
        bull: 0,
        bear: 0,
        sideways: 0,
        volatile: 0,
        stable: 0,
        crash: 0,
        recovery: 0
      };

      const { rows: regimeRows } = await this.db.query(`
        SELECT regime, COUNT(*) as count FROM adaptive_weights
        GROUP BY regime
      `);

      for (const row of regimeRows) {
        regimeDistribution[row.regime as MarketRegime] = parseInt(row.count);
      }

      return {
        totalWeights,
        adjustedWeights: totalWeights, // All weights are adaptive
        averageAdjustment: parseFloat(weightRows[0].avg_weight) || 1.0,
        regimeDistribution,
        recentAdjustments
      };
    } catch (error: any) {
      this.logger.error('Failed to get weighting summary', error);
      return {
        totalWeights: 0,
        adjustedWeights: 0,
        averageAdjustment: 1.0,
        regimeDistribution: {
          bull: 0,
          bear: 0,
          sideways: 0,
          volatile: 0,
          stable: 0,
          crash: 0,
          recovery: 0
        },
        recentAdjustments: 0
      };
    }
  }

  /**
   * Get system health status
   */
  getHealthStatus(): {
    initialized: boolean;
    lastUpdate: Date | null;
    weightsManaged: number;
    recentAdjustments: number;
    errorCount: number;
  } {
    const lastUpdate = Array.from(this.adaptiveWeights.values())
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())[0]?.lastUpdated || null;

    return {
      initialized: this.isInitialized,
      lastUpdate,
      weightsManaged: this.adaptiveWeights.size,
      recentAdjustments: this.metrics.getMetric('adaptive_weights_updated') || 0,
      errorCount: this.metrics.getMetric('adaptive_weighting_errors') || 0
    };
  }
}
