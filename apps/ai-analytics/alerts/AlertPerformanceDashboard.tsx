/**
 * =========================================
 * ALERT PERFORMANCE DASHBOARD
 * =========================================
 * Divine world-class visualization for alert performance analytics
 * Real-time metrics, trend analysis, and adaptive insights
 */

import {
  AlertPerformanceMetrics,
  TimePartitionedMetrics,
  MarketRegimePerformance,
  ConfidenceDistribution
} from './alert_performance_analytics';
import { AIInsightsDashboard, AIInsight } from './AIInsightsDashboard.js';

interface AlertPerformanceDashboardProps {
  ruleId?: string;
  instrument?: string;
  timeWindow?: {
    start: Date;
    end: Date;
  };
  autoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  includeAIInsights?: boolean;
  userId?: string;
}

interface DashboardState {
  metrics: AlertPerformanceMetrics | null;
  loading: boolean;
  error: string | null;
  selectedTimeWindow: string;
  selectedInstrument: string;
}

/**
 * Alert Performance Dashboard - Simplified Implementation
 * This component provides a basic interface for displaying alert performance metrics
 */
export class AlertPerformanceDashboard {
  private ruleId?: string;
  private instrument?: string;
  private includeAIInsights: boolean;
  private userId?: string;
  private aiInsightsEnabled: boolean;

  constructor(ruleId?: string, instrument?: string, includeAIInsights: boolean = false, userId?: string) {
    this.ruleId = ruleId;
    this.instrument = instrument;
    this.includeAIInsights = includeAIInsights;
    this.userId = userId;
    this.aiInsightsEnabled = includeAIInsights;
  }

  /**
   * Generate HTML representation of the dashboard
   */
  generateHTML(metrics: AlertPerformanceMetrics): string {
    const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
    const formatNumber = (value: number) => value.toLocaleString();

    const getPerformanceColor = (value: number, thresholds: { good: number; average: number; poor: number }) => {
      if (value >= thresholds.good) return 'text-green-600';
      if (value >= thresholds.average) return 'text-yellow-600';
      return 'text-red-600';
    };

    return `
      <div class="alert-performance-dashboard space-y-6 p-6">
        <!-- Header -->
        <div class="flex flex-col gap-4">
          <div>
            <h2 class="text-2xl font-bold">Alert Performance Analytics</h2>
            <p class="text-gray-600">
              ${metrics.ruleId} • ${metrics.instrument} • ${formatNumber(metrics.sampleSize)} samples
            </p>
          </div>
        </div>

        <!-- Key Metrics Overview -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-white border rounded-lg p-4 shadow-sm">
            <div class="flex justify-between items-center mb-2">
              <h3 class="font-medium">Success Rate</h3>
              <span class="text-green-600">✓</span>
            </div>
            <div class="text-2xl font-bold text-green-600">
              ${formatPercentage(metrics.successRate)}
            </div>
            <div class="text-xs text-gray-600 mt-1">
              ${metrics.successRate >= 0.7 ? 'Excellent' : metrics.successRate >= 0.5 ? 'Good' : 'Needs Improvement'}
            </div>
          </div>

          <div class="bg-white border rounded-lg p-4 shadow-sm">
            <div class="flex justify-between items-center mb-2">
              <h3 class="font-medium">Win Rate</h3>
              <span class="text-blue-600">↗</span>
            </div>
            <div class="text-2xl font-bold text-blue-600">
              ${formatPercentage(metrics.winRate)}
            </div>
            <div class="text-xs text-gray-600 mt-1">Profitable trades</div>
          </div>

          <div class="bg-white border rounded-lg p-4 shadow-sm">
            <div class="flex justify-between items-center mb-2">
              <h3 class="font-medium">Average ROI</h3>
              <span class="text-purple-600">$</span>
            </div>
            <div class="text-2xl font-bold ${getPerformanceColor(metrics.averageROI, { good: 0.05, average: 0.02, poor: 0.01 })}">
              ${formatPercentage(metrics.averageROI)}
            </div>
            <div class="text-xs text-gray-600 mt-1">Risk-adjusted returns</div>
          </div>

          <div class="bg-white border rounded-lg p-4 shadow-sm">
            <div class="flex justify-between items-center mb-2">
              <h3 class="font-medium">Sharpe Ratio</h3>
              <span class="text-orange-600">⚡</span>
            </div>
            <div class="text-2xl font-bold ${getPerformanceColor(metrics.sharpeRatio, { good: 1.5, average: 1.0, poor: 0.5 })}">
              ${metrics.sharpeRatio.toFixed(2)}
            </div>
            <div class="text-xs text-gray-600 mt-1">Risk-adjusted performance</div>
          </div>
        </div>

        <!-- Model Performance -->
        <div class="bg-white border rounded-lg p-4 shadow-sm">
          <h3 class="text-lg font-semibold mb-4">Model Performance</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium">Precision</span>
                <span class="font-bold ${getPerformanceColor(metrics.precision, { good: 0.8, average: 0.6, poor: 0.4 })}">
                  ${formatPercentage(metrics.precision)}
                </span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-blue-600 h-2 rounded-full" style="width: ${metrics.precision * 100}%"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium">Recall</span>
                <span class="font-bold ${getPerformanceColor(metrics.recall, { good: 0.8, average: 0.6, poor: 0.4 })}">
                  ${formatPercentage(metrics.recall)}
                </span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-green-600 h-2 rounded-full" style="width: ${metrics.recall * 100}%"></div>
              </div>
            </div>

            <div>
              <div class="flex justify-between items-center mb-2">
                <span class="text-sm font-medium">F1 Score</span>
                <span class="font-bold ${getPerformanceColor(metrics.f1Score, { good: 0.8, average: 0.6, poor: 0.4 })}">
                  ${formatPercentage(metrics.f1Score)}
                </span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="bg-purple-600 h-2 rounded-full" style="width: ${metrics.f1Score * 100}%"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Financial Performance -->
        <div class="bg-white border rounded-lg p-4 shadow-sm">
          <h3 class="text-lg font-semibold mb-4">Financial Performance</h3>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="text-center">
              <div class="text-sm font-medium">Total Alpha</div>
              <div class="text-xl font-bold ${getPerformanceColor(metrics.totalAlpha / 100, { good: 0.05, average: 0.02, poor: 0.01 })}">
                ${formatPercentage(metrics.totalAlpha / 100)}
              </div>
            </div>

            <div class="text-center">
              <div class="text-sm font-medium">Sortino Ratio</div>
              <div class="text-xl font-bold ${getPerformanceColor(metrics.sortinoRatio, { good: 1.5, average: 1.0, poor: 0.5 })}">
                ${metrics.sortinoRatio.toFixed(2)}
              </div>
            </div>

            <div class="text-center">
              <div class="text-sm font-medium">Max Drawdown</div>
              <div class="text-xl font-bold ${metrics.maxDrawdown > 0.1 ? 'text-red-600' : 'text-green-600'}">
                ${formatPercentage(metrics.maxDrawdown)}
              </div>
            </div>

            <div class="text-center">
              <div class="text-sm font-medium">Signal Quality</div>
              <div class="text-xl font-bold ${getPerformanceColor(metrics.signalQualityScore, { good: 0.7, average: 0.5, poor: 0.3 })}">
                ${formatPercentage(metrics.signalQualityScore)}
              </div>
            </div>
          </div>
        </div>

        <!-- Adaptive Weights -->
        <div class="bg-white border rounded-lg p-4 shadow-sm">
          <h3 class="text-lg font-semibold mb-4">Adaptive Weighting Configuration</h3>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            ${Object.entries(metrics.adaptiveWeights).map(([key, value]) => `
              <div class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="capitalize">${key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span class="font-medium">${formatPercentage(value)}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                  <div class="bg-blue-600 h-2 rounded-full" style="width: ${value * 100}%"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- AI Insights Section -->
        ${this.includeAIInsights && this.aiInsightsDashboard ? `
        <div class="bg-gradient-to-br from-blue-50 to-indigo-100 border rounded-lg p-6 shadow-sm">
          <div class="flex items-center mb-4">
            <span class="text-2xl mr-3">🤖</span>
            <div>
              <h3 class="text-lg font-semibold text-gray-900">AI-Powered Insights</h3>
              <p class="text-sm text-gray-600">Intelligent recommendations based on your trading patterns</p>
            </div>
          </div>

          <div class="bg-white rounded-lg p-4 border">
            <div class="flex items-center justify-between mb-4">
              <h4 class="font-medium text-gray-900">Recent Recommendations</h4>
              <button class="text-blue-600 hover:text-blue-800 text-sm font-medium">
                View All →
              </button>
            </div>

            <div class="space-y-3">
              <div class="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <span class="text-green-600 text-lg">💡</span>
                <div class="flex-1">
                  <h5 class="font-medium text-gray-900 text-sm">Optimize Signal Weighting</h5>
                  <p class="text-xs text-gray-600">Machine learning suggests adjusting RSI signal weights for better accuracy</p>
                  <div class="flex items-center mt-2 space-x-2">
                    <span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">75% Confidence</span>
                    <span class="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">Medium Impact</span>
                  </div>
                </div>
                <button class="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600">
                  Implement
                </button>
              </div>

              <div class="flex items-start space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <span class="text-yellow-600 text-lg">⚠️</span>
                <div class="flex-1">
                  <h5 class="font-medium text-gray-900 text-sm">Consider New Data Sources</h5>
                  <p class="text-xs text-gray-600">Social media sentiment analysis could improve alert timing</p>
                  <div class="flex items-center mt-2 space-x-2">
                    <span class="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">High Effort</span>
                    <span class="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">High Impact</span>
                  </div>
                </div>
                <button class="px-3 py-1 bg-yellow-500 text-white text-xs rounded hover:bg-yellow-600">
                  Review
                </button>
              </div>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Last Updated -->
        <div class="text-xs text-gray-500 text-center">
          Last updated: ${metrics.lastUpdated.toLocaleString()}
          ${this.includeAIInsights ? ' • AI Insights: Active' : ''}
        </div>
      </div>
    `;
  }

  /**
   * Get dashboard data as JSON
   */
  async getDashboardData(): Promise<{ html: string; metrics: AlertPerformanceMetrics }> {
    // This would typically fetch from the analytics service
    // For now, return a placeholder
    const placeholderMetrics: AlertPerformanceMetrics = {
      alertId: this.ruleId || 'sample_rule',
      ruleId: this.ruleId || 'sample_rule',
      instrument: this.instrument || 'ALL',
      timeWindow: {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      },
      successRate: 0.75,
      falsePositiveRate: 0.25,
      precision: 0.8,
      recall: 0.7,
      f1Score: 0.75,
      winRate: 0.65,
      averageROI: 0.032,
      totalAlpha: 2.4,
      sharpeRatio: 1.2,
      sortinoRatio: 1.5,
      maxDrawdown: 0.08,
      calmarRatio: 1.8,
      informationRatio: 0.95,
      trackingError: 0.12,
      battingAverage: 0.58,
      profitFactor: 1.4,
      averageWin: 0.025,
      averageLoss: 0.015,
      largestWin: 0.08,
      largestLoss: 0.04,
      consecutiveWins: 5,
      consecutiveLosses: 3,
      timeInMarket: 0.65,
      averageHoldingPeriod: 2.5,
      timePartitionedMetrics: [],
      instrumentPartitionedMetrics: [],
      marketRegimePerformance: [],
      confidenceDistribution: [],
      signalQualityScore: 0.72,
      statisticalTests: {
        kolmogorovSmirnov: {
          statistic: 0.045,
          pValue: 0.78,
          significant: false
        },
        chiSquare: {
          statistic: 12.4,
          pValue: 0.32,
          degreesOfFreedom: 8,
          significant: false
        },
        normalityTest: {
          statistic: 1.2,
          pValue: 0.15,
          distribution: 'normal'
        }
      },
      performanceModel: {
        trend: 'improving',
        trendStrength: 0.75,
        seasonality: {
          daily: [0.02, 0.01, -0.01, 0.03, 0.02, 0.01, -0.02],
          weekly: [0.01, 0.02, 0.03, 0.01, 0.02, 0.01, 0.00],
          monthly: [0.05, 0.03, 0.08, 0.04, 0.06, 0.02, 0.07, 0.01, 0.09, 0.03, 0.05, 0.04]
        },
        volatility: {
          historical: 0.15,
          realized: 0.18,
          implied: 0.16,
          regimeAdjusted: 0.14
        },
        correlationMatrix: {
          'BTC': 1.0,
          'ETH': 0.85,
          'SOL': 0.72
        }
      },
      mlPredictions: {
        nextPeriodSuccessRate: 0.78,
        confidence: 0.82,
        featureImportance: {
          'signal_strength': 0.35,
          'market_regime': 0.28,
          'historical_performance': 0.22,
          'volatility': 0.15
        },
        modelAccuracy: 0.79,
        modelType: 'random_forest'
      },
      riskMetrics: {
        valueAtRisk: {
          daily: 0.025,
          weekly: 0.055,
          monthly: 0.095
        },
        expectedShortfall: {
          daily: 0.035,
          weekly: 0.075,
          monthly: 0.125
        },
        tailRisk: 0.08,
        downsideDeviation: 0.12,
        upsideDeviation: 0.15,
        gainLossRatio: 1.6,
        sterlingRatio: 1.8,
        burkeRatio: 2.1
      },
      performanceByTimeframe: {
        hourly: {},
        daily: {},
        weekly: {},
        monthly: {}
      },
      performanceByInstrument: {},
      benchmarking: {
        vsMarket: {
          alpha: 0.04,
          beta: 1.05,
          rSquared: 0.88,
          treynorRatio: 0.15
        },
        vsPeers: {
          percentileRank: 78,
          zScore: 1.2,
          outperformers: 22,
          underperformers: 78
        },
        vsBenchmarks: {}
      },
      adaptiveWeights: {
        signalStrengthWeight: 0.6,
        historicalPerformanceWeight: 0.7,
        marketRegimeWeight: 0.8,
        userRiskToleranceWeight: 0.5,
        temporalWeight: 0.9,
        instrumentSpecificWeight: 0.6
      },
      sampleSize: 1000,
      lastUpdated: new Date(),
      calculationMethod: 'sample_data'
    };

    return {
      html: this.generateHTML(placeholderMetrics),
      metrics: placeholderMetrics
    };
  }
}

export default AlertPerformanceDashboard;
