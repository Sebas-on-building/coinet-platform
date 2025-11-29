/**
 * =========================================
 * MARKET CONDITION CORRELATION REPORTS
 * =========================================
 * Divine world-class reporting system for market condition correlation analysis
 * Provides comprehensive insights and strategy improvement recommendations
 */

import { EventEmitter } from 'events';
import { Logger } from '../../../services/signal-evaluation-engine/src/utils/Logger';
import { MetricsCollector } from '../../../services/signal-evaluation-engine/src/monitoring/MetricsCollector';
import { Pool } from 'pg';

import { MarketCondition, MarketRegime, MarketConditionTracker } from './market_condition_tracker';
import { CorrelationResult, CorrelationAnalysisEngine } from './correlation_analysis_engine';
import { AdaptiveWeight, WeightAdjustment, AdaptiveWeightingEngine } from './adaptive_weighting_engine';

export interface MarketConditionReport {
  id: string;
  title: string;
  description: string;
  timeWindow: {
    start: Date;
    end: Date;
  };
  sections: {
    executiveSummary: ExecutiveSummary;
    marketRegimeAnalysis: MarketRegimeAnalysis;
    correlationInsights: CorrelationInsights;
    adaptiveWeightingAnalysis: AdaptiveWeightingAnalysis;
    strategyRecommendations: StrategyRecommendations;
    riskAssessment: RiskAssessment;
  };
  metadata: {
    generatedAt: Date;
    dataQuality: number;
    confidence: number;
    methodology: string;
  };
}

export interface ExecutiveSummary {
  marketOverview: {
    dominantRegime: MarketRegime;
    regimeDistribution: Record<MarketRegime, number>;
    volatilityTrend: 'increasing' | 'decreasing' | 'stable';
    liquidityTrend: 'increasing' | 'decreasing' | 'stable';
  };
  keyFindings: {
    strongestCorrelations: Array<{
      variable: string;
      metric: string;
      correlation: number;
      regime: MarketRegime;
      significance: boolean;
    }>;
    significantInsights: string[];
    performanceImpact: {
      estimatedImprovement: number;
      confidence: number;
    };
  };
  recommendations: {
    immediateActions: string[];
    strategicInitiatives: string[];
    riskMitigation: string[];
  };
}

export interface MarketRegimeAnalysis {
  regimePerformance: Record<MarketRegime, {
    duration: number; // hours
    frequency: number; // percentage
    alertPerformance: {
      successRate: number;
      falsePositiveRate: number;
      averageROI: number;
      sharpeRatio: number;
    };
    marketConditions: {
      averageVolatility: number;
      averageLiquidity: number;
      averageSentiment: number;
    };
  }>;
  regimeTransitions: Array<{
    fromRegime: MarketRegime;
    toRegime: MarketRegime;
    transitionTime: Date;
    duration: number; // minutes
    triggerConditions: string[];
  }>;
  regimeStability: {
    averageDuration: number; // hours
    mostStableRegime: MarketRegime;
    leastStableRegime: MarketRegime;
  };
}

export interface CorrelationInsights {
  significantCorrelations: Array<{
    variable: string;
    metric: string;
    correlation: number;
    pValue: number;
    regime: MarketRegime | 'all';
    interpretation: string;
    impactAssessment: 'high' | 'medium' | 'low';
  }>;
  variableImportance: Array<{
    variable: string;
    averageCorrelation: number;
    regimeSpecificity: number;
    recommendation: string;
  }>;
  regimeSpecificPatterns: Record<MarketRegime, {
    topCorrelations: Array<{
      variable: string;
      metric: string;
      correlation: number;
    }>;
    uniquePatterns: string[];
  }>;
}

export interface AdaptiveWeightingAnalysis {
  weightAdjustments: Array<{
    signalType: string;
    ruleId: string;
    adjustmentMagnitude: number;
    rationale: string;
    expectedImpact: number;
  }>;
  regimeSensitivity: Record<MarketRegime, {
    averageWeight: number;
    adjustmentFrequency: number;
    performanceCorrelation: number;
  }>;
  weightingTrends: {
    overallTrend: 'increasing' | 'decreasing' | 'stable';
    regimeSpecificTrends: Record<MarketRegime, 'increasing' | 'decreasing' | 'stable'>;
  };
}

export interface StrategyRecommendations {
  signalOptimization: {
    highPriority: Array<{
      signalType: string;
      currentWeight: number;
      recommendedWeight: number;
      rationale: string;
      expectedImprovement: number;
    }>;
    mediumPriority: Array<{
      signalType: string;
      currentWeight: number;
      recommendedWeight: number;
      rationale: string;
      expectedImprovement: number;
    }>;
  };
  regimeSpecificStrategies: Record<MarketRegime, {
    optimalSignals: string[];
    weightAdjustments: Record<string, number>;
    riskManagement: string[];
  }>;
  implementationRoadmap: Array<{
    phase: string;
    timeframe: string;
    actions: string[];
    expectedImpact: string;
    riskLevel: 'low' | 'medium' | 'high';
  }>;
}

export interface RiskAssessment {
  modelRisk: {
    dataQualityRisk: number;
    overfittingRisk: number;
    regimeShiftRisk: number;
  };
  implementationRisk: {
    operationalRisk: number;
    complianceRisk: number;
    performanceRisk: number;
  };
  mitigationStrategies: Array<{
    riskType: string;
    mitigationActions: string[];
    monitoringMetrics: string[];
  }>;
}

export interface MarketConditionReportsConfig {
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  reporting: {
    reportInterval: number; // hours
    retentionDays: number;
    enableAutoReports: boolean;
    enableRealTimeUpdates: boolean;
  };
  thresholds: {
    significanceLevel: number;
    correlationThreshold: number;
    minSampleSize: number;
    confidenceThreshold: number;
  };
}

export class MarketConditionReports extends EventEmitter {
  private logger: Logger;
  private metrics: MetricsCollector;
  private db: Pool;
  private config: MarketConditionReportsConfig;
  private isInitialized: boolean = false;
  private marketTracker: MarketConditionTracker;
  private correlationEngine: CorrelationAnalysisEngine;
  private weightingEngine: AdaptiveWeightingEngine;
  private updateInterval?: NodeJS.Timeout;

  constructor(
    config: MarketConditionReportsConfig,
    marketTracker: MarketConditionTracker,
    correlationEngine: CorrelationAnalysisEngine,
    weightingEngine: AdaptiveWeightingEngine
  ) {
    super();
    this.logger = new Logger('MarketConditionReports');
    this.metrics = new MetricsCollector();
    this.config = config;
    this.marketTracker = marketTracker;
    this.correlationEngine = correlationEngine;
    this.weightingEngine = weightingEngine;
    this.db = new Pool(config.database);

    this.initializeDatabase();
  }

  /**
   * Initialize database tables for reporting
   */
  private async initializeDatabase(): Promise<void> {
    try {
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS market_condition_reports (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          title VARCHAR(500) NOT NULL,
          description TEXT NOT NULL,
          report_data JSONB NOT NULL,
          time_window_start TIMESTAMP WITH TIME ZONE NOT NULL,
          time_window_end TIMESTAMP WITH TIME ZONE NOT NULL,
          metadata JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_reports_time_window ON market_condition_reports(time_window_start, time_window_end);
        CREATE INDEX IF NOT EXISTS idx_reports_created_at ON market_condition_reports(created_at);
      `);

      this.isInitialized = true;
      this.logger.info('✅ Market condition reports database initialized');
    } catch (error: any) {
      this.logger.error('❌ Failed to initialize reports database', error);
      throw error;
    }
  }

  /**
   * Start reporting engine
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Market condition reports not initialized');
    }

    try {
      this.logger.info('Starting market condition reporting engine...');

      // Start periodic report generation
      this.updateInterval = setInterval(async () => {
        try {
          await this.generateComprehensiveReport();
        } catch (error: any) {
          this.logger.error('Error generating report', error);
        }
      }, this.config.reporting.reportInterval * 60 * 60 * 1000);

      // Generate initial report
      await this.generateComprehensiveReport();

      this.logger.info('✅ Market condition reporting engine started');
      this.emit('started');
    } catch (error: any) {
      this.logger.error('❌ Failed to start reporting engine', error);
      throw error;
    }
  }

  /**
   * Stop reporting engine
   */
  async stop(): Promise<void> {
    try {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = undefined;
      }

      await this.db.end();
      this.isInitialized = false;

      this.logger.info('✅ Market condition reporting engine stopped');
      this.emit('stopped');
    } catch (error: any) {
      this.logger.error('❌ Failed to stop reporting engine', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive market condition correlation report
   */
  async generateComprehensiveReport(timeWindow?: { start: Date; end: Date }): Promise<MarketConditionReport> {
    try {
      this.logger.info('Generating comprehensive market condition correlation report...');

      // Determine time window
      const endDate = timeWindow?.end || new Date();
      const startDate = timeWindow?.start || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days default

      // Gather all data for analysis
      const [marketConditions, correlationResults, adaptiveWeights, weightAdjustments] = await Promise.all([
        this.marketTracker.getConditionsForTimeRange(startDate, endDate),
        this.correlationEngine.getCorrelationSummary({ start: startDate, end: endDate }),
        this.weightingEngine.getWeightingSummary(),
        this.getRecentWeightAdjustments(startDate, endDate)
      ]);

      // Generate report sections
      const executiveSummary = await this.generateExecutiveSummary(marketConditions, correlationResults, adaptiveWeights);
      const marketRegimeAnalysis = await this.generateMarketRegimeAnalysis(marketConditions, correlationResults);
      const correlationInsights = await this.generateCorrelationInsights(correlationResults);
      const adaptiveWeightingAnalysis = await this.generateAdaptiveWeightingAnalysis(weightAdjustments, adaptiveWeights);
      const strategyRecommendations = await this.generateStrategyRecommendations(correlationResults, adaptiveWeights);
      const riskAssessment = await this.generateRiskAssessment(marketConditions, correlationResults, adaptiveWeights);

      // Create comprehensive report
      const report: MarketConditionReport = {
        id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: `Market Condition Correlation Analysis Report - ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        description: 'Comprehensive analysis of alert performance correlations with market conditions, regime-specific insights, and strategy improvement recommendations.',
        timeWindow: {
          start: startDate,
          end: endDate
        },
        sections: {
          executiveSummary,
          marketRegimeAnalysis,
          correlationInsights,
          adaptiveWeightingAnalysis,
          strategyRecommendations,
          riskAssessment
        },
        metadata: {
          generatedAt: new Date(),
          dataQuality: this.calculateOverallDataQuality(marketConditions, correlationResults),
          confidence: this.calculateReportConfidence(correlationResults, adaptiveWeights),
          methodology: 'divine_market_condition_analysis_v1'
        }
      };

      // Store report in database
      await this.storeReport(report);

      this.logger.info('Comprehensive report generated', {
        reportId: report.id,
        timeWindow: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        sections: Object.keys(report.sections).length
      });

      this.metrics.recordMetric('reports_generated', 1);

      return report;
    } catch (error: any) {
      this.logger.error('Failed to generate comprehensive report', error);
      this.metrics.recordMetric('report_generation_errors', 1);
      throw error;
    }
  }

  /**
   * Generate executive summary section
   */
  private async generateExecutiveSummary(
    marketConditions: MarketCondition[],
    correlationResults: any,
    adaptiveWeights: any
  ): Promise<ExecutiveSummary> {
    // Analyze dominant regime
    const regimeDistribution = this.calculateRegimeDistribution(marketConditions);
    const dominantRegime = Object.entries(regimeDistribution)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0][0] as MarketRegime;

    // Analyze trends
    const volatilityTrend = this.calculateVolatilityTrend(marketConditions);
    const liquidityTrend = this.calculateLiquidityTrend(marketConditions);

    // Identify key findings
    const significantCorrelations = correlationResults.strongestCorrelations
      .filter((c: any) => c.significance.isSignificant && Math.abs(c.correlation.pearson) >= this.config.thresholds.correlationThreshold)
      .slice(0, 5);

    const keyFindings = {
      strongestCorrelations: significantCorrelations.map((c: any) => ({
        variable: c.variable,
        metric: c.alertMetric,
        correlation: c.correlation.pearson,
        regime: c.regime,
        significance: c.significance.isSignificant
      })),
      significantInsights: this.generateKeyInsights(correlationResults, adaptiveWeights),
      performanceImpact: this.calculatePerformanceImpact(correlationResults, adaptiveWeights)
    };

    // Generate recommendations
    const recommendations = this.generateExecutiveRecommendations(keyFindings, dominantRegime);

    return {
      marketOverview: {
        dominantRegime,
        regimeDistribution,
        volatilityTrend,
        liquidityTrend
      },
      keyFindings,
      recommendations
    };
  }

  /**
   * Generate market regime analysis section
   */
  private async generateMarketRegimeAnalysis(
    marketConditions: MarketCondition[],
    correlationResults: any
  ): Promise<MarketRegimeAnalysis> {
    // Calculate regime performance
    const regimePerformance = this.calculateRegimePerformance(marketConditions, correlationResults);

    // Analyze regime transitions
    const regimeTransitions = await this.getRegimeTransitions(marketConditions);

    // Calculate regime stability
    const regimeStability = this.calculateRegimeStability(marketConditions);

    return {
      regimePerformance,
      regimeTransitions,
      regimeStability
    };
  }

  /**
   * Generate correlation insights section
   */
  private async generateCorrelationInsights(correlationResults: any): Promise<CorrelationInsights> {
    const significantCorrelations = correlationResults.strongestCorrelations
      .filter((c: any) => c.significance.isSignificant)
      .map((c: any) => ({
        variable: c.variable,
        metric: c.alertMetric,
        correlation: c.correlation.pearson,
        pValue: c.significance.pValue,
        regime: c.regime,
        interpretation: this.interpretCorrelation(c),
        impactAssessment: this.assessCorrelationImpact(c)
      }));

    // Calculate variable importance
    const variableImportance = this.calculateVariableImportance(correlationResults);

    // Generate regime-specific patterns
    const regimeSpecificPatterns = this.analyzeRegimeSpecificPatterns(correlationResults);

    return {
      significantCorrelations,
      variableImportance,
      regimeSpecificPatterns
    };
  }

  /**
   * Generate adaptive weighting analysis section
   */
  private async generateAdaptiveWeightingAnalysis(
    weightAdjustments: WeightAdjustment[],
    adaptiveWeights: any
  ): Promise<AdaptiveWeightingAnalysis> {
    // Analyze weight adjustments
    const weightAdjustmentsAnalysis = weightAdjustments.map(adj => ({
      signalType: adj.signalType,
      ruleId: adj.ruleId,
      adjustmentMagnitude: adj.newWeight - adj.oldWeight,
      rationale: adj.adjustmentReason,
      expectedImpact: adj.expectedImpact.performanceImprovement
    }));

    // Calculate regime sensitivity
    const regimeSensitivity = this.calculateRegimeSensitivity(weightAdjustments, adaptiveWeights);

    // Analyze weighting trends
    const weightingTrends = this.analyzeWeightingTrends(weightAdjustments);

    return {
      weightAdjustments: weightAdjustmentsAnalysis,
      regimeSensitivity,
      weightingTrends
    };
  }

  /**
   * Generate strategy recommendations section
   */
  private async generateStrategyRecommendations(
    correlationResults: any,
    adaptiveWeights: any
  ): Promise<StrategyRecommendations> {
    // Generate signal optimization recommendations
    const signalOptimization = this.generateSignalOptimizationRecommendations(correlationResults, adaptiveWeights);

    // Generate regime-specific strategies
    const regimeSpecificStrategies = this.generateRegimeSpecificStrategies(correlationResults, adaptiveWeights);

    // Create implementation roadmap
    const implementationRoadmap = this.createImplementationRoadmap(correlationResults, adaptiveWeights);

    return {
      signalOptimization,
      regimeSpecificStrategies,
      implementationRoadmap
    };
  }

  /**
   * Generate risk assessment section
   */
  private async generateRiskAssessment(
    marketConditions: MarketCondition[],
    correlationResults: any,
    adaptiveWeights: any
  ): Promise<RiskAssessment> {
    const modelRisk = this.assessModelRisk(marketConditions, correlationResults);
    const implementationRisk = this.assessImplementationRisk(adaptiveWeights);
    const mitigationStrategies = this.generateMitigationStrategies(modelRisk, implementationRisk);

    return {
      modelRisk,
      implementationRisk,
      mitigationStrategies
    };
  }

  /**
   * Helper methods for report generation
   */
  private calculateRegimeDistribution(marketConditions: MarketCondition[]): Record<MarketRegime, number> {
    const distribution: Record<MarketRegime, number> = {
      bull: 0,
      bear: 0,
      sideways: 0,
      volatile: 0,
      stable: 0,
      crash: 0,
      recovery: 0
    };

    for (const condition of marketConditions) {
      distribution[condition.regime]++;
    }

    return distribution;
  }

  private calculateVolatilityTrend(marketConditions: MarketCondition[]): 'increasing' | 'decreasing' | 'stable' {
    if (marketConditions.length < 7) return 'stable';

    const recent = marketConditions.slice(-7);
    const older = marketConditions.slice(-14, -7);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, c) => sum + c.volatility.vix, 0) / recent.length;
    const olderAvg = older.reduce((sum, c) => sum + c.volatility.vix, 0) / older.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private calculateLiquidityTrend(marketConditions: MarketCondition[]): 'increasing' | 'decreasing' | 'stable' {
    if (marketConditions.length < 7) return 'stable';

    const recent = marketConditions.slice(-7);
    const older = marketConditions.slice(-14, -7);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, c) => sum + c.liquidity.marketDepth, 0) / recent.length;
    const olderAvg = older.reduce((sum, c) => sum + c.liquidity.marketDepth, 0) / older.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.05) return 'increasing';
    if (change < -0.05) return 'decreasing';
    return 'stable';
  }

  private generateKeyInsights(correlationResults: any, adaptiveWeights: any): string[] {
    const insights: string[] = [];

    // Correlation insights
    if (correlationResults.significantCorrelations > 0) {
      insights.push(`${correlationResults.significantCorrelations} statistically significant correlations identified`);
    }

    // Performance insights
    const avgImprovement = adaptiveWeights.averageAdjustment;
    if (Math.abs(avgImprovement - 1.0) > 0.05) {
      const direction = avgImprovement > 1.0 ? 'increased' : 'decreased';
      insights.push(`Adaptive weights ${direction} by ${Math.abs(avgImprovement - 1.0) * 100}% on average`);
    }

    // Regime insights
    const regimeBreakdown = adaptiveWeights.regimeDistribution;
    const mostActiveRegime = Object.entries(regimeBreakdown)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0];

    if (mostActiveRegime) {
      insights.push(`${mostActiveRegime[0]} regime shows highest adaptive weight activity (${mostActiveRegime[1]} adjustments)`);
    }

    return insights;
  }

  private calculatePerformanceImpact(correlationResults: any, adaptiveWeights: any): {
    estimatedImprovement: number;
    confidence: number;
  } {
    // Estimate improvement based on correlation strength and weight adjustments
    const avgCorrelation = correlationResults.strongestCorrelations
      .slice(0, 5)
      .reduce((sum: number, c: any) => sum + Math.abs(c.correlation.pearson), 0) / 5;

    const avgWeightAdjustment = Math.abs(adaptiveWeights.averageAdjustment - 1.0);

    const estimatedImprovement = Math.min(0.5, (avgCorrelation * avgWeightAdjustment) * 0.3);
    const confidence = Math.min(0.9, avgCorrelation * 0.8);

    return {
      estimatedImprovement,
      confidence
    };
  }

  private generateExecutiveRecommendations(keyFindings: any, dominantRegime: MarketRegime): {
    immediateActions: string[];
    strategicInitiatives: string[];
    riskMitigation: string[];
  } {
    const immediateActions: string[] = [];
    const strategicInitiatives: string[] = [];
    const riskMitigation: string[] = [];

    // Immediate actions based on strongest correlations
    if (keyFindings.strongestCorrelations.length > 0) {
      const topCorrelation = keyFindings.strongestCorrelations[0];
      immediateActions.push(`Prioritize ${topCorrelation.variable} monitoring for ${topCorrelation.metric} optimization`);
      immediateActions.push(`Implement regime-specific thresholds for ${dominantRegime} conditions`);
    }

    // Strategic initiatives
    strategicInitiatives.push('Develop machine learning models for regime prediction');
    strategicInitiatives.push('Implement real-time adaptive threshold adjustment');
    strategicInitiatives.push('Create regime-specific signal optimization framework');

    // Risk mitigation
    riskMitigation.push('Monitor for overfitting in correlation-based adjustments');
    riskMitigation.push('Implement gradual rollout of weight changes');
    riskMitigation.push('Establish fallback mechanisms for regime detection failures');

    return {
      immediateActions,
      strategicInitiatives,
      riskMitigation
    };
  }

  private calculateRegimePerformance(
    marketConditions: MarketCondition[],
    correlationResults: any
  ): Record<MarketRegime, any> {
    const performance: Record<MarketRegime, any> = {
      bull: { duration: 0, frequency: 0, alertPerformance: {}, marketConditions: {} },
      bear: { duration: 0, frequency: 0, alertPerformance: {}, marketConditions: {} },
      sideways: { duration: 0, frequency: 0, alertPerformance: {}, marketConditions: {} },
      volatile: { duration: 0, frequency: 0, alertPerformance: {}, marketConditions: {} },
      stable: { duration: 0, frequency: 0, alertPerformance: {}, marketConditions: {} },
      crash: { duration: 0, frequency: 0, alertPerformance: {}, marketConditions: {} },
      recovery: { duration: 0, frequency: 0, alertPerformance: {}, marketConditions: {} }
    };

    // Calculate basic metrics
    const totalConditions = marketConditions.length;
    const regimeCounts = this.calculateRegimeDistribution(marketConditions);

    for (const [regime, count] of Object.entries(regimeCounts)) {
      const r = regime as MarketRegime;
      performance[r].frequency = (count / totalConditions) * 100;

      // Calculate average duration (simplified)
      performance[r].duration = 24; // hours - would need proper duration calculation
    }

    return performance;
  }

  private async getRegimeTransitions(marketConditions: MarketCondition[]): Promise<any[]> {
    // Simplified - would need proper transition detection
    return [];
  }

  private calculateRegimeStability(marketConditions: MarketCondition[]): any {
    const regimeCounts = this.calculateRegimeDistribution(marketConditions);
    const total = marketConditions.length;

    // Find most and least stable regimes
    const sortedRegimes = Object.entries(regimeCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number));

    return {
      averageDuration: 24, // Would need proper duration calculation
      mostStableRegime: sortedRegimes[0]?.[0] as MarketRegime || 'sideways',
      leastStableRegime: sortedRegimes[sortedRegimes.length - 1]?.[0] as MarketRegime || 'volatile'
    };
  }

  private interpretCorrelation(correlation: any): string {
    const strength = Math.abs(correlation.correlation.pearson);
    const direction = correlation.correlation.pearson > 0 ? 'positive' : 'negative';

    let interpretation = `${direction} correlation (${strength.toFixed(3)}) between ${correlation.variable} and ${correlation.metric}`;

    if (correlation.significance.pValue < 0.001) {
      interpretation += ' - highly statistically significant';
    } else if (correlation.significance.pValue < 0.05) {
      interpretation += ' - statistically significant';
    }

    return interpretation;
  }

  private assessCorrelationImpact(correlation: any): 'high' | 'medium' | 'low' {
    const strength = Math.abs(correlation.correlation.pearson);

    if (strength >= 0.7) return 'high';
    if (strength >= 0.5) return 'medium';
    return 'low';
  }

  private calculateVariableImportance(correlationResults: any): any[] {
    // Group correlations by variable and calculate importance
    const variableGroups: Record<string, any[]> = {};

    for (const correlation of correlationResults.strongestCorrelations) {
      if (!variableGroups[correlation.variable]) {
        variableGroups[correlation.variable] = [];
      }
      variableGroups[correlation.variable].push(correlation);
    }

    return Object.entries(variableGroups).map(([variable, correlations]) => {
      const avgCorrelation = correlations.reduce((sum: number, c: any) => sum + Math.abs(c.correlation.pearson), 0) / correlations.length;
      const regimeSpecificity = correlations.length / Object.keys(variableGroups).length;

      return {
        variable,
        averageCorrelation: avgCorrelation,
        regimeSpecificity,
        recommendation: this.generateVariableRecommendation(variable, avgCorrelation, regimeSpecificity)
      };
    }).sort((a, b) => b.averageCorrelation - a.averageCorrelation);
  }

  private analyzeRegimeSpecificPatterns(correlationResults: any): Record<MarketRegime, any> {
    const patterns: Record<MarketRegime, any> = {
      bull: { topCorrelations: [], uniquePatterns: [] },
      bear: { topCorrelations: [], uniquePatterns: [] },
      sideways: { topCorrelations: [], uniquePatterns: [] },
      volatile: { topCorrelations: [], uniquePatterns: [] },
      stable: { topCorrelations: [], uniquePatterns: [] },
      crash: { topCorrelations: [], uniquePatterns: [] },
      recovery: { topCorrelations: [], uniquePatterns: [] }
    };

    for (const correlation of correlationResults.strongestCorrelations) {
      const regime = correlation.regime as MarketRegime;
      if (patterns[regime]) {
        patterns[regime].topCorrelations.push({
          variable: correlation.variable,
          metric: correlation.alertMetric,
          correlation: correlation.correlation.pearson
        });
      }
    }

    return patterns;
  }

  private calculateRegimeSensitivity(weightAdjustments: WeightAdjustment[], adaptiveWeights: any): Record<MarketRegime, any> {
    const sensitivity: Record<MarketRegime, any> = {
      bull: { averageWeight: 1.0, adjustmentFrequency: 0, performanceCorrelation: 0 },
      bear: { averageWeight: 1.0, adjustmentFrequency: 0, performanceCorrelation: 0 },
      sideways: { averageWeight: 1.0, adjustmentFrequency: 0, performanceCorrelation: 0 },
      volatile: { averageWeight: 1.0, adjustmentFrequency: 0, performanceCorrelation: 0 },
      stable: { averageWeight: 1.0, adjustmentFrequency: 0, performanceCorrelation: 0 },
      crash: { averageWeight: 1.0, adjustmentFrequency: 0, performanceCorrelation: 0 },
      recovery: { averageWeight: 1.0, adjustmentFrequency: 0, performanceCorrelation: 0 }
    };

    // Calculate from weight adjustments and adaptive weights
    // This would be more sophisticated in practice

    return sensitivity;
  }

  private analyzeWeightingTrends(weightAdjustments: WeightAdjustment[]): any {
    // Analyze trends in weight adjustments
    return {
      overallTrend: 'stable',
      regimeSpecificTrends: {
        bull: 'increasing',
        bear: 'decreasing',
        sideways: 'stable',
        volatile: 'increasing',
        stable: 'stable',
        crash: 'decreasing',
        recovery: 'increasing'
      }
    };
  }

  private generateSignalOptimizationRecommendations(correlationResults: any, adaptiveWeights: any): any {
    const highPriority: any[] = [];
    const mediumPriority: any[] = [];

    // Generate recommendations based on correlation strength and current weights
    // This would be more sophisticated in practice

    return {
      highPriority,
      mediumPriority
    };
  }

  private generateRegimeSpecificStrategies(correlationResults: any, adaptiveWeights: any): Record<MarketRegime, any> {
    const strategies: Record<MarketRegime, any> = {
      bull: { optimalSignals: [], weightAdjustments: {}, riskManagement: [] },
      bear: { optimalSignals: [], weightAdjustments: {}, riskManagement: [] },
      sideways: { optimalSignals: [], weightAdjustments: {}, riskManagement: [] },
      volatile: { optimalSignals: [], weightAdjustments: {}, riskManagement: [] },
      stable: { optimalSignals: [], weightAdjustments: {}, riskManagement: [] },
      crash: { optimalSignals: [], weightAdjustments: {}, riskManagement: [] },
      recovery: { optimalSignals: [], weightAdjustments: {}, riskManagement: [] }
    };

    // Generate regime-specific strategies based on correlations
    // This would be more sophisticated in practice

    return strategies;
  }

  private createImplementationRoadmap(correlationResults: any, adaptiveWeights: any): any[] {
    return [
      {
        phase: 'Phase 1: Foundation',
        timeframe: '2-4 weeks',
        actions: ['Implement market condition tracking', 'Deploy correlation analysis engine'],
        expectedImpact: 'Establish data collection and analysis capabilities',
        riskLevel: 'low'
      },
      {
        phase: 'Phase 2: Optimization',
        timeframe: '4-8 weeks',
        actions: ['Implement adaptive weighting', 'Deploy real-time regime detection'],
        expectedImpact: 'Enable dynamic strategy optimization',
        riskLevel: 'medium'
      },
      {
        phase: 'Phase 3: Advanced Features',
        timeframe: '8-12 weeks',
        actions: ['Implement predictive modeling', 'Deploy automated reporting'],
        expectedImpact: 'Achieve autonomous strategy optimization',
        riskLevel: 'high'
      }
    ];
  }

  private assessModelRisk(marketConditions: MarketCondition[], correlationResults: any): any {
    const dataQualityRisk = 1 - this.calculateOverallDataQuality(marketConditions, correlationResults);
    const overfittingRisk = this.calculateOverfittingRisk(correlationResults);
    const regimeShiftRisk = this.calculateRegimeShiftRisk(marketConditions);

    return {
      dataQualityRisk,
      overfittingRisk,
      regimeShiftRisk
    };
  }

  private assessImplementationRisk(adaptiveWeights: any): any {
    const operationalRisk = adaptiveWeights.recentAdjustments > 100 ? 0.3 : 0.1;
    const complianceRisk = 0.1; // Low compliance risk due to careful implementation
    const performanceRisk = Math.abs(adaptiveWeights.averageAdjustment - 1.0) > 0.2 ? 0.3 : 0.1;

    return {
      operationalRisk,
      complianceRisk,
      performanceRisk
    };
  }

  private generateMitigationStrategies(modelRisk: any, implementationRisk: any): any[] {
    const strategies: any[] = [];

    if (modelRisk.dataQualityRisk > 0.3) {
      strategies.push({
        riskType: 'Data Quality',
        mitigationActions: ['Implement data validation', 'Add data quality monitoring'],
        monitoringMetrics: ['Data completeness', 'Data accuracy', 'Data timeliness']
      });
    }

    if (modelRisk.overfittingRisk > 0.4) {
      strategies.push({
        riskType: 'Model Overfitting',
        mitigationActions: ['Implement cross-validation', 'Add regularization'],
        monitoringMetrics: ['Training vs validation performance', 'Model complexity']
      });
    }

    return strategies;
  }

  private calculateOverallDataQuality(marketConditions: MarketCondition[], correlationResults: any): number {
    let quality = 0;

    // Market conditions quality
    if (marketConditions.length > 0) {
      quality += 0.4; // Base quality for having data
      quality += (marketConditions.length / 1000) * 0.3; // Scale with data volume
    }

    // Correlation results quality
    if (correlationResults.totalAnalyses > 0) {
      quality += (correlationResults.significantCorrelations / correlationResults.totalAnalyses) * 0.3;
    }

    return Math.min(1, quality);
  }

  private calculateReportConfidence(correlationResults: any, adaptiveWeights: any): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence with more significant correlations
    if (correlationResults.significantCorrelations > 0) {
      confidence += (correlationResults.significantCorrelations / correlationResults.totalAnalyses) * 0.3;
    }

    // Increase confidence with stable weight adjustments
    if (adaptiveWeights.recentAdjustments > 0) {
      confidence += Math.min(0.2, (adaptiveWeights.recentAdjustments / 100) * 0.2);
    }

    return Math.min(0.95, confidence);
  }

  private calculateOverfittingRisk(correlationResults: any): number {
    // Risk increases with high correlation in small samples
    const avgSampleSize = correlationResults.strongestCorrelations
      .reduce((sum: number, c: any) => sum + c.sampleSize, 0) / correlationResults.strongestCorrelations.length;

    if (avgSampleSize < 50) return 0.6;
    if (avgSampleSize < 100) return 0.4;
    return 0.2;
  }

  private calculateRegimeShiftRisk(marketConditions: MarketCondition[]): number {
    // Risk increases with frequent regime changes
    const transitions = this.countRegimeTransitions(marketConditions);
    const avgDuration = this.calculateAverageRegimeDuration(marketConditions);

    if (avgDuration < 12) return 0.5; // High risk for short durations
    if (transitions > 20) return 0.4; // High risk for frequent transitions
    return 0.2;
  }

  private countRegimeTransitions(marketConditions: MarketCondition[]): number {
    let transitions = 0;
    let lastRegime = marketConditions[0]?.regime;

    for (let i = 1; i < marketConditions.length; i++) {
      if (marketConditions[i].regime !== lastRegime) {
        transitions++;
        lastRegime = marketConditions[i].regime;
      }
    }

    return transitions;
  }

  private calculateAverageRegimeDuration(marketConditions: MarketCondition[]): number {
    const regimeGroups: Record<MarketRegime, number[]> = {
      bull: [], bear: [], sideways: [], volatile: [], stable: [], crash: [], recovery: []
    };

    let currentRegime = marketConditions[0]?.regime;
    let currentStart = marketConditions[0]?.timestamp;

    for (let i = 1; i < marketConditions.length; i++) {
      if (marketConditions[i].regime !== currentRegime) {
        if (currentStart) {
          const duration = marketConditions[i].timestamp.getTime() - currentStart.getTime();
          regimeGroups[currentRegime].push(duration);
        }
        currentRegime = marketConditions[i].regime;
        currentStart = marketConditions[i].timestamp;
      }
    }

    // Calculate average duration across all regimes
    const allDurations = Object.values(regimeGroups).flat();
    return allDurations.length > 0 ? allDurations.reduce((a, b) => a + b, 0) / allDurations.length / (1000 * 60 * 60) : 24; // Convert to hours
  }

  private generateVariableRecommendation(variable: string, avgCorrelation: number, regimeSpecificity: number): string {
    if (avgCorrelation >= 0.7) {
      return `High priority: Strong correlation (${avgCorrelation.toFixed(3)}) - implement immediately`;
    } else if (avgCorrelation >= 0.5) {
      return `Medium priority: Moderate correlation (${avgCorrelation.toFixed(3)}) - consider implementation`;
    } else {
      return `Low priority: Weak correlation (${avgCorrelation.toFixed(3)}) - monitor for improvement`;
    }
  }

  private async getRecentWeightAdjustments(start: Date, end: Date): Promise<WeightAdjustment[]> {
    try {
      const { rows } = await this.db.query(`
        SELECT * FROM weight_adjustments
        WHERE effective_date BETWEEN $1 AND $2
        ORDER BY effective_date DESC
      `, [start, end]);

      return rows.map(row => ({
        signalType: row.signal_type,
        ruleId: row.rule_id,
        oldWeight: parseFloat(row.old_weight),
        newWeight: parseFloat(row.new_weight),
        adjustmentReason: row.adjustment_reason,
        confidence: parseFloat(row.confidence),
        effectiveDate: row.effective_date,
        expectedImpact: row.expected_impact
      }));
    } catch (error: any) {
      this.logger.error('Failed to get recent weight adjustments', error);
      return [];
    }
  }

  private async storeReport(report: MarketConditionReport): Promise<void> {
    try {
      await this.db.query(`
        INSERT INTO market_condition_reports (
          title, description, report_data, time_window_start, time_window_end, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        report.title,
        report.description,
        JSON.stringify(report),
        report.timeWindow.start,
        report.timeWindow.end,
        JSON.stringify(report.metadata)
      ]);
    } catch (error: any) {
      this.logger.error('Failed to store report', error);
    }
  }

  /**
   * Get recent reports
   */
  async getRecentReports(limit: number = 10): Promise<MarketConditionReport[]> {
    try {
      const { rows } = await this.db.query(`
        SELECT * FROM market_condition_reports
        ORDER BY created_at DESC
        LIMIT $1
      `, [limit]);

      return rows.map(row => ({
        ...row.report_data,
        id: row.id,
        metadata: row.metadata
      }));
    } catch (error: any) {
      this.logger.error('Failed to get recent reports', error);
      return [];
    }
  }

  /**
   * Get system health status
   */
  getHealthStatus(): {
    initialized: boolean;
    lastReport: Date | null;
    reportsGenerated: number;
    errorCount: number;
  } {
    return {
      initialized: this.isInitialized,
      lastReport: new Date(), // Would track actual last report time
      reportsGenerated: this.metrics.getMetric('reports_generated') || 0,
      errorCount: this.metrics.getMetric('report_generation_errors') || 0
    };
  }
}
