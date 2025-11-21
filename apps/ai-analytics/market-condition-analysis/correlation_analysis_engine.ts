/**
 * =========================================
 * MARKET CONDITION CORRELATION ANALYSIS ENGINE
 * =========================================
 * Divine world-class correlation analysis system that correlates alert performance
 * with external market conditions using advanced statistical methods
 */

import { EventEmitter } from 'events';
import { Logger } from '../../../services/signal-evaluation-engine/src/utils/Logger';
import { MetricsCollector } from '../../../services/signal-evaluation-engine/src/monitoring/MetricsCollector';
import { Pool } from 'pg';

import { MarketCondition, MarketRegime, MarketConditionTracker } from './market_condition_tracker';
import { AlertPerformanceMetrics } from '../alerts/alert_performance_analytics';

export interface CorrelationResult {
  variable: string; // Market condition variable (e.g., 'volatility.vix', 'macroeconomic.inflation')
  alertMetric: string; // Alert performance metric (e.g., 'successRate', 'winRate', 'sharpeRatio')
  correlation: {
    pearson: number; // Pearson correlation coefficient
    spearman: number; // Spearman rank correlation
    kendall: number; // Kendall tau correlation
  };
  significance: {
    pValue: number; // Statistical significance
    isSignificant: boolean; // Whether correlation is statistically significant
    confidenceInterval: [number, number]; // 95% confidence interval
  };
  sampleSize: number;
  regime: MarketRegime | 'all'; // Market regime or overall
  timeWindow: {
    start: Date;
    end: Date;
  };
  metadata: {
    calculationMethod: string;
    lastUpdated: Date;
    dataQuality: number; // Data completeness score
  };
}

export interface MarketConditionCorrelation {
  regime: MarketRegime;
  correlations: CorrelationResult[];
  summary: {
    strongestPositive: CorrelationResult | null;
    strongestNegative: CorrelationResult | null;
    mostSignificant: CorrelationResult | null;
    averageCorrelation: number;
    significantCorrelations: number;
    totalCorrelations: number;
  };
  recommendations: {
    strategyAdjustments: string[];
    signalOptimizations: string[];
    riskManagement: string[];
  };
}

export interface CorrelationAnalysisConfig {
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  analysis: {
    minSampleSize: number;
    significanceLevel: number; // Alpha for statistical tests
    confidenceLevel: number; // For confidence intervals
    lookbackDays: number; // Days of historical data to analyze
    updateInterval: number; // Minutes between analyses
  };
  statisticalTests: {
    pearsonCorrelation: boolean;
    spearmanCorrelation: boolean;
    kendallCorrelation: boolean;
    tTest: boolean;
    anova: boolean;
  };
  marketVariables: {
    volatility: string[];
    macroeconomic: string[];
    liquidity: string[];
    volume: string[];
    sentiment: string[];
  };
  alertMetrics: string[];
}

export class CorrelationAnalysisEngine extends EventEmitter {
  private logger: Logger;
  private metrics: MetricsCollector;
  private db: Pool;
  private config: CorrelationAnalysisConfig;
  private isInitialized: boolean = false;
  private marketTracker: MarketConditionTracker;
  private updateInterval?: NodeJS.Timeout;

  // Analysis cache
  private correlationCache: Map<string, CorrelationResult> = new Map();
  private marketConditionCache: Map<string, MarketCondition[]> = new Map();

  constructor(config: CorrelationAnalysisConfig, marketTracker: MarketConditionTracker) {
    super();
    this.logger = new Logger('CorrelationAnalysisEngine');
    this.metrics = new MetricsCollector();
    this.config = config;
    this.marketTracker = marketTracker;
    this.db = new Pool(config.database);

    this.initializeDatabase();
  }

  /**
   * Initialize database tables for correlation analysis
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS correlation_analysis_results (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          variable VARCHAR(255) NOT NULL,
          alert_metric VARCHAR(255) NOT NULL,
          regime VARCHAR(20) NOT NULL,
          correlation_data JSONB NOT NULL,
          significance_data JSONB NOT NULL,
          sample_size INTEGER NOT NULL,
          time_window_start TIMESTAMP WITH TIME ZONE NOT NULL,
          time_window_end TIMESTAMP WITH TIME ZONE NOT NULL,
          metadata JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_correlation_variable ON correlation_analysis_results(variable);
        CREATE INDEX IF NOT EXISTS idx_correlation_alert_metric ON correlation_analysis_results(alert_metric);
        CREATE INDEX IF NOT EXISTS idx_correlation_regime ON correlation_analysis_results(regime);
        CREATE INDEX IF NOT EXISTS idx_correlation_time_window ON correlation_analysis_results(time_window_start, time_window_end);
      `);

      this.isInitialized = true;
      this.logger.info('✅ Correlation analysis database initialized');
    } catch (error: any) {
      this.logger.error('❌ Failed to initialize correlation analysis database', error);
      throw error;
    }
  }

  /**
   * Start correlation analysis engine
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Correlation analysis engine not initialized');
    }

    try {
      this.logger.info('Starting correlation analysis engine...');

      // Start periodic analysis
      this.updateInterval = setInterval(async () => {
        try {
          await this.performCorrelationAnalysis();
        } catch (error: any) {
          this.logger.error('Error in correlation analysis', error);
        }
      }, this.config.analysis.updateInterval * 60 * 1000);

      // Perform initial analysis
      await this.performCorrelationAnalysis();

      this.logger.info('✅ Correlation analysis engine started');
      this.emit('started');
    } catch (error: any) {
      this.logger.error('❌ Failed to start correlation analysis engine', error);
      throw error;
    }
  }

  /**
   * Stop correlation analysis engine
   */
  async stop(): Promise<void> {
    try {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = undefined;
      }

      await this.db.end();
      this.isInitialized = false;

      this.logger.info('✅ Correlation analysis engine stopped');
      this.emit('stopped');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop correlation analysis engine', error);
      throw error;
    }
  }

  /**
   * Perform comprehensive correlation analysis
   */
  async performCorrelationAnalysis(): Promise<void> {
    try {
      this.logger.info('Starting comprehensive correlation analysis...');

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - this.config.analysis.lookbackDays * 24 * 60 * 60 * 1000);

      // Get market conditions and alert performance data
      const [marketConditions, alertPerformanceData] = await Promise.all([
        this.getMarketConditionsForAnalysis(startDate, endDate),
        this.getAlertPerformanceForAnalysis(startDate, endDate)
      ]);

      if (marketConditions.length < this.config.analysis.minSampleSize || alertPerformanceData.length < this.config.analysis.minSampleSize) {
        this.logger.warn('Insufficient data for correlation analysis', {
          marketConditions: marketConditions.length,
          alertPerformance: alertPerformanceData.length,
          minSampleSize: this.config.analysis.minSampleSize
        });
        return;
      }

      // Analyze correlations for each market regime
      const regimes = ['bull', 'bear', 'sideways', 'volatile', 'stable'] as MarketRegime[];

      for (const regime of regimes) {
        try {
          const regimeConditions = marketConditions.filter(c => c.regime === regime);
          if (regimeConditions.length < this.config.analysis.minSampleSize) {
            this.logger.debug('Skipping regime due to insufficient data', { regime, count: regimeConditions.length });
            continue;
          }

          const correlationResults = await this.analyzeRegimeCorrelations(
            regimeConditions,
            alertPerformanceData,
            regime
          );

          // Store results
          for (const result of correlationResults) {
            await this.storeCorrelationResult(result);
          }

          // Emit regime analysis results
          this.emit('regimeAnalysisCompleted', {
            regime,
            results: correlationResults,
            timestamp: new Date()
          });

          this.logger.info('Regime correlation analysis completed', {
            regime,
            correlationsAnalyzed: correlationResults.length
          });

        } catch (error: any) {
          this.logger.error('Error analyzing regime correlations', { regime, error: error.message });
        }
      }

      // Analyze overall correlations (all regimes combined)
      try {
        const overallResults = await this.analyzeRegimeCorrelations(
          marketConditions,
          alertPerformanceData,
          'all' as MarketRegime
        );

        for (const result of overallResults) {
          await this.storeCorrelationResult(result);
        }

        this.logger.info('Overall correlation analysis completed', {
          correlationsAnalyzed: overallResults.length
        });

      } catch (error: any) {
        this.logger.error('Error in overall correlation analysis', error);
      }

      this.metrics.recordMetric('correlation_analysis_completed', 1);
    } catch (error: any) {
      this.logger.error('Failed to perform correlation analysis', error);
      this.metrics.recordMetric('correlation_analysis_errors', 1);
    }
  }

  /**
   * Analyze correlations for a specific market regime
   */
  private async analyzeRegimeCorrelations(
    marketConditions: MarketCondition[],
    alertPerformanceData: any[],
    regime: MarketRegime
  ): Promise<CorrelationResult[]> {
    const results: CorrelationResult[] = [];

    // Get market variables and alert metrics to analyze
    const marketVariables = this.flattenMarketVariables();
    const alertMetrics = this.config.alertMetrics;

    for (const variable of marketVariables) {
      for (const alertMetric of alertMetrics) {
        try {
          const correlation = await this.calculateCorrelation(
            marketConditions,
            alertPerformanceData,
            variable,
            alertMetric,
            regime
          );

          if (correlation) {
            results.push(correlation);
          }
        } catch (error: any) {
          this.logger.error('Error calculating correlation', {
            variable,
            alertMetric,
            regime,
            error: error.message
          });
        }
      }
    }

    return results;
  }

  /**
   * Calculate correlation between market variable and alert metric
   */
  private async calculateCorrelation(
    marketConditions: MarketCondition[],
    alertPerformanceData: any[],
    variable: string,
    alertMetric: string,
    regime: MarketRegime
  ): Promise<CorrelationResult | null> {
    try {
      // Extract paired data points
      const pairedData = this.extractPairedData(marketConditions, alertPerformanceData, variable, alertMetric);

      if (pairedData.length < this.config.analysis.minSampleSize) {
        return null; // Insufficient data
      }

      const marketValues = pairedData.map(d => d.marketValue);
      const alertValues = pairedData.map(d => d.alertValue);

      // Calculate correlation coefficients
      const pearsonCorr = this.config.statisticalTests.pearsonCorrelation ?
        this.calculatePearsonCorrelation(marketValues, alertValues) : 0;
      const spearmanCorr = this.config.statisticalTests.spearmanCorrelation ?
        this.calculateSpearmanCorrelation(marketValues, alertValues) : 0;
      const kendallCorr = this.config.statisticalTests.kendallCorrelation ?
        this.calculateKendallCorrelation(marketValues, alertValues) : 0;

      // Calculate statistical significance
      const significance = this.calculateSignificance(pearsonCorr, pairedData.length);

      // Calculate confidence interval
      const confidenceInterval = this.calculateConfidenceInterval(pearsonCorr, pairedData.length);

      const result: CorrelationResult = {
        variable,
        alertMetric,
        correlation: {
          pearson: pearsonCorr,
          spearman: spearmanCorr,
          kendall: kendallCorr
        },
        significance: {
          pValue: significance.pValue,
          isSignificant: significance.isSignificant,
          confidenceInterval
        },
        sampleSize: pairedData.length,
        regime,
        timeWindow: {
          start: marketConditions[0]?.timestamp || new Date(),
          end: marketConditions[marketConditions.length - 1]?.timestamp || new Date()
        },
        metadata: {
          calculationMethod: 'divine_correlation_analysis_v1',
          lastUpdated: new Date(),
          dataQuality: this.calculateDataQuality(pairedData)
        }
      };

      return result;
    } catch (error: any) {
      this.logger.error('Failed to calculate correlation', { variable, alertMetric, regime, error: error.message });
      return null;
    }
  }

  /**
   * Extract paired data points for correlation analysis
   */
  private extractPairedData(
    marketConditions: MarketCondition[],
    alertPerformanceData: any[],
    variable: string,
    alertMetric: string
  ): Array<{ marketValue: number; alertValue: number; timestamp: Date }> {
    const pairedData: Array<{ marketValue: number; alertValue: number; timestamp: Date }> = [];

    for (const condition of marketConditions) {
      // Extract market variable value
      const marketValue = this.extractVariableValue(condition, variable);

      // Find corresponding alert performance data (simplified - would need proper temporal matching)
      const alertData = alertPerformanceData.find(d =>
        d.timestamp >= condition.timestamp &&
        d.timestamp <= new Date(condition.timestamp.getTime() + 24 * 60 * 60 * 1000)
      );

      if (alertData && marketValue !== null) {
        const alertValue = this.extractAlertMetricValue(alertData, alertMetric);
        if (alertValue !== null) {
          pairedData.push({
            marketValue,
            alertValue,
            timestamp: condition.timestamp
          });
        }
      }
    }

    return pairedData;
  }

  /**
   * Extract value from nested market condition variable
   */
  private extractVariableValue(condition: MarketCondition, variable: string): number | null {
    try {
      const parts = variable.split('.');
      let value: any = condition;

      for (const part of parts) {
        value = value[part];
        if (value === undefined || value === null) {
          return null;
        }
      }

      return typeof value === 'number' ? value : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract alert metric value from performance data
   */
  private extractAlertMetricValue(alertData: any, metric: string): number | null {
    try {
      return typeof alertData[metric] === 'number' ? alertData[metric] : null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculatePearsonCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) {
      return 0;
    }

    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);
    const sumYY = y.reduce((acc, yi) => acc + yi * yi, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

    return denominator === 0 ? 0 : numerator / denominator;
  }

  /**
   * Calculate Spearman rank correlation coefficient
   */
  private calculateSpearmanCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) {
      return 0;
    }

    // Rank the values
    const rankX = this.rankValues(x);
    const rankY = this.rankValues(y);

    // Calculate Pearson correlation on ranks
    return this.calculatePearsonCorrelation(rankX, rankY);
  }

  /**
   * Calculate Kendall tau correlation coefficient
   */
  private calculateKendallCorrelation(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) {
      return 0;
    }

    let concordant = 0;
    let discordant = 0;
    const n = x.length;

    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        const xDiff = x[i] - x[j];
        const yDiff = y[i] - y[j];

        if (xDiff * yDiff > 0) {
          concordant++;
        } else if (xDiff * yDiff < 0) {
          discordant++;
        }
      }
    }

    const totalPairs = (n * (n - 1)) / 2;
    return totalPairs === 0 ? 0 : (concordant - discordant) / totalPairs;
  }

  /**
   * Calculate statistical significance of correlation
   */
  private calculateSignificance(correlation: number, sampleSize: number): {
    pValue: number;
    isSignificant: boolean;
  } {
    // Simplified t-test for correlation significance
    if (sampleSize < 3) {
      return { pValue: 1, isSignificant: false };
    }

    const df = sampleSize - 2; // Degrees of freedom
    const t = Math.abs(correlation) * Math.sqrt(df / (1 - correlation * correlation));

    // Simplified p-value calculation (would use t-distribution in production)
    const pValue = this.calculatePValue(t, df);

    return {
      pValue,
      isSignificant: pValue < this.config.analysis.significanceLevel
    };
  }

  /**
   * Calculate confidence interval for correlation
   */
  private calculateConfidenceInterval(correlation: number, sampleSize: number): [number, number] {
    const alpha = 1 - this.config.analysis.confidenceLevel;
    const z = 1.96; // Z-score for 95% confidence

    if (sampleSize < 3) {
      return [correlation, correlation];
    }

    const se = Math.sqrt((1 - correlation * correlation) / (sampleSize - 2));
    const margin = z * se;

    return [
      Math.max(-1, correlation - margin),
      Math.min(1, correlation + margin)
    ];
  }

  /**
   * Calculate p-value for t-statistic (simplified approximation)
   */
  private calculatePValue(t: number, df: number): number {
    // Simplified p-value calculation using normal approximation for large df
    if (df > 30) {
      const z = t;
      return 2 * (1 - this.normalCDF(Math.abs(z)));
    }

    // For small df, use t-distribution approximation
    // This is a simplified version - production would use proper t-distribution tables
    const normalizedT = t / Math.sqrt(df);
    return 2 * (1 - this.normalCDF(Math.abs(normalizedT)));
  }

  /**
   * Normal cumulative distribution function (approximation)
   */
  private normalCDF(x: number): number {
    // Abramowitz and Stegun approximation
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  /**
   * Rank values for Spearman correlation
   */
  private rankValues(values: number[]): number[] {
    const sorted = [...values].sort((a, b) => a - b);
    const ranks = values.map(val => {
      const index = sorted.indexOf(val);
      return index + 1; // 1-based ranking
    });

    return ranks;
  }

  /**
   * Flatten market variables into array of paths
   */
  private flattenMarketVariables(): string[] {
    const variables: string[] = [];

    for (const [category, vars] of Object.entries(this.config.marketVariables)) {
      for (const variable of vars) {
        variables.push(`${category}.${variable}`);
      }
    }

    return variables;
  }

  /**
   * Calculate data quality score
   */
  private calculateDataQuality(pairedData: Array<{ marketValue: number; alertValue: number; timestamp: Date }>): number {
    if (pairedData.length === 0) return 0;

    let qualityScore = 0;

    // Check for missing values
    const completePairs = pairedData.filter(d => d.marketValue !== null && d.alertValue !== null).length;
    qualityScore += (completePairs / pairedData.length) * 0.4;

    // Check for outliers
    const marketValues = pairedData.map(d => d.marketValue).filter(v => v !== null) as number[];
    const alertValues = pairedData.map(d => d.alertValue).filter(v => v !== null) as number[];

    const marketOutliers = this.detectOutliers(marketValues);
    const alertOutliers = this.detectOutliers(alertValues);

    const marketOutlierRatio = marketOutliers / marketValues.length;
    const alertOutlierRatio = alertOutliers / alertValues.length;

    qualityScore += (1 - (marketOutlierRatio + alertOutlierRatio) / 2) * 0.3;

    // Check temporal consistency
    const timestamps = pairedData.map(d => d.timestamp.getTime());
    const timeGaps = this.calculateTimeGaps(timestamps);
    const avgGap = timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length;

    // Penalize large gaps (more than 1 hour)
    const gapPenalty = Math.max(0, Math.min(1, avgGap / (60 * 60 * 1000)));
    qualityScore += (1 - gapPenalty) * 0.3;

    return Math.max(0, Math.min(1, qualityScore));
  }

  /**
   * Detect outliers using IQR method
   */
  private detectOutliers(values: number[]): number {
    if (values.length < 4) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;

    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return values.filter(v => v < lowerBound || v > upperBound).length;
  }

  /**
   * Calculate time gaps between data points
   */
  private calculateTimeGaps(timestamps: number[]): number[] {
    const gaps: number[] = [];

    for (let i = 1; i < timestamps.length; i++) {
      gaps.push(timestamps[i] - timestamps[i - 1]);
    }

    return gaps;
  }

  /**
   * Get market conditions for analysis
   */
  private async getMarketConditionsForAnalysis(start: Date, end: Date): Promise<MarketCondition[]> {
    // Check cache first
    const cacheKey = `${start.toISOString()}_${end.toISOString()}`;
    const cached = this.marketConditionCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    // Fetch from market tracker
    const conditions = await this.marketTracker.getConditionsForTimeRange(start, end);

    // Cache results
    this.marketConditionCache.set(cacheKey, conditions);

    return conditions;
  }

  /**
   * Get alert performance data for analysis
   */
  private async getAlertPerformanceForAnalysis(start: Date, end: Date): Promise<any[]> {
    try {
      // Query alert performance data from database
      // This would integrate with the existing alert performance analytics system
      const { rows } = await this.db.query(`
        SELECT
          rule_id,
          instrument,
          timestamp,
          success_rate,
          false_positive_rate,
          win_rate,
          average_roi,
          sharpe_ratio,
          sample_size
        FROM alert_performance_metrics
        WHERE timestamp BETWEEN $1 AND $2
        ORDER BY timestamp ASC
      `, [start, end]);

      return rows.map(row => ({
        ruleId: row.rule_id,
        instrument: row.instrument,
        timestamp: row.timestamp,
        successRate: parseFloat(row.success_rate) || 0,
        falsePositiveRate: parseFloat(row.false_positive_rate) || 0,
        winRate: parseFloat(row.win_rate) || 0,
        averageROI: parseFloat(row.average_roi) || 0,
        sharpeRatio: parseFloat(row.sharpe_ratio) || 0,
        sampleSize: parseInt(row.sample_size) || 0
      }));
    } catch (error: any) {
      this.logger.error('Failed to get alert performance data', error);
      return [];
    }
  }

  /**
   * Store correlation result in database
   */
  private async storeCorrelationResult(result: CorrelationResult): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO correlation_analysis_results (
          variable, alert_metric, regime, correlation_data, significance_data,
          sample_size, time_window_start, time_window_end, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        result.variable,
        result.alertMetric,
        result.regime,
        JSON.stringify(result.correlation),
        JSON.stringify(result.significance),
        result.sampleSize,
        result.timeWindow.start,
        result.timeWindow.end,
        JSON.stringify(result.metadata)
      ]);

      // Update cache
      const cacheKey = `${result.variable}_${result.alertMetric}_${result.regime}`;
      this.correlationCache.set(cacheKey, result);

    } catch (error: any) {
      this.logger.error('Failed to store correlation result', error);
    }
  }

  /**
   * Get correlation results for a specific regime
   */
  async getRegimeCorrelations(regime: MarketRegime): Promise<CorrelationResult[]> {
    try {
      const { rows } = await this.db.query(`
        SELECT * FROM correlation_analysis_results
        WHERE regime = $1
        ORDER BY created_at DESC
      `, [regime]);

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
      this.logger.error('Failed to get regime correlations', error);
      return [];
    }
  }

  /**
   * Get correlation analysis summary
   */
  async getCorrelationSummary(timeWindow?: { start: Date; end: Date }): Promise<{
    totalAnalyses: number;
    significantCorrelations: number;
    strongestCorrelations: CorrelationResult[];
    regimeBreakdown: Record<MarketRegime, number>;
  }> {
    try {
      let whereClause = '';
      const params: any[] = [];

      if (timeWindow) {
        whereClause = 'WHERE time_window_start >= $1 AND time_window_end <= $2';
        params.push(timeWindow.start, timeWindow.end);
      }

      const { rows } = await this.db.query(`
        SELECT * FROM correlation_analysis_results
        ${whereClause}
        ORDER BY created_at DESC
      `, params);

      const results = rows.map(row => ({
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

      // Calculate summary statistics
      const significantCorrelations = results.filter(r => r.significance.isSignificant);
      const totalAnalyses = results.length;

      // Get strongest correlations (by absolute value)
      const strongestCorrelations = results
        .sort((a, b) => Math.abs(b.correlation.pearson) - Math.abs(a.correlation.pearson))
        .slice(0, 10);

      // Calculate regime breakdown
      const regimeBreakdown: Record<MarketRegime, number> = {
        bull: 0,
        bear: 0,
        sideways: 0,
        volatile: 0,
        stable: 0,
        crash: 0,
        recovery: 0
      };

      for (const result of results) {
        regimeBreakdown[result.regime]++;
      }

      return {
        totalAnalyses,
        significantCorrelations: significantCorrelations.length,
        strongestCorrelations,
        regimeBreakdown
      };
    } catch (error: any) {
      this.logger.error('Failed to get correlation summary', error);
      return {
        totalAnalyses: 0,
        significantCorrelations: 0,
        strongestCorrelations: [],
        regimeBreakdown: {
          bull: 0,
          bear: 0,
          sideways: 0,
          volatile: 0,
          stable: 0,
          crash: 0,
          recovery: 0
        }
      };
    }
  }

  /**
   * Get system health status
   */
  getHealthStatus(): {
    initialized: boolean;
    lastAnalysis: Date | null;
    cacheSize: number;
    errorCount: number;
  } {
    const lastAnalysis = Array.from(this.correlationCache.values())
      .sort((a, b) => b.metadata.lastUpdated.getTime() - a.metadata.lastUpdated.getTime())[0]?.metadata.lastUpdated || null;

    return {
      initialized: this.isInitialized,
      lastAnalysis,
      cacheSize: this.correlationCache.size,
      errorCount: this.metrics.getMetric('correlation_analysis_errors') || 0
    };
  }
}
