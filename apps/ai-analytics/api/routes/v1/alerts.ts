import express, { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AlertPerformanceAnalytics } from '../../../alerts/alert_performance_analytics';
import { UserBehaviorAnalytics } from '../../../behavior/user_behavior_analytics';
import { UserBehaviorDashboard } from '../../../behavior/user_behavior_dashboard';
import { MarketConditionAnalysis } from '../../../market-condition-analysis/market_condition_analysis';
import { AlertROITracking, ROIMetrics, TradeExecution } from '../../../alerts/alert_roi_tracking';
import { SignalAccuracyTracking, SignalPerformanceMetrics } from '../../../alerts/signal_accuracy_tracking';

const router = Router();

// In-memory alerts store for demo; replace with DB in production
const alerts: any[] = [];

// Initialize performance analytics service
const analyticsService = new AlertPerformanceAnalytics({
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'coinet',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  },
  timeWindows: {
    short: 5,
    medium: 60,
    long: 7 * 24
  },
  calculationIntervals: {
    realTime: 30,
    batch: 15
  },
  confidenceThresholds: {
    high: 0.8,
    medium: 0.6,
    low: 0.4
  },
  performanceThresholds: {
    excellent: 0.8,
    good: 0.6,
    average: 0.4,
    poor: 0.2
  },
  enableRealTimeUpdates: true,
  enableAdaptiveLearning: true
});

// Initialize user behavior analytics service
const behaviorAnalyticsService = new UserBehaviorAnalytics({
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'coinet',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  },
  tracking: {
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'coinet',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    },
    privacy: {
      dataRetentionDays: 365,
      anonymizationEnabled: true,
      pseudonymizationEnabled: true,
      consentRequired: true,
      gdprCompliant: true,
      ccpaCompliant: true,
      dataMinimization: true,
      purposeLimitation: true
    },
    batchSize: 100,
    flushInterval: 30000,
    enableRealTimeTracking: true,
    enablePatternDetection: true,
    enableRecommendations: true
  },
  clustering: {
    algorithm: 'kmeans',
    kClusters: 5,
    maxIterations: 100,
    tolerance: 0.001,
    minSupport: 0.05,
    minConfidence: 0.6,
    maxPatternLength: 5,
    timeWindowMs: 3600000,
    enableGapAnalysis: true
  },
  patternDetection: {
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'coinet',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    },
    detectionInterval: 60,
    minDataPoints: 5,
    enableRealTimeDetection: true,
    enableBatchProcessing: true,
    patternRules: [
      {
        patternType: 'alert_fatigue',
        name: 'Alert Fatigue Detection',
        description: 'User showing signs of alert fatigue',
        conditions: [
          { type: 'threshold', metric: 'alert_fatigue_score', operator: '>', value: 0.7 },
          { type: 'trend', metric: 'interaction_frequency', operator: '==', value: 'decreasing' }
        ],
        actions: [
          { type: 'alert_frequency', target: 'frequency', action: 'reduce_by_50_percent', confidence: 0.9 }
        ],
        priority: 10,
        enabled: true
      }
    ],
    recommendationEngine: {
      generateRecommendations: (userProfile, detectedPatterns, clusterInfo) => ({
        engagement: [],
        alertFrequency: [],
        contentPersonalization: [],
        riskManagement: []
      })
    }
  },
  enableRealTimeProcessing: true,
  enableBatchProcessing: true,
  processingInterval: 60
});

// Initialize market condition analysis service
const marketAnalysisService = new MarketConditionAnalysis({
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'coinet',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  },
  marketConditionTracker: {
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'coinet',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    },
    tracking: {
      updateInterval: 60000, // 1 minute
      dataRetentionDays: 90,
      enableRealTimeUpdates: true,
      enableHistoricalBackfill: true
    },
    dataSources: {
      volatility: ['vix-api'],
      macroeconomic: ['economic-indicators'],
      liquidity: ['order-book-data'],
      volume: ['exchange-volume'],
      sentiment: ['social-sentiment']
    },
    regimeDetection: {
      lookbackWindow: 7,
      confidenceThreshold: 0.8,
      minDataPoints: 10,
      regimeStabilityThreshold: 0.7
    }
  },
  correlationAnalysis: {
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'coinet',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    },
    analysis: {
      minSampleSize: 30,
      significanceLevel: 0.05,
      confidenceLevel: 0.95,
      lookbackDays: 30,
      updateInterval: 15
    },
    statisticalTests: {
      pearsonCorrelation: true,
      spearmanCorrelation: true,
      kendallCorrelation: true,
      tTest: true,
      anova: false
    },
    marketVariables: {
      volatility: ['vix', 'realizedVolatility', 'impliedVolatility'],
      macroeconomic: ['interestRates', 'inflation', 'unemployment', 'gdpGrowth'],
      liquidity: ['bidAskSpread', 'marketDepth', 'orderBookImbalance'],
      volume: ['totalVolume24h', 'largeTrades', 'institutionalFlow'],
      sentiment: ['fearGreedIndex', 'socialSentiment', 'newsSentiment']
    },
    alertMetrics: ['successRate', 'winRate', 'sharpeRatio', 'averageROI']
  },
  adaptiveWeighting: {
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'coinet',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    },
    weighting: {
      updateInterval: 15, // minutes
      minAdjustmentThreshold: 0.01,
      maxAdjustmentRate: 0.1,
      stabilityWeight: 0.3,
      performanceWeight: 0.4,
      regimeWeight: 0.3
    },
    adjustmentRules: {
      correlationThreshold: 0.3,
      significanceThreshold: 0.05,
      minSampleSize: 20,
      regimeSpecificAdjustment: true
    }
  },
  reporting: {
    database: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'coinet',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres'
    },
    reporting: {
      reportInterval: 24, // hours
      retentionDays: 90,
      enableAutoReports: true,
      enableRealTimeUpdates: true
    },
    thresholds: {
      significanceLevel: 0.05,
      correlationThreshold: 0.3,
      minSampleSize: 30,
      confidenceThreshold: 0.8
    }
  },
  system: {
    enableRealTimeUpdates: true,
    enableAutoOptimization: true,
    performanceMonitoring: true,
    maxConcurrentAnalyses: 5
  }
});

    // Initialize ROI tracking service
    const roiTrackingService = new AlertROITracking({
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'coinet',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres'
      },
      calculation: {
        updateInterval: 5, // minutes
        riskFreeRate: 0.02, // 2% annual risk-free rate
        benchmarkSymbol: 'SPY', // S&P 500 ETF as benchmark
        minTradeSize: 100, // Minimum $100 trade
        maxSlippageTolerance: 1.0 // 1% maximum slippage
      },
      analytics: {
        enableRealTimeUpdates: true,
        enableAlphaCalculation: true,
        enableRiskMetrics: true,
        enableRegimeAnalysis: true,
        retentionDays: 365
      },
      performance: {
        batchSize: 100,
        maxConcurrentCalculations: 5,
        cacheResults: true,
        cacheTTL: 60 // 1 hour cache
      }
    });

    // Initialize signal accuracy tracking service
    const signalAccuracyTrackingService = new SignalAccuracyTracking({
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'coinet',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres'
      },
      tracking: {
        rollingWindowDays: 7,
        updateInterval: 15, // minutes
        minSignalsForAnalysis: 30,
        maxAgeForSignals: 90,
        enableRealTimeTracking: true,
        enableBatchProcessing: true
      },
      driftDetection: {
        enabled: true,
        sensitivity: 'medium',
        statisticalThreshold: 0.05,
        minSampleSize: 50,
        lookbackWindow: 7, // days
        alertThreshold: 0.15 // 15% performance drop
      },
      alerting: {
        enabled: true,
        webhookUrl: process.env.SIGNAL_ACCURACY_WEBHOOK_URL,
        emailRecipients: process.env.SIGNAL_ACCURACY_EMAIL_RECIPIENTS?.split(',') || [],
        slackWebhook: process.env.SIGNAL_ACCURACY_SLACK_WEBHOOK,
        escalationDelay: 30, // minutes
        maxAlertsPerDay: 10
      },
      signalTypes: ['social_media', 'news', 'defi_metrics', 'on_chain', 'price', 'volume', 'technical', 'fundamental'],
      performanceThresholds: {
        excellent: 0.85,
        good: 0.75,
        average: 0.65,
        poor: 0.55,
        critical: 0.45
      }
    });

    // Start the analytics services
    analyticsService.start().catch(console.error);
    behaviorAnalyticsService.start().catch(console.error);
    marketAnalysisService.start().catch(console.error);
    roiTrackingService.start().catch(console.error);
    signalAccuracyTrackingService.start().catch(console.error);

// Simplified route handlers without complex middleware for now
function asyncHandler(fn: any) {
  return function (req: any, res: any, next: any) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// GET alerts (simplified)
router.get('/alerts', (req, res) => {
    res.json(alerts);
});

// POST alert (create) - simplified
router.post('/alerts', (req, res) => {
  const { userId, symbol, condition, threshold, cooldown = 3600 } = req.body;

  if (!userId || !symbol || !condition || threshold === undefined) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

    const alert = {
      alertId: uuidv4(),
      userId,
      symbol,
      condition, // 'above' | 'below'
      threshold,
      cooldown, // seconds
      lastTriggered: null,
      active: true,
      createdAt: new Date().toISOString(),
    };
    alerts.push(alert);
    res.status(201).json(alert);
});

// ============================================================================
// ALERT PERFORMANCE ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/alerts/performance
 * Get comprehensive performance metrics for alerts
 */
router.get('/performance', async (req, res) => {
  try {
    const { ruleId, instrument, timeWindow } = req.query;

    if (!ruleId || typeof ruleId !== 'string') {
      return res.status(400).json({ error: 'ruleId parameter is required' });
    }

    // Parse time window
    let parsedTimeWindow;
    if (timeWindow && typeof timeWindow === 'string') {
      const [startStr, endStr] = timeWindow.split(',');
      if (startStr && endStr) {
        parsedTimeWindow = {
          start: new Date(startStr),
          end: new Date(endStr)
        };
      }
    }

    const metrics = await analyticsService.calculatePerformanceMetrics(
      ruleId,
      instrument as string,
      parsedTimeWindow
    );

    res.json(metrics);
  } catch (error: any) {
    console.error('Error fetching alert performance metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/alerts/outcomes
 * Record an alert outcome for performance analysis
 */
router.post('/outcomes', async (req, res) => {
  try {
    const {
      alertId,
      ruleId,
      instrument,
      outcome,
      profitLoss,
      entryPrice,
      exitPrice,
      duration,
      confidence,
      marketRegime,
      userId
    } = req.body;

    if (!alertId || !ruleId || !instrument || !outcome || confidence === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: alertId, ruleId, instrument, outcome, confidence'
      });
    }

    await analyticsService.recordAlertOutcome({
      alertId,
      ruleId,
      instrument,
      timestamp: new Date(),
      outcome: outcome as 'SUCCESS' | 'FAILURE' | 'NEUTRAL' | 'UNKNOWN',
      profitLoss,
      entryPrice,
      exitPrice,
      duration,
      confidence,
      marketRegime: marketRegime || 'unknown',
      userId: userId || 'system'
    });

    res.json({ success: true, message: 'Alert outcome recorded successfully' });
  } catch (error: any) {
    console.error('Error recording alert outcome:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/alerts/analytics/summary
 * Get summary analytics across all rules and instruments
 */
router.get('/analytics/summary', async (req, res) => {
  try {
    const timeWindow = req.query.timeWindow as string || '30d';

    // Parse time window
    const endDate = new Date();
    let startDate: Date;

    switch (timeWindow) {
      case '1d':
        startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
      default:
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    // Get summary metrics across all rules
    const summary = {
      timeWindow: {
        start: startDate,
        end: endDate
      },
      totalAlerts: 0,
      averageSuccessRate: 0,
      averageROI: 0,
      averageSharpeRatio: 0,
      topPerformingRules: [],
      worstPerformingRules: [],
      bestInstruments: [],
      worstInstruments: [],
      marketRegimeBreakdown: {},
      lastUpdated: new Date()
    };

    res.json(summary);
  } catch (error: any) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// USER BEHAVIOR ANALYTICS ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/alerts/behavior/insights
 * Get comprehensive user behavior insights
 */
router.get('/behavior/insights', async (req, res) => {
  try {
    const { period = '30d', start, end } = req.query;

    // Parse time window
    let timeWindow;
    if (start && end) {
      timeWindow = {
        start: new Date(start as string),
        end: new Date(end as string)
      };
    } else {
      const endDate = new Date();
      let startDate: Date;

      switch (period) {
        case '1d':
          startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
        default:
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      timeWindow = { start: startDate, end: endDate };
    }

    // Generate insights using the behavior analytics system
    const insights = await behaviorAnalyticsService.generateAggregatedInsights(timeWindow);

    res.json(insights);
  } catch (error: any) {
    console.error('Error fetching behavior insights:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/alerts/behavior/user/:userId
 * Get behavior insights for a specific user
 */
router.get('/behavior/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: 'userId parameter is required' });
    }

    const insights = await behaviorAnalyticsService.getUserInsightsForDashboard(userId);

    if (!insights) {
      return res.status(404).json({ error: 'No behavior data found for user' });
    }

    res.json(insights);
  } catch (error: any) {
    console.error('Error fetching user behavior insights:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/alerts/behavior/track
 * Track a user interaction for behavior analysis
 */
router.post('/behavior/track', async (req, res) => {
  try {
    const {
      userId,
      interactionType,
      alertId,
      ruleId,
      metadata,
      context,
      consentGiven = true
    } = req.body;

    if (!userId || !interactionType) {
      return res.status(400).json({
        error: 'Missing required fields: userId, interactionType'
      });
    }

    await behaviorAnalyticsService.trackUserInteraction(
      userId,
      interactionType,
      alertId,
      ruleId,
      metadata,
      context,
      consentGiven
    );

    res.json({ success: true, message: 'User interaction tracked successfully' });
  } catch (error: any) {
    console.error('Error tracking user interaction:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/alerts/behavior/dashboard
 * Get user behavior dashboard HTML
 */
router.get('/behavior/dashboard', async (req, res) => {
  try {
    const dashboard = new UserBehaviorDashboard({
      timeWindow: req.query.start && req.query.end ? {
        start: new Date(req.query.start as string),
        end: new Date(req.query.end as string)
      } : undefined,
      autoRefresh: req.query.autoRefresh !== 'false',
      refreshInterval: parseInt(req.query.refreshInterval as string) || 30000,
      showRecommendations: req.query.showRecommendations !== 'false',
      showPatternDetection: req.query.showPatternDetection !== 'false',
      showClustering: req.query.showClustering !== 'false'
    });

    const html = await dashboard.generateHTML();

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error: any) {
    console.error('Error generating behavior dashboard:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/alerts/behavior/clusters
 * Get user clustering results
 */
router.get('/behavior/clusters', async (req, res) => {
  try {
    const { period = '30d', start, end } = req.query;

    // Parse time window
    let timeWindow;
    if (start && end) {
      timeWindow = {
        start: new Date(start as string),
        end: new Date(end as string)
      };
    } else {
      const endDate = new Date();
      let startDate: Date;

      switch (period) {
        case '7d':
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
        default:
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      timeWindow = { start: startDate, end: endDate };
    }

    const insights = await analyticsService['clusteringEngine'].getClusteringInsights(timeWindow);

    res.json(insights);
  } catch (error: any) {
    console.error('Error fetching clustering insights:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/alerts/behavior/patterns
 * Get detected behavior patterns
 */
router.get('/behavior/patterns', async (req, res) => {
  try {
    const { period = '30d', start, end } = req.query;

    // Parse time window
    let timeWindow;
    if (start && end) {
      timeWindow = {
        start: new Date(start as string),
        end: new Date(end as string)
      };
    } else {
      const endDate = new Date();
      let startDate: Date;

      switch (period) {
        case '7d':
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
        default:
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      timeWindow = { start: startDate, end: endDate };
    }

    const insights = await analyticsService['patternDetectionEngine'].getPatternInsights(timeWindow);

    res.json(insights);
  } catch (error: any) {
    console.error('Error fetching pattern insights:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v1/alerts/behavior/health
 * Get behavior analytics system health
 */
router.get('/behavior/health', async (req, res) => {
  try {
    const health = behaviorAnalyticsService.getSystemHealth();

    res.json({
      status: health.initialized ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      services: health.services,
      database: health.database,
      performance: health.performance
    });
  } catch (error: any) {
    console.error('Error fetching behavior analytics health:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/alerts/behavior/export/:userId
 * Export user behavior data (GDPR compliant)
 */
router.post('/behavior/export/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { format = 'json' } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId parameter is required' });
    }

    const data = await behaviorAnalyticsService.exportUserData(userId, format);

    res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="user_behavior_${userId}_${new Date().toISOString().split('T')[0]}.${format}"`);
    res.send(data);
  } catch (error: any) {
    console.error('Error exporting user behavior data:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/v1/alerts/behavior/cleanup
 * Trigger data cleanup based on retention policies
 */
router.post('/behavior/cleanup', async (req, res) => {
  try {
    const { retentionDays = 365 } = req.body;

    await behaviorAnalyticsService.cleanupOldData(retentionDays);

    res.json({
      success: true,
      message: `Data cleanup completed for ${retentionDays} days retention`,
      timestamp: new Date()
    });
  } catch (error: any) {
    console.error('Error during behavior data cleanup:', error);
    res.status(500).json({ error: error.message });
  }
});

    // ============================================================================
    // MARKET CONDITION ANALYSIS ENDPOINTS
    // ============================================================================

    /**
     * GET /api/v1/alerts/market/conditions
     * Get current market conditions
     */
    router.get('/market/conditions', async (req, res) => {
      try {
        const conditions = marketAnalysisService.getCurrentMarketConditions();

        res.json({
          timestamp: new Date(),
          conditions,
          regime: conditions?.regime || 'unknown',
          confidence: conditions?.metadata?.confidence || 0
        });
      } catch (error: any) {
        console.error('Error fetching market conditions:', error);
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * GET /api/v1/alerts/market/correlations/:regime
     * Get correlation analysis results for a specific market regime
     */
    router.get('/market/correlations/:regime', async (req, res) => {
      try {
        const { regime } = req.params;

        if (!['bull', 'bear', 'sideways', 'volatile', 'stable', 'crash', 'recovery'].includes(regime)) {
          return res.status(400).json({ error: 'Invalid regime parameter' });
        }

        const correlations = await marketAnalysisService.getRegimeCorrelations(regime);

        res.json({
          regime,
          timestamp: new Date(),
          correlations,
          totalCorrelations: correlations.length
        });
      } catch (error: any) {
        console.error('Error fetching regime correlations:', error);
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * GET /api/v1/alerts/market/weights/:signalType/:ruleId
     * Get adaptive weight for signal/rule combination
     */
    router.get('/market/weights/:signalType/:ruleId', async (req, res) => {
      try {
        const { signalType, ruleId } = req.params;
        const { regime } = req.query;

        const weight = await marketAnalysisService.getAdaptiveWeight(signalType, ruleId, regime as string);

        res.json({
          signalType,
          ruleId,
          regime: regime || 'current',
          weight,
          timestamp: new Date()
        });
      } catch (error: any) {
        console.error('Error fetching adaptive weight:', error);
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * POST /api/v1/alerts/market/analyze
     * Perform comprehensive market condition correlation analysis
     */
    router.post('/market/analyze', async (req, res) => {
      try {
        const { timeWindow } = req.body;

        let parsedTimeWindow;
        if (timeWindow) {
          parsedTimeWindow = {
            start: new Date(timeWindow.start),
            end: new Date(timeWindow.end)
          };
        }

        const analysis = await marketAnalysisService.performComprehensiveAnalysis(parsedTimeWindow);

        res.json({
          analysisId: analysis.analysisId,
          status: analysis.status,
          timestamp: analysis.timestamp,
          summary: {
            marketConditionsAnalyzed: analysis.progress.marketConditionsAnalyzed,
            correlationsCalculated: analysis.progress.correlationsCalculated,
            weightsAdjusted: analysis.progress.weightsAdjusted,
            reportsGenerated: analysis.progress.reportsGenerated
          },
          keyFindings: analysis.insights.keyFindings,
          recommendations: analysis.insights.recommendations
        });
      } catch (error: any) {
        console.error('Error performing market analysis:', error);
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * GET /api/v1/alerts/market/reports
     * Get recent market condition reports
     */
    router.get('/market/reports', async (req, res) => {
      try {
        const { limit = 10 } = req.query;

        const reports = await marketAnalysisService.getRecentReports(parseInt(limit as string));

        res.json({
          timestamp: new Date(),
          reports,
          totalReports: reports.length
        });
      } catch (error: any) {
        console.error('Error fetching market reports:', error);
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * GET /api/v1/alerts/market/status
     * Get market condition analysis system status
     */
    router.get('/market/status', async (req, res) => {
      try {
        const status = marketAnalysisService.getHealthStatus();

        res.json({
          timestamp: new Date(),
          status: status.initialized ? 'healthy' : 'unhealthy',
          engines: status.engines,
          activeAnalyses: status.activeAnalyses,
          performance: status.performance
        });
      } catch (error: any) {
        console.error('Error fetching market analysis status:', error);
        res.status(500).json({ error: error.message });
      }
    });

    /**
     * POST /api/v1/alerts/market/export
     * Export market condition analysis data
     */
    router.post('/market/export', async (req, res) => {
      try {
        const { format = 'json', timeWindow } = req.body;

        let parsedTimeWindow;
        if (timeWindow) {
          parsedTimeWindow = {
            start: new Date(timeWindow.start),
            end: new Date(timeWindow.end)
          };
        }

        const data = await marketAnalysisService.exportAnalysisData(format, parsedTimeWindow);

        res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="market_analysis_${new Date().toISOString().split('T')[0]}.${format}"`);
        res.send(data);
      } catch (error: any) {
        console.error('Error exporting market analysis data:', error);
        res.status(500).json({ error: error.message });
      }
    });

  // ============================================================================
  // ROI TRACKING ENDPOINTS
  // ============================================================================

  /**
   * POST /api/v1/alerts/trades
   * Record a trade execution following an alert
   */
  router.post('/trades', async (req, res) => {
    try {
      const {
        alertId,
        userId,
        instrument,
        side,
        entryPrice,
        quantity,
        slippage = 0,
        fees = 0,
        marketRegime = 'unknown',
        alertConfidence = 0.5,
        positionSize = 0.01,
        riskManagement = {}
      } = req.body;

      if (!alertId || !userId || !instrument || !side || !entryPrice || !quantity) {
        return res.status(400).json({
          error: 'Missing required fields: alertId, userId, instrument, side, entryPrice, quantity'
        });
      }

      const tradeId = await roiTrackingService.recordTradeExecution({
        alertId,
        userId,
        instrument,
        side,
        entryPrice,
        quantity,
        entryTime: new Date(),
        slippage,
        fees,
        status: 'OPEN',
        metadata: {
          alertConfidence,
          marketRegime,
          positionSize,
          riskManagement
        }
      });

      res.json({
        success: true,
        tradeId,
        message: 'Trade execution recorded successfully'
      });
    } catch (error: any) {
      console.error('Error recording trade execution:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * PUT /api/v1/alerts/trades/:tradeId/exit
   * Update trade with exit information
   */
  router.put('/trades/:tradeId/exit', async (req, res) => {
    try {
      const { tradeId } = req.params;
      const { exitPrice, exitTime } = req.body;

      if (!exitPrice) {
        return res.status(400).json({
          error: 'exitPrice is required'
        });
      }

      await roiTrackingService.updateTradeExit(tradeId, exitPrice, exitTime ? new Date(exitTime) : new Date());

      res.json({
        success: true,
        message: 'Trade exit updated successfully'
      });
    } catch (error: any) {
      console.error('Error updating trade exit:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/v1/alerts/roi/metrics
   * Get comprehensive ROI metrics for user/instrument/time window
   */
  router.get('/roi/metrics', async (req, res) => {
    try {
      const { userId, instrument, start, end, period = '30d' } = req.query;

      // Parse time window
      let timeWindow;
      if (start && end) {
        timeWindow = {
          start: new Date(start as string),
          end: new Date(end as string)
        };
      } else {
        const endDate = new Date();
        let startDate: Date;

        switch (period) {
          case '1d':
            startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '90d':
            startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case '1y':
            startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
          default:
            startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        }

        timeWindow = { start: startDate, end: endDate };
      }

      const metrics = await roiTrackingService.calculateROIMetrics(
        userId as string,
        instrument as string,
        timeWindow
      );

      res.json({
        timestamp: new Date(),
        metrics,
        summary: {
          totalReturn: metrics.totalNetPnL,
          winRate: metrics.winRate,
          sharpeRatio: metrics.sharpeRatio,
          maxDrawdown: metrics.maxDrawdown,
          alpha: metrics.alpha
        }
      });
    } catch (error: any) {
      console.error('Error calculating ROI metrics:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/v1/alerts/roi/returns
   * Get cumulative returns time series
   */
  router.get('/roi/returns', async (req, res) => {
    try {
      const { userId, instrument, start, end, period = '30d' } = req.query;

      // Parse time window
      let timeWindow;
      if (start && end) {
        timeWindow = {
          start: new Date(start as string),
          end: new Date(end as string)
        };
      } else {
        const endDate = new Date();
        let startDate: Date;

        switch (period) {
          case '1d':
            startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '90d':
            startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case '1y':
            startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
          default:
            startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        }

        timeWindow = { start: startDate, end: endDate };
      }

      const returns = await roiTrackingService.calculateCumulativeReturns(
        userId as string,
        instrument as string,
        timeWindow
      );

      res.json({
        timestamp: new Date(),
        returns,
        summary: {
          totalReturns: returns.length,
          currentReturn: returns.length > 0 ? returns[returns.length - 1].cumulativeReturn : 0,
          maxDrawdown: returns.length > 0 ? Math.min(...returns.map(r => r.drawdown)) : 0
        }
      });
    } catch (error: any) {
      console.error('Error calculating cumulative returns:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/v1/alerts/roi/alpha
   * Get alpha generation analysis vs benchmark
   */
  router.get('/roi/alpha', async (req, res) => {
    try {
      const { userId, start, end, period = '30d' } = req.query;

      // Parse time window
      let timeWindow;
      if (start && end) {
        timeWindow = {
          start: new Date(start as string),
          end: new Date(end as string)
        };
      } else {
        const endDate = new Date();
        let startDate: Date;

        switch (period) {
          case '1d':
            startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '7d':
            startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case '90d':
            startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case '1y':
            startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
            break;
          case '30d':
          default:
            startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        }

        timeWindow = { start: startDate, end: endDate };
      }

      const alpha = await roiTrackingService.calculateAlpha(userId as string, timeWindow);

      res.json({
        timestamp: new Date(),
        alpha: alpha.alpha,
        beta: alpha.beta,
        informationRatio: alpha.informationRatio,
        benchmarkReturns: alpha.benchmarkReturns,
        analysis: {
          alphaGeneration: alpha.alpha > 0 ? 'Positive' : alpha.alpha < 0 ? 'Negative' : 'Neutral',
          marketCorrelation: alpha.beta > 0 ? 'Positive' : alpha.beta < 0 ? 'Negative' : 'No correlation',
          excessReturnQuality: alpha.informationRatio > 0.5 ? 'High' : alpha.informationRatio > 0 ? 'Moderate' : 'Low'
        }
      });
    } catch (error: any) {
      console.error('Error calculating alpha:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/v1/alerts/roi/dashboard
   * Get ROI tracking dashboard HTML
   */
  router.get('/roi/dashboard', async (req, res) => {
    try {
      const { userId, instrument, period = '30d' } = req.query;

      // Parse time window
      const endDate = new Date();
      let startDate: Date;

      switch (period) {
        case '1d':
          startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
        default:
          startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
      }

      const timeWindow = { start: startDate, end: endDate };

      // Get comprehensive metrics
      const metrics = await roiTrackingService.calculateROIMetrics(userId as string, instrument as string, timeWindow);
      const returns = await roiTrackingService.calculateCumulativeReturns(userId as string, instrument as string, timeWindow);
      const alpha = await roiTrackingService.calculateAlpha(userId as string, timeWindow);

      // Generate dashboard HTML
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>ROI Tracking Dashboard</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; }
            .card { background: white; border-radius: 8px; padding: 20px; margin: 10px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
            .metric { text-align: center; }
            .metric-value { font-size: 2em; font-weight: bold; color: #2563eb; }
            .metric-label { color: #6b7280; margin-top: 5px; }
            .positive { color: #059669; }
            .negative { color: #dc2626; }
            .neutral { color: #6b7280; }
            .chart-placeholder { height: 200px; background: #e5e7eb; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>📊 ROI Tracking Dashboard</h1>
            <p><strong>Period:</strong> ${period} | <strong>User:</strong> ${userId || 'All'} | <strong>Instrument:</strong> ${instrument || 'All'}</p>

            <div class="grid">
              <div class="card">
                <h3>📈 Performance Summary</h3>
                <div class="grid">
                  <div class="metric">
                    <div class="metric-value ${metrics.totalNetPnL >= 0 ? 'positive' : 'negative'}">${metrics.totalNetPnL.toFixed(2)}%</div>
                    <div class="metric-label">Total Return</div>
                  </div>
                  <div class="metric">
                    <div class="metric-value">${metrics.winRate.toFixed(1)}%</div>
                    <div class="metric-label">Win Rate</div>
                  </div>
                  <div class="metric">
                    <div class="metric-value">${metrics.sharpeRatio.toFixed(2)}</div>
                    <div class="metric-label">Sharpe Ratio</div>
                  </div>
                  <div class="metric">
                    <div class="metric-value">${metrics.maxDrawdown.toFixed(2)}%</div>
                    <div class="metric-label">Max Drawdown</div>
                  </div>
                </div>
              </div>

              <div class="card">
                <h3>🎯 Alpha Generation</h3>
                <div class="grid">
                  <div class="metric">
                    <div class="metric-value ${alpha.alpha >= 0 ? 'positive' : 'negative'}">${alpha.alpha.toFixed(4)}</div>
                    <div class="metric-label">Alpha</div>
                  </div>
                  <div class="metric">
                    <div class="metric-value">${alpha.beta.toFixed(2)}</div>
                    <div class="metric-label">Beta</div>
                  </div>
                  <div class="metric">
                    <div class="metric-value">${alpha.informationRatio.toFixed(2)}</div>
                    <div class="metric-label">Information Ratio</div>
                  </div>
                </div>
              </div>

              <div class="card">
                <h3>📊 Risk Metrics</h3>
                <div class="grid">
                  <div class="metric">
                    <div class="metric-value">${metrics.riskMetrics.volatility.toFixed(2)}%</div>
                    <div class="metric-label">Volatility</div>
                  </div>
                  <div class="metric">
                    <div class="metric-value">${metrics.riskMetrics.valueAtRisk.toFixed(2)}%</div>
                    <div class="metric-label">VaR (95%)</div>
                  </div>
                  <div class="metric">
                    <div class="metric-value">${metrics.riskMetrics.tailRisk.toFixed(2)}%</div>
                    <div class="metric-label">Tail Risk</div>
                  </div>
                </div>
              </div>

              <div class="card">
                <h3>📈 Cumulative Returns</h3>
                <div class="chart-placeholder">
                  📊 Chart: Cumulative Returns Over Time<br>
                  Current: ${returns.length > 0 ? returns[returns.length - 1].cumulativeReturn.toFixed(2) : 0}%
                </div>
              </div>

              <div class="card">
                <h3>🏆 Performance by Regime</h3>
                <div class="chart-placeholder">
                  📊 Chart: Performance by Market Regime<br>
                  Best Regime: ${Object.keys(metrics.performanceByRegime).length > 0 ?
                    Object.entries(metrics.performanceByRegime).sort(([,a], [,b]) => (b as any).sharpeRatio - (a as any).sharpeRatio)[0][0] : 'N/A'}
                </div>
              </div>

              <div class="card">
                <h3>⚖️ Position Sizing</h3>
                <div class="grid">
                  <div class="metric">
                    <div class="metric-value">${metrics.positionSizing.averageSize.toFixed(2)}%</div>
                    <div class="metric-label">Avg Position Size</div>
                  </div>
                  <div class="metric">
                    <div class="metric-value">${metrics.positionSizing.maxSize.toFixed(2)}%</div>
                    <div class="metric-label">Max Position Size</div>
                  </div>
                  <div class="metric">
                    <div class="metric-value">${Object.keys(metrics.positionSizing.sizeDistribution).length}</div>
                    <div class="metric-label">Size Buckets</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="card">
              <h3>📋 Detailed Statistics</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f3f4f6;">
                  <th style="padding: 10px; text-align: left; border: 1px solid #e5e7eb;">Metric</th>
                  <th style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">Value</th>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">Total Trades</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${metrics.totalTrades}</td>
                </tr>
                <tr style="background: #f9fafb;">
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">Average Trade Return</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${metrics.averageTradeReturn.toFixed(2)}%</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">Profit Factor</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${metrics.profitFactor.toFixed(2)}</td>
                </tr>
                <tr style="background: #f9fafb;">
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">Calmar Ratio</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">${metrics.calmarRatio.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">Total Fees</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">$${metrics.totalFees.toFixed(2)}</td>
                </tr>
                <tr style="background: #f9fafb;">
                  <td style="padding: 10px; border: 1px solid #e5e7eb;">Total Slippage</td>
                  <td style="padding: 10px; text-align: right; border: 1px solid #e5e7eb;">$${metrics.totalSlippage.toFixed(2)}</td>
                </tr>
              </table>
            </div>
          </div>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error: any) {
      console.error('Error generating ROI dashboard:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/v1/alerts/roi/health
   * Get ROI tracking system health
   */
  router.get('/roi/health', async (req, res) => {
    try {
      const health = roiTrackingService.getHealthStatus();

      res.json({
        status: health.initialized ? 'healthy' : 'unhealthy',
        timestamp: new Date(),
        totalTrades: health.totalTrades,
        lastCalculation: health.lastCalculation,
        cacheSize: health.cacheSize,
        errorCount: health.errorCount
      });
    } catch (error: any) {
      console.error('Error fetching ROI tracking health:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // SIGNAL ACCURACY TRACKING ENDPOINTS
  // ============================================================================

  /**
   * POST /api/v1/alerts/signal-outcomes
   * Record a signal outcome for accuracy tracking
   */
  router.post('/signal-outcomes', async (req, res) => {
    try {
      const {
        signalId,
        signalType,
        outcome,
        confidence,
        alertTriggered = false,
        alertId,
        userId,
        instrument
      } = req.body;

      if (!signalId || !signalType || !outcome || confidence === undefined) {
        return res.status(400).json({
          error: 'Missing required fields: signalId, signalType, outcome, confidence'
        });
      }

      await signalAccuracyTrackingService.recordSignalOutcome(
        signalId,
        signalType,
        outcome as 'TP' | 'FP' | 'TN' | 'FN',
        confidence,
        alertTriggered,
        alertId,
        userId,
        instrument
      );

      res.json({
        success: true,
        message: 'Signal outcome recorded successfully'
      });
    } catch (error: any) {
      console.error('Error recording signal outcome:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/v1/alerts/signal-performance/:signalType
   * Get signal performance metrics for a specific signal type
   */
  router.get('/signal-performance/:signalType', async (req, res) => {
    try {
      const { signalType } = req.params;
      const { start, end, period = '7d' } = req.query;

      if (!['social_media', 'news', 'defi_metrics', 'on_chain', 'price', 'volume', 'technical', 'fundamental'].includes(signalType)) {
        return res.status(400).json({ error: 'Invalid signal type' });
      }

      // Parse time window
      let timeWindow;
      if (start && end) {
        timeWindow = {
          start: new Date(start as string),
          end: new Date(end as string)
        };
      } else {
        const endDate = new Date();
        let startDate: Date;

        switch (period) {
          case '1d':
            startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '30d':
            startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case '90d':
            startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case '7d':
          default:
            startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        }

        timeWindow = { start: startDate, end: endDate };
      }

      const metrics = await signalAccuracyTrackingService.getSignalPerformanceMetrics(
        signalType as any,
        timeWindow
      );

      res.json({
        timestamp: new Date(),
        signalType,
        metrics,
        analysis: {
          performanceLevel: metrics.f1Score > 0.8 ? 'excellent' :
                           metrics.f1Score > 0.7 ? 'good' :
                           metrics.f1Score > 0.6 ? 'average' :
                           metrics.f1Score > 0.5 ? 'poor' : 'critical',
          trend: metrics.performanceTrend,
          trendStrength: metrics.trendStrength,
          needsAttention: metrics.f1Score < 0.6 || metrics.performanceTrend === 'degrading'
        }
      });
    } catch (error: any) {
      console.error('Error fetching signal performance metrics:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/v1/alerts/signal-dashboard
   * Get comprehensive signal performance dashboard
   */
  router.get('/signal-dashboard', async (req, res) => {
    try {
      const { start, end, period = '7d' } = req.query;

      // Parse time window
      let timeWindow;
      if (start && end) {
        timeWindow = {
          start: new Date(start as string),
          end: new Date(end as string)
        };
      } else {
        const endDate = new Date();
        let startDate: Date;

        switch (period) {
          case '1d':
            startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
            break;
          case '30d':
            startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case '90d':
            startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case '7d':
          default:
            startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        }

        timeWindow = { start: startDate, end: endDate };
      }

      const dashboard = await signalAccuracyTrackingService.getSignalPerformanceDashboard(timeWindow);

      res.json({
        timestamp: new Date(),
        dashboard,
        summary: {
          totalSignalsAnalyzed: dashboard.overall.totalSignals,
          averageF1Score: dashboard.overall.averageF1Score,
          bestPerformingSignal: dashboard.overall.bestPerformingSignal,
          worstPerformingSignal: dashboard.overall.worstPerformingSignal,
          driftDetections: dashboard.driftDetections.length,
          activeAlerts: dashboard.alerts.length
        }
      });
    } catch (error: any) {
      console.error('Error fetching signal dashboard:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/v1/alerts/signal-report
   * Generate comprehensive signal performance report
   */
  router.get('/signal-report', async (req, res) => {
    try {
      const report = await signalAccuracyTrackingService.generateSignalPerformanceReport();

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="signal_accuracy_report_${new Date().toISOString().split('T')[0]}.md"`);
      res.send(report);
    } catch (error: any) {
      console.error('Error generating signal report:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/v1/alerts/signal-drift/:signalType
   * Get drift detection results for a specific signal type
   */
  router.get('/signal-drift/:signalType', async (req, res) => {
    try {
      const { signalType } = req.params;

      if (!['social_media', 'news', 'defi_metrics', 'on_chain', 'price', 'volume', 'technical', 'fundamental'].includes(signalType)) {
        return res.status(400).json({ error: 'Invalid signal type' });
      }

      const driftDetection = await signalAccuracyTrackingService.detectSignalDrift(signalType as any);

      if (!driftDetection) {
        return res.json({
          signalType,
          status: 'no_drift_detected',
          message: 'No significant performance drift detected'
        });
      }

      res.json({
        timestamp: new Date(),
        signalType,
        driftDetection,
        recommendations: driftDetection.recommendations,
        actionRequired: driftDetection.actionRequired
      });
    } catch (error: any) {
      console.error('Error detecting signal drift:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/v1/alerts/signal-health
   * Get signal accuracy tracking system health
   */
  router.get('/signal-health', async (req, res) => {
    try {
      const health = signalAccuracyTrackingService.getHealthStatus();

      res.json({
        status: health.initialized ? 'healthy' : 'unhealthy',
        timestamp: new Date(),
        totalSignalsTracked: health.totalSignalsTracked,
        lastAnalysis: health.lastAnalysis,
        cacheSize: health.cacheSize,
        errorCount: health.errorCount,
        driftDetections: health.driftDetections,
        activeAlerts: health.activeAlerts
      });
    } catch (error: any) {
      console.error('Error fetching signal accuracy health:', error);
      res.status(500).json({ error: error.message });
    }
  });

export default router; 