/**
 * =========================================
 * RULE ENGINE
 * =========================================
 * High-performance real-time evaluation of alert rules
 * with sub-100ms latency and logical operator support
 */

import { EventEmitter } from 'events';
import { Logger } from '../utils/Logger';
import type { NormalizedSignal, SignalType } from '../types';
import type {
  AlertRule,
  ASTNode,
  RuleEvaluationContext,
  RuleEvaluationResult,
  AlertNotification,
  AlertEvent,
  RuleUpdateEvent,
  EvaluationEvent,
  PatternMatchResult,
  SequenceNode
} from './types';
import { RuleEvaluationError } from './types';
import { SequentialPatternEngine } from './SequentialPatternEngine';
import { DynamicThresholdEngine } from './DynamicThresholdEngine';
import { CooldownManager } from './CooldownManager';
import { PushNotificationService } from './PushNotificationService';
import { AlertPerformanceAnalytics, AlertOutcome, AlertPerformanceMetrics } from '../../../../apps/ai-analytics/alerts/alert_performance_analytics';
import { UserBehaviorAnalytics } from '../../../../apps/ai-analytics/behavior/user_behavior_analytics';
import { MarketConditionAnalysis } from '../../../../apps/ai-analytics/market-condition-analysis/market_condition_analysis';
import { AlertROITracking, ROIMetrics, TradeExecution } from '../../../../apps/ai-analytics/alerts/alert_roi_tracking';
import { SignalAccuracyTracking, SignalPerformanceMetrics, SignalDriftDetection } from '../../../../apps/ai-analytics/alerts/signal_accuracy_tracking';

export class RuleEngine extends EventEmitter {
  private logger: Logger;
  private isInitialized: boolean = false;
  private isRunning: boolean = false;

  // Rule storage and management
  private rules: Map<string, AlertRule> = new Map<string, AlertRule>();
  private activeRules: Set<string> = new Set<string>();

  // Signal data cache
  private signalCache: Map<SignalType, Map<string, NormalizedSignal>> = new Map<SignalType, Map<string, NormalizedSignal>>(); // signalType -> signalId -> signal

  // Sequential pattern engine
  private sequentialPatternEngine: SequentialPatternEngine;

  // Dynamic threshold engine
  private dynamicThresholdEngine: DynamicThresholdEngine;

  // Cooldown manager for spam prevention
  private cooldownManager: CooldownManager;

  // Push notification service
  private pushNotificationService: PushNotificationService;

  // Alert performance analytics service
  private performanceAnalytics?: AlertPerformanceAnalytics;

  // User behavior analytics service
  private behaviorAnalytics?: UserBehaviorAnalytics;

  // Market condition analysis service
  private marketAnalysis?: MarketConditionAnalysis;

  // ROI tracking service
  private roiTracking?: AlertROITracking;

  // Signal accuracy tracking service
  private signalAccuracyTracking?: SignalAccuracyTracking;

  // Evaluation performance tracking
  private evaluationMetrics: Map<string, {
    totalEvaluations: number;
    totalTime: number;
    lastEvaluation: Date;
    avgLatency: number;
  }> = new Map();

  // Cooldown tracking to prevent spam alerts
  private lastAlertTimes: Map<string, Date> = new Map(); // ruleId -> last alert time

  // Cache for evaluation results
  private evaluationCache: Map<string, {
    result: RuleEvaluationResult;
    expires: number;
  }> = new Map();

  // Performance optimization
  private evaluationQueue: Array<{
    ruleId: string;
    context: RuleEvaluationContext;
    timestamp: number;
  }> = [];

  constructor() {
    super();
    this.logger = new Logger('RuleEngine');
    this.sequentialPatternEngine = new SequentialPatternEngine();
    this.dynamicThresholdEngine = new DynamicThresholdEngine();
    this.cooldownManager = new CooldownManager();
    this.pushNotificationService = new PushNotificationService({
      enabled: true,
      platforms: {
        fcm: {
          enabled: true,
          serverKey: process.env.FCM_SERVER_KEY || '',
          projectId: process.env.FCM_PROJECT_ID || '',
          rateLimit: 1000
        },
        apns: {
          enabled: true,
          keyId: process.env.APNS_KEY_ID || '',
          teamId: process.env.APNS_TEAM_ID || '',
          bundleId: process.env.APNS_BUNDLE_ID || '',
          sandbox: process.env.NODE_ENV !== 'production',
          rateLimit: 500
        },
        web: {
          enabled: true,
          vapidKeys: {
            publicKey: process.env.VAPID_PUBLIC_KEY || '',
            privateKey: process.env.VAPID_PRIVATE_KEY || ''
          }
        }
      },
      queue: {
        enabled: true,
        maxQueueSize: 10000,
        batchSize: 100,
        processingInterval: 1000
      },
      retry: {
        maxRetries: 3,
        baseDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2
      },
      security: {
        tokenEncryption: true,
        auditLogging: true
      }
    });

    // Initialize performance analytics service
    try {
      this.performanceAnalytics = new AlertPerformanceAnalytics({
        database: {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME || 'coinet',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres'
        },
        timeWindows: {
          short: 5, // minutes
          medium: 60, // hours
          long: 7 // days
        },
        calculationIntervals: {
          realTime: 30, // seconds
          batch: 15 // minutes
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

      // Listen for analytics events
      this.performanceAnalytics.on('metricsUpdated', (event) => {
        this.onAnalyticsUpdated(event);
      });

      this.performanceAnalytics.on('outcomeRecorded', (outcome) => {
        this.logger.debug('Alert outcome recorded for analytics', {
          alertId: outcome.alertId,
          outcome: outcome.outcome
        });
      });
    } catch (error: any) {
      this.logger.warn('Failed to initialize performance analytics', error);
    }

    // Initialize user behavior analytics service
    try {
      this.behaviorAnalytics = new UserBehaviorAnalytics({
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
          flushInterval: 30000, // 30 seconds
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
          timeWindowMs: 3600000, // 1 hour
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
          detectionInterval: 60, // minutes
          minDataPoints: 5,
          enableRealTimeDetection: true,
          enableBatchProcessing: true,
          patternRules: [
            {
              patternType: 'alert_fatigue',
              name: 'Alert Fatigue Detection',
              description: 'User showing signs of alert fatigue (high dismiss rate)',
              conditions: [
                { type: 'threshold', metric: 'alert_fatigue_score', operator: '>', value: 0.7 },
                { type: 'trend', metric: 'interaction_frequency', operator: '==', value: 'decreasing' }
              ],
              actions: [
                { type: 'alert_frequency', target: 'frequency', action: 'reduce_by_50_percent', confidence: 0.9 },
                { type: 'content_personalization', target: 'content', action: 'simplify', confidence: 0.8 }
              ],
              priority: 10,
              enabled: true
            },
            {
              patternType: 'dormant_user',
              name: 'Dormant User Detection',
              description: 'User with very low recent activity',
              conditions: [
                { type: 'threshold', metric: 'engagement_level', operator: '<', value: 0.2 },
                { type: 'frequency', metric: 'interactions', timeWindow: 7, operator: '<', value: 2 }
              ],
              actions: [
                { type: 'engagement_strategy', target: 'engagement', action: 're_engagement_campaign', confidence: 0.9 },
                { type: 'alert_frequency', target: 'frequency', action: 'pause_alerts', confidence: 0.7 }
              ],
              priority: 8,
              enabled: true
            },
            {
              patternType: 'high_frequency_trader',
              name: 'High Frequency Trader Detection',
              description: 'User with high trading activity',
              conditions: [
                { type: 'threshold', metric: 'trading_activity', operator: '>', value: 0.7 },
                { type: 'threshold', metric: 'interactions_per_day', operator: '>', value: 10 }
              ],
              actions: [
                { type: 'content_personalization', target: 'content', action: 'advanced_analysis', confidence: 0.9 },
                { type: 'engagement_strategy', target: 'support', action: 'priority_support', confidence: 0.8 }
              ],
              priority: 7,
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
        processingInterval: 60 // minutes
      });

      // Listen for behavior analytics events
      this.behaviorAnalytics.on('userAnalyzed', (event) => {
        this.logger.debug('User behavior analyzed', {
          userId: event.userId.substring(0, 8) + '...',
          segment: event.insights.profile?.segment,
          patterns: event.insights.detectedPatterns.length
        });
      });
        } catch (error: any) {
          this.logger.warn('Failed to initialize user behavior analytics', error);
        }

        // Initialize market condition analysis service
        try {
          this.marketAnalysis = new MarketConditionAnalysis({
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

          // Listen for market analysis events
          this.marketAnalysis.on('marketConditionsUpdated', (conditions) => {
            this.logger.debug('Market conditions updated', {
              regime: conditions.regime,
              confidence: conditions.metadata.confidence
            });
          });

          this.marketAnalysis.on('correlationAnalysisCompleted', (result) => {
            this.logger.debug('Correlation analysis completed', {
              regime: result.regime,
              correlationsAnalyzed: result.results.length
            });
          });

          this.marketAnalysis.on('weightsUpdated', (result) => {
            this.logger.debug('Adaptive weights updated', {
              adjustmentsApplied: result.totalAdjustments
            });
          });
        } catch (error: any) {
          this.logger.warn('Failed to initialize market condition analysis', error);
        }

        // Initialize ROI tracking service
        try {
          this.roiTracking = new AlertROITracking({
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

          // Listen for ROI tracking events
          this.roiTracking.on('tradeRecorded', (trade) => {
            this.logger.debug('Trade execution recorded for ROI tracking', {
              tradeId: trade.tradeId,
              alertId: trade.alertId,
              userId: trade.userId,
              netPnL: trade.netPnL
            });
          });

          this.roiTracking.on('tradeUpdated', (trade) => {
            this.logger.debug('Trade updated for ROI tracking', {
              tradeId: trade.tradeId,
              netPnL: trade.netPnL
            });
          });
        } catch (error: any) {
          this.logger.warn('Failed to initialize ROI tracking', error);
        }

        // Initialize signal accuracy tracking service
        try {
          this.signalAccuracyTracking = new SignalAccuracyTracking({
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

          // Listen for signal accuracy events
          this.signalAccuracyTracking.on('driftDetected', (drift: SignalDriftDetection) => {
            this.logger.warn('Signal drift detected', {
              signalType: drift.signalType,
              driftType: drift.driftType,
              severity: drift.severity,
              description: drift.description
            });

            // Emit drift detection event for external handling
            this.emit('signalDriftDetected', drift);
          });

          this.signalAccuracyTracking.on('signalPerformanceUpdated', (event) => {
            this.logger.debug('Signal performance updated', {
              signalType: event.signalType,
              f1Score: event.metrics.f1Score,
              precision: event.metrics.precision,
              recall: event.metrics.recall
            });
          });
        } catch (error: any) {
          this.logger.warn('Failed to initialize signal accuracy tracking', error);
        }
      }

  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing rule engine...');

      // Reset state
      this.rules.clear();
      this.activeRules.clear();
      this.signalCache.clear();
      this.evaluationMetrics.clear();
      this.lastAlertTimes.clear();
      this.evaluationCache.clear();
      this.evaluationQueue = [];

      // Initialize sequential pattern engine
      await this.sequentialPatternEngine.initialize();

      // Initialize dynamic threshold engine
      await this.dynamicThresholdEngine.initialize();

      // Initialize cooldown manager
      await this.cooldownManager.initialize();

      // Initialize push notification service
      await this.pushNotificationService.initialize();

      // Set up pattern match handling
      this.sequentialPatternEngine.on('patternMatch', (match: PatternMatchResult) => {
        this.handlePatternMatch(match);
      });

      // Set up cooldown manager event handling
      this.cooldownManager.on('groupAlertTriggered', (alert: AlertNotification) => {
        this.emitAlertEvent('alert_triggered', alert.id, alert.ruleId, Object.keys(alert.channels).filter(channel => alert.channels[channel as keyof typeof alert.channels]));
      });

      this.cooldownManager.on('cooldownEvent', (event: any) => {
        this.emit('cooldownEvent', event);
      });

      this.isInitialized = true;
      this.logger.info('✅ Rule engine initialized successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to initialize rule engine', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Rule engine is not initialized');
    }

    try {
      this.logger.info('Starting rule engine...');

      // Start evaluation loop
      this.startEvaluationLoop();

      this.isRunning = true;
      this.logger.info('✅ Rule engine started successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to start rule engine', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      this.logger.info('Stopping rule engine...');

      this.isRunning = false;

      // Clear caches and state
      this.evaluationCache.clear();
      this.evaluationQueue = [];

      // Stop sequential pattern engine
      await this.sequentialPatternEngine.stop();

      // Stop dynamic threshold engine
      // Note: DynamicThresholdEngine doesn't have a stop method yet, but we should add one for consistency

      // Stop push notification service
      await this.pushNotificationService.stop();

      this.isInitialized = false;
      this.logger.info('✅ Rule engine stopped successfully');

    } catch (error: any) {
      this.logger.error('❌ Failed to stop rule engine', error);
      throw error;
    }
  }

  /**
   * Handle pattern match from sequential pattern engine
   */
  private handlePatternMatch(match: PatternMatchResult): void {
    this.logger.info('Pattern match received', {
      patternId: match.patternId,
      ruleId: match.ruleId,
      confidence: match.confidence,
      matchType: match.matchType
    });

    // Emit alert event for pattern match
    const alertEvent: AlertEvent = {
      type: 'alert_triggered',
      alertId: `alert_${match.patternId}_${Date.now()}`,
      ruleId: match.ruleId,
      timestamp: match.matchedAt,
      channels: ['dashboard'], // Would determine based on rule configuration
      error: undefined
    };

    this.emit('alert', alertEvent);
  }

  /**
   * Handle analytics updates from performance analytics service
   */
  private onAnalyticsUpdated(event: { ruleId: string; instrument: string; metrics: AlertPerformanceMetrics }): void {
    this.logger.info('Analytics updated for rule', {
      ruleId: event.ruleId,
      instrument: event.instrument,
      successRate: event.metrics.successRate,
      signalQualityScore: event.metrics.signalQualityScore
    });

    // Update rule thresholds based on analytics
    this.updateRuleThresholdsFromAnalytics(event.ruleId, event.metrics);

    // Emit analytics update event
    this.emit('analyticsUpdated', event);
  }

  /**
   * Update rule thresholds based on analytics performance
   */
  private updateRuleThresholdsFromAnalytics(ruleId: string, metrics: AlertPerformanceMetrics): void {
    const rule = this.rules.get(ruleId);
    if (!rule || !rule.conditions.dynamicThresholds?.enabled) {
      return;
    }

    // Adjust thresholds based on performance metrics
    const signalQualityScore = metrics.signalQualityScore;
    const falsePositiveRate = metrics.falsePositiveRate;

    // If signal quality is high but false positive rate is also high,
    // we might need to increase thresholds to reduce noise
    if (signalQualityScore > 0.7 && falsePositiveRate > 0.3) {
      // Increase threshold to reduce false positives
      this.logger.info('Adjusting thresholds for high-quality but noisy signals', {
        ruleId,
        signalQualityScore,
        falsePositiveRate
      });
    }

    // If signal quality is low, we might need to decrease thresholds
    // to capture more potential signals
    if (signalQualityScore < 0.4 && metrics.recall < 0.5) {
      this.logger.info('Adjusting thresholds for low-quality signals', {
        ruleId,
        signalQualityScore,
        recall: metrics.recall
      });
    }
  }

  /**
   * Determine signal type from rule
   */
  private determineSignalTypeFromRule(rule: AlertRule): SignalType {
    // Extract signal type from rule ID or expression
    // This is a simplified implementation - in practice, this would be more sophisticated
    if (rule.id.includes('market') || rule.id.includes('price')) return 'price';
    if (rule.id.includes('on-chain') || rule.id.includes('chain') || rule.id.includes('on_chain')) return 'on_chain';
    if (rule.id.includes('social')) return 'social_media';
    if (rule.id.includes('news')) return 'news';
    if (rule.id.includes('defi') || rule.id.includes('protocol')) return 'defi_metrics';
    if (rule.id.includes('volume')) return 'volume';
    if (rule.id.includes('technical')) return 'technical';
    if (rule.id.includes('fundamental')) return 'fundamental';

    // Try to extract from AST nodes
    const signalTypes = this.getSignalTypesFromRule(rule);
    if (signalTypes.length > 0) {
      return signalTypes[0]; // Return the first signal type found
    }

    return 'price'; // Default fallback
  }

  /**
   * Extract instrument from matched signals
   */
  private extractInstrumentFromSignals(signals: NormalizedSignal[]): string {
    // Try to extract instrument from signal ID format like "BTC_price" or "AAPL_volume"
    for (const signal of signals) {
      if (signal.id && signal.id.includes('_')) {
        const parts = signal.id.split('_');
        if (parts.length > 0 && parts[0].length <= 10) { // Reasonable instrument symbol length
          return parts[0].toUpperCase();
        }
      }
    }

    // Try to extract from source ID
    for (const signal of signals) {
      if (signal.metadata?.sourceId && signal.metadata.sourceId.includes('_')) {
        const parts = signal.metadata.sourceId.split('_');
        if (parts.length > 0 && parts[0].length <= 10) {
          return parts[0].toUpperCase();
        }
      }
    }

    return 'UNKNOWN';
  }

  /**
   * Record actual alert outcome for performance analysis
   */
  async recordAlertOutcome(
    alertId: string,
    outcome: 'SUCCESS' | 'FAILURE' | 'NEUTRAL' | 'UNKNOWN',
    profitLoss?: number,
    entryPrice?: number,
    exitPrice?: number,
    duration?: number,
    marketRegime?: string
  ): Promise<void> {
    if (!this.performanceAnalytics) {
      return;
    }

    try {
      // Find the alert to get additional context
      const alert = this.findAlertById(alertId);
      if (!alert) {
        this.logger.warn('Alert not found for outcome recording', { alertId });
        return;
      }

      await this.performanceAnalytics.recordAlertOutcome({
        alertId,
        ruleId: alert.ruleId,
        instrument: this.extractInstrumentFromSignals(alert.signals),
        timestamp: alert.triggeredAt,
        outcome,
        profitLoss,
        entryPrice,
        exitPrice,
        duration,
        confidence: alert.context.confidence,
        marketRegime: marketRegime || 'unknown',
        userId: 'system'
      });

      this.logger.debug('Alert outcome recorded', {
        alertId,
        outcome,
        profitLoss
      });
    } catch (error: any) {
      this.logger.error('Failed to record alert outcome', error);
    }
  }

  /**
   * Find alert by ID
   */
  private findAlertById(alertId: string): AlertNotification | undefined {
    // This is a simplified implementation - in practice, you'd maintain
    // a map of active alerts or query the database
    return undefined;
  }

  /**
   * Register dynamic threshold configuration for a rule
   */
  registerThresholdConfig(ruleId: string, config: any): void {
    if (!this.isInitialized) {
      throw new Error('Rule engine is not initialized');
    }

    this.dynamicThresholdEngine.registerThresholdConfig(ruleId, config);
    this.logger.info('Threshold configuration registered', { ruleId });
  }

  /**
   * Add or update a rule
   */
  addRule(rule: AlertRule): void {
    if (!this.isInitialized) {
      throw new Error('Rule engine is not initialized');
    }

    // Validate rule
    this.validateRule(rule);

    // Store rule
    this.rules.set(rule.id, rule);

    // Update active rules
    if (rule.isActive) {
      this.activeRules.add(rule.id);
    } else {
      this.activeRules.delete(rule.id);
    }

    // Initialize metrics
    this.evaluationMetrics.set(rule.id, {
      totalEvaluations: 0,
      totalTime: 0,
      lastEvaluation: new Date(),
      avgLatency: 0
    });

    this.logger.info('Rule added/updated', {
      ruleId: rule.id,
      ruleName: rule.name,
      isActive: rule.isActive,
      expression: rule.expression
    });

    // Emit rule update event
    this.emitRuleUpdate('rule_updated', rule.id, rule);
  }

  /**
   * Remove a rule
   */
  removeRule(ruleId: string): boolean {
    if (!this.isInitialized) {
      throw new Error('Rule engine is not initialized');
    }

    const removed = this.rules.delete(ruleId);
    this.activeRules.delete(ruleId);
    this.evaluationMetrics.delete(ruleId);
    this.lastAlertTimes.delete(ruleId);
    this.evaluationCache.delete(ruleId);

    if (removed) {
      this.logger.info('Rule removed', { ruleId });
      this.emitRuleUpdate('rule_deleted', ruleId);
    }

    return removed;
  }

  /**
   * Activate a rule
   */
  activateRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    rule.isActive = true;
    rule.updatedAt = new Date();
    this.activeRules.add(ruleId);

    this.logger.info('Rule activated', { ruleId });
    this.emitRuleUpdate('rule_activated', ruleId, rule);

    return true;
  }

  /**
   * Deactivate a rule
   */
  deactivateRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    rule.isActive = false;
    rule.updatedAt = new Date();
    this.activeRules.delete(ruleId);

    this.logger.info('Rule deactivated', { ruleId });
    this.emitRuleUpdate('rule_deactivated', ruleId, rule);

    return true;
  }

  /**
   * Update signal data for evaluation
   */
  updateSignalData(signals: NormalizedSignal[]): void {
    if (!this.isInitialized) {
      throw new Error('Rule engine is not initialized');
    }

    // Update signal cache
    for (const signal of signals) {
      if (!this.signalCache.has(signal.type)) {
        this.signalCache.set(signal.type, new Map());
      }

      const typeCache = this.signalCache.get(signal.type)!;
      typeCache.set(signal.id, signal);
    }

    // Clear old signals based on staleness threshold
    this.cleanupStaleSignals();

    // Queue evaluations for active rules
    this.queueRuleEvaluations();

    this.logger.debug('Signal data updated', {
      signalCount: signals.length,
      typesUpdated: Array.from(new Set(signals.map(s => s.type))).length
    });
  }

  /**
   * Evaluate a specific rule
   */
  async evaluateRule(ruleId: string, context?: Partial<RuleEvaluationContext>): Promise<RuleEvaluationResult> {
    if (!this.isInitialized) {
      throw new Error('Rule engine is not initialized');
    }

    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new RuleEvaluationError('Rule not found', ruleId);
    }

    if (!rule.isActive) {
      throw new RuleEvaluationError('Rule is not active', ruleId);
    }

    const startTime = Date.now();
    const evaluationId = `eval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      this.logger.debug('Starting rule evaluation', { ruleId, evaluationId });

      // Check cache first
      const cacheKey = this.getCacheKey(ruleId, context);
      const cached = this.evaluationCache.get(cacheKey);
      if (cached && cached.expires > Date.now()) {
        this.logger.debug('Returning cached evaluation result', { ruleId, evaluationId });
        this.updateEvaluationMetrics(ruleId, Date.now() - startTime, true);
        return cached.result;
      }

      // Prepare evaluation context
      const evaluationContext = this.prepareEvaluationContext(rule, context);

      // Evaluate the rule
      const result = await this.evaluateAST(rule.ast, evaluationContext);

      // Create result object
      const evaluationResult: RuleEvaluationResult = {
        ruleId,
        evaluationTime: new Date(),
        triggered: result.triggered,
        confidence: result.confidence,
        matchedSignals: result.matchedSignals,
        context: {
          signalCounts: this.getSignalCounts(evaluationContext),
          evaluationDuration: Date.now() - startTime,
          lastSignalAge: this.getLastSignalAge(evaluationContext),
          patternStates: this.sequentialPatternEngine.getPatternStatistics().activePatterns,
          thresholdAdaptations: evaluationContext.rule?.conditions.dynamicThresholds?.enabled ?
            this.dynamicThresholdEngine.getThresholdVisualizationData(ruleId)?.historicalThresholds.slice(-5) || [] :
            []
        },
        explanation: result.explanation,
        metadata: {
          evaluationCount: this.evaluationMetrics.get(ruleId)?.totalEvaluations || 0,
          totalEvaluationTime: this.evaluationMetrics.get(ruleId)?.totalTime || 0,
          avgEvaluationTime: this.evaluationMetrics.get(ruleId)?.avgLatency || 0
        }
      };

      // Cache the result
      this.evaluationCache.set(cacheKey, {
        result: evaluationResult,
        expires: Date.now() + (rule.conditions.evaluationWindow * 1000)
      });

      // Update metrics
      this.updateEvaluationMetrics(ruleId, Date.now() - startTime, false);

          // Handle alert triggering
          if (result.triggered) {
            await this.handleAlertTrigger(rule, evaluationResult);

            // Record signal outcome for accuracy tracking
            if (this.signalAccuracyTracking) {
              try {
                // Determine signal type from rule ID or signals
                const signalType = this.determineSignalTypeFromRule(rule);

                // Record true positive (alert was triggered and is valid)
                await this.recordSignalOutcome(
                  `signal_${rule.id}_${Date.now()}`,
                  signalType,
                  'TP', // True Positive - alert was correctly triggered
                  result.confidence,
                  true, // Alert was triggered
                  undefined, // alertId will be set in handleAlertTrigger
                  'system', // Default user
                  this.extractInstrumentFromSignals(result.matchedSignals)
                );
              } catch (error: any) {
                this.logger.warn('Failed to record signal outcome', error);
              }
            }
          } else {
            // Record false negative (signal exists but alert was not triggered)
            if (this.signalAccuracyTracking && result.matchedSignals.length > 0) {
              try {
                const signalType = this.determineSignalTypeFromRule(rule);

                await this.recordSignalOutcome(
                  `signal_${rule.id}_${Date.now()}`,
                  signalType,
                  'FN', // False Negative - signal exists but alert not triggered
                  result.confidence,
                  false, // Alert was not triggered
                  undefined,
                  'system',
                  this.extractInstrumentFromSignals(result.matchedSignals)
                );
              } catch (error: any) {
                this.logger.warn('Failed to record signal outcome', error);
              }
            }
          }

      this.logger.debug('Rule evaluation completed', {
        ruleId,
        evaluationId,
        triggered: result.triggered,
        latency: Date.now() - startTime + 'ms'
      });

      // Emit evaluation event
      this.emitEvaluationEvent('evaluation_completed', ruleId, evaluationId, Date.now() - startTime, evaluationResult);

      return evaluationResult;

    } catch (error: any) {
      this.logger.error('Rule evaluation failed', { ruleId, evaluationId, error: error.message });

      // Update error metrics
      this.updateEvaluationMetrics(ruleId, Date.now() - startTime, false, true);

      // Emit error event
      this.emitEvaluationEvent('evaluation_failed', ruleId, evaluationId, Date.now() - startTime, undefined, error.message);

      throw new RuleEvaluationError(error.message, ruleId, evaluationId);
    }
  }

  /**
   * Evaluate an AST node
   */
  private async evaluateAST(ast: ASTNode, context: RuleEvaluationContext): Promise<{
    triggered: boolean;
    confidence: number;
    matchedSignals: NormalizedSignal[];
    explanation: string;
  }> {
    switch (ast.type) {
      case 'signal_condition':
        return await this.evaluateSignalCondition(ast, context);

      case 'logical_and':
        return this.evaluateLogicalAnd(ast, context);

      case 'logical_or':
        return this.evaluateLogicalOr(ast, context);

      case 'logical_not':
        return this.evaluateLogicalNot(ast, context);

      case 'group':
        return this.evaluateAST(ast.expression, context);

      default:
        throw new RuleEvaluationError(`Unknown AST node type: ${(ast as any).type}`);
    }
  }

  /**
   * Evaluate a signal condition
   */
  private async evaluateSignalCondition(node: any, context: RuleEvaluationContext): Promise<{
    triggered: boolean;
    confidence: number;
    matchedSignals: NormalizedSignal[];
    explanation: string;
  }> {
    const signals = this.getSignalsForCondition(node, context);

    if (signals.length === 0) {
      return {
        triggered: false,
        confidence: 0,
        matchedSignals: [],
        explanation: `No signals found for ${node.signalType}`
      };
    }

    const matchedSignals: NormalizedSignal[] = [];
    let confidence = 0;
    let triggered = false;

    // Get dynamic threshold if configured
    let effectiveThreshold = node.threshold;
    let thresholdAdaptation = null;

    if (context.rule?.conditions.dynamicThresholds?.enabled) {
      const adaptationContext = this.buildThresholdAdaptationContext(signals, context);
      thresholdAdaptation = await this.dynamicThresholdEngine.adaptThreshold(
        context.rule.id,
        node.threshold,
        adaptationContext
      );
      effectiveThreshold = thresholdAdaptation.adaptedThreshold;
    }

    for (const signal of signals) {
      // Extract signal value (simplified - would handle different fields)
      const signalValue = this.extractSignalValue(signal, node.field);

      // Check if condition is met with potentially adapted threshold
      const conditionMet = this.checkCondition(signalValue, node.operator, effectiveThreshold);

      if (conditionMet) {
        matchedSignals.push(signal);
        triggered = true;
        confidence += signal.metadata.confidence;
      }
    }

    confidence = matchedSignals.length > 0 ? confidence / matchedSignals.length : 0;

    const thresholdInfo = thresholdAdaptation
      ? ` (threshold adapted from ${node.threshold} to ${effectiveThreshold.toFixed(3)})`
      : '';

    const explanation = triggered
      ? `${matchedSignals.length} signal(s) met condition: ${node.signalType} ${node.operator} ${effectiveThreshold}${thresholdInfo}`
      : `No signals met condition: ${node.signalType} ${node.operator} ${effectiveThreshold}${thresholdInfo}`;

    return {
      triggered,
      confidence,
      matchedSignals,
      explanation
    };
  }

  /**
   * Evaluate logical AND
   */
  private async evaluateLogicalAnd(node: any, context: RuleEvaluationContext): Promise<{
    triggered: boolean;
    confidence: number;
    matchedSignals: NormalizedSignal[];
    explanation: string;
  }> {
    const leftResult = await this.evaluateAST(node.left, context);
    const rightResult = await this.evaluateAST(node.right, context);

    const triggered = leftResult.triggered && rightResult.triggered;
    const confidence = triggered ? (leftResult.confidence + rightResult.confidence) / 2 : 0;
    const matchedSignals = [...leftResult.matchedSignals, ...rightResult.matchedSignals];

    const explanation = triggered
      ? `Both conditions met: (${leftResult.explanation}) AND (${rightResult.explanation})`
      : `AND condition failed: (${leftResult.explanation}) AND (${rightResult.explanation})`;

    return {
      triggered,
      confidence,
      matchedSignals,
      explanation
    };
  }

  /**
   * Evaluate logical OR
   */
  private async evaluateLogicalOr(node: any, context: RuleEvaluationContext): Promise<{
    triggered: boolean;
    confidence: number;
    matchedSignals: NormalizedSignal[];
    explanation: string;
  }> {
    const leftResult = await this.evaluateAST(node.left, context);
    const rightResult = await this.evaluateAST(node.right, context);

    const triggered = leftResult.triggered || rightResult.triggered;
    const confidence = triggered
      ? Math.max(leftResult.confidence, rightResult.confidence)
      : (leftResult.confidence + rightResult.confidence) / 2;
    const matchedSignals = triggered
      ? [...leftResult.matchedSignals, ...rightResult.matchedSignals]
      : [];

    const explanation = triggered
      ? `OR condition met: (${leftResult.explanation}) OR (${rightResult.explanation})`
      : `OR condition failed: (${leftResult.explanation}) OR (${rightResult.explanation})`;

    return {
      triggered,
      confidence,
      matchedSignals,
      explanation
    };
  }

  /**
   * Evaluate logical NOT
   */
  private async evaluateLogicalNot(node: any, context: RuleEvaluationContext): Promise<{
    triggered: boolean;
    confidence: number;
    matchedSignals: NormalizedSignal[];
    explanation: string;
  }> {
    const operandResult = await this.evaluateAST(node.left, context);

    const triggered = !operandResult.triggered;
    const confidence = operandResult.confidence; // Same confidence for negation
    const matchedSignals = triggered ? operandResult.matchedSignals : [];

    const explanation = triggered
      ? `NOT condition met: NOT (${operandResult.explanation})`
      : `NOT condition failed: NOT (${operandResult.explanation})`;

    return {
      triggered,
      confidence,
      matchedSignals,
      explanation
    };
  }

  /**
   * Get signals for a condition
   */
  private getSignalsForCondition(node: any, context: RuleEvaluationContext): NormalizedSignal[] {
    const signals = context.signals.get(node.signalType) || [];

    // Apply time window filter if specified
    const cutoffTime = context.currentTime.getTime() - (context.evaluationWindow * 1000);

    return signals.filter(signal => {
      // Check staleness threshold
      if (node.window) {
        const signalAge = context.currentTime.getTime() - signal.timestamp.getTime();
        if (signalAge > node.window * 1000) {
          return false;
        }
      }

      // Check rule staleness threshold
      const signalAge = context.currentTime.getTime() - signal.timestamp.getTime();
      return signalAge <= (context.rule?.conditions.stalenessThreshold || 3600) * 1000;
    });
  }

  /**
   * Extract signal value for comparison
   */
  private extractSignalValue(signal: NormalizedSignal, field: string): number {
    // Simplified - would handle different field types
    if (field === 'value' || field === 'primary') {
      const values = Object.values(signal.normalizedValues);
      return values.length > 0 ? values[0] as number : 0;
    }

    // For other fields, would need more complex extraction logic
    return 0;
  }

  /**
   * Check if a condition is met
   */
  private checkCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case '>':
        return value > threshold;
      case '<':
        return value < threshold;
      case '>=':
        return value >= threshold;
      case '<=':
        return value <= threshold;
      case '==':
        return Math.abs(value - threshold) < 0.001; // Floating point comparison
      case '!=':
        return Math.abs(value - threshold) >= 0.001;
      default:
        return false;
    }
  }

  /**
   * Prepare evaluation context
   */
  private prepareEvaluationContext(rule: AlertRule, context?: Partial<RuleEvaluationContext>): RuleEvaluationContext {
    const currentTime = new Date();
    const evaluationWindow = rule.conditions.evaluationWindow;

    // Build signal context from cache
    const signals = new Map<SignalType, NormalizedSignal[]>();

    for (const signalType of this.getSignalTypesFromRule(rule)) {
      const typeSignals = this.signalCache.get(signalType) || new Map();
      const recentSignals = Array.from(typeSignals.values())
        .filter(signal => {
          const age = currentTime.getTime() - signal.timestamp.getTime();
          return age <= evaluationWindow * 1000;
        })
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      signals.set(signalType, recentSignals);
    }

    return {
      signals,
      currentTime,
      evaluationWindow,
      signalHistory: new Map(), // Would be populated with historical data
      rule
    };
  }

  /**
   * Get signal types referenced in a rule
   */
  private getSignalTypesFromRule(rule: AlertRule): SignalType[] {
    const types = new Set<SignalType>();

    const collectTypes = (node: ASTNode) => {
      switch (node.type) {
        case 'signal_condition':
          types.add(node.signalType);
          break;
        case 'logical_and':
        case 'logical_or':
          if (node.left) collectTypes(node.left);
          if (node.right) collectTypes(node.right);
          break;
        case 'logical_not':
          if (node.left) collectTypes(node.left);
          break;
        case 'group':
          if (node.expression) collectTypes(node.expression);
          break;
      }
    };

    collectTypes(rule.ast);
    return Array.from(types);
  }

  /**
   * Queue rule evaluations
   */
  private queueRuleEvaluations(): void {
    for (const ruleId of this.activeRules) {
      const rule = this.rules.get(ruleId);
      if (rule && this.shouldEvaluateRule(rule)) {
        const context = this.prepareEvaluationContext(rule);
        this.evaluationQueue.push({
          ruleId,
          context,
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * Check if a rule should be evaluated
   */
  private shouldEvaluateRule(rule: AlertRule): boolean {
    // Check cooldown period
    const lastAlert = this.lastAlertTimes.get(rule.id);
    if (lastAlert) {
      const timeSinceLastAlert = Date.now() - lastAlert.getTime();
      if (timeSinceLastAlert < rule.metadata.cooldownPeriod * 1000) {
        return false;
      }
    }

    // Check if we have enough signals
    const signalTypes = this.getSignalTypesFromRule(rule);
    for (const signalType of signalTypes) {
      const signals = this.signalCache.get(signalType);
      if (!signals || signals.size < rule.conditions.requiredSignals) {
        return false;
      }
    }

    return true;
  }

  /**
   * Start evaluation loop
   */
  private startEvaluationLoop(): void {
    setInterval(() => {
      this.processEvaluationQueue();
    }, 100); // Evaluate every 100ms for sub-100ms latency
  }

  /**
   * Process evaluation queue
   */
  private processEvaluationQueue(): void {
    if (this.evaluationQueue.length === 0) return;

    // Process evaluations in batches
    const batchSize = 10;
    const batch = this.evaluationQueue.splice(0, batchSize);

    for (const item of batch) {
      this.evaluateRule(item.ruleId, item.context).catch(error => {
        this.logger.error('Queued evaluation failed', {
          ruleId: item.ruleId,
          error: error.message
        });
      });
    }
  }

  /**
   * Handle alert triggering
   */
  private async handleAlertTrigger(rule: AlertRule, result: RuleEvaluationResult): Promise<void> {
    try {
      // Create alert notification
      const alert: AlertNotification = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ruleId: rule.id,
        ruleName: rule.name,
        triggeredAt: result.evaluationTime,
        severity: rule.metadata.severity,
        title: `${rule.name} Alert`,
        description: result.explanation,
        signals: result.matchedSignals,
        context: {
          marketRegime: 'unknown', // Would be determined by market regime detection
          confidence: result.confidence,
          explanation: result.explanation
        },
        channels: rule.channels || {
          email: false,
          webhook: false,
          dashboard: true,
          telegram: false,
          discord: false
        },
        metadata: {
          evaluationResult: result,
          deliveryStatus: {},
          retryCount: 0
        }
      };

      // Record alert trigger for performance analytics
      if (this.performanceAnalytics) {
        try {
          await this.performanceAnalytics.recordAlertOutcome({
            alertId: alert.id,
            ruleId: rule.id,
            instrument: this.extractInstrumentFromSignals(result.matchedSignals),
            timestamp: result.evaluationTime,
            outcome: 'UNKNOWN', // Will be updated when outcome is known
            confidence: result.confidence,
            marketRegime: 'unknown', // Would be determined by market regime detection
            userId: 'system' // Default system user
          });
        } catch (error: any) {
          this.logger.warn('Failed to record alert outcome for analytics', error);
        }
      }

      // Track user interaction for behavior analytics
      if (this.behaviorAnalytics) {
        try {
          // Extract user ID from alert context (simplified - would extract from actual user context)
          const userId = 'user_123'; // Would extract from alert delivery context

          await this.behaviorAnalytics.trackUserInteraction(
            userId,
            'alert_received',
            alert.id,
            rule.id,
            {
              alertConfidence: result.confidence,
              alertSeverity: alert.severity,
              timeToAction: null // Will be updated when user interacts
            },
            {
              timeOfDay: new Date().getHours(),
              dayOfWeek: new Date().getDay(),
              isWeekend: new Date().getDay() === 0 || new Date().getDay() === 6,
              marketRegime: 'unknown'
            },
            true // Consent given (simplified)
          );
        } catch (error: any) {
          this.logger.warn('Failed to track user interaction for behavior analytics', error);
        }
      }

      // Check enhanced cooldown system
      const cooldownResult = this.cooldownManager.checkCooldownSuppression(rule, alert, result.matchedSignals);

      if (cooldownResult.shouldSuppress) {
        this.logger.info('Alert suppressed by cooldown system', {
          alertId: alert.id,
          ruleId: rule.id,
          reason: cooldownResult.reason,
          cooldownPeriod: cooldownResult.cooldownPeriod
        });

        // Emit cooldown event
        this.emit('alertSuppressed', {
          alertId: alert.id,
          ruleId: rule.id,
          reason: cooldownResult.reason,
          cooldownPeriod: cooldownResult.cooldownPeriod
        });

        return; // Don't send the alert
      }

      // Process any expired alert groups
      const expiredGroups = this.cooldownManager.processExpiredGroups();

      // Send the alert
      this.emitAlertEvent('alert_triggered', alert.id, rule.id, Object.keys(alert.channels).filter(channel => alert.channels[channel as keyof typeof alert.channels]));

      // Send push notifications if enabled
      if (alert.channels.dashboard) {
        try {
          await this.pushNotificationService.sendNotification(
            'user_123', // Would extract from alert context
            alert,
            {
              title: alert.title,
              body: alert.description,
              data: {
                alertId: alert.id,
                ruleId: alert.ruleId,
                severity: alert.severity,
                asset: alert.context.marketRegime || 'unknown'
              },
              sound: 'default',
              badge: 1
            }
          );
        } catch (error) {
          this.logger.error('Failed to send push notification', { alertId: alert.id, error: error.message });
        }
      }

      // Handle group alerts
      for (const group of expiredGroups) {
        this.emitAlertEvent('alert_triggered', `group_${group.id}`, 'group_summary', Object.keys(alert.channels).filter(channel => alert.channels[channel as keyof typeof alert.channels]));

        // Send group push notifications
        if (alert.channels.dashboard) {
          try {
            await this.pushNotificationService.sendNotification(
              'user_123', // Would extract from alert context
              group.alerts[0], // Use first alert as representative
              {
                title: `Alert Group: ${group.alerts.length} alerts`,
                body: group.summaryMessage,
                data: {
                  alertId: `group_${group.id}`,
                  ruleId: 'group_summary',
                  severity: group.severity,
                  alertCount: group.alerts.length
                },
                sound: 'default',
                badge: group.alerts.length
              }
            );
          } catch (error) {
            this.logger.error('Failed to send group push notification', { groupId: group.id, error: error.message });
          }
        }
      }

      this.logger.info('Alert triggered', {
        alertId: alert.id,
        ruleId: rule.id,
        severity: alert.severity,
        confidence: result.confidence,
        cooldownBypassed: !!cooldownResult.bypassReason,
        bypassReason: cooldownResult.bypassReason
      });

    } catch (error: any) {
      this.logger.error('Failed to handle alert trigger', {
        ruleId: rule.id,
        error: error.message
      });
    }
  }

  /**
   * Validate rule structure
   */
  private validateRule(rule: AlertRule): void {
    if (!rule.id || !rule.name || !rule.expression) {
      throw new RuleEvaluationError('Rule missing required fields');
    }

    if (!rule.ast) {
      throw new RuleEvaluationError('Rule missing AST');
    }

    if (rule.conditions.evaluationWindow <= 0) {
      throw new RuleEvaluationError('Invalid evaluation window');
    }

    if (rule.conditions.requiredSignals <= 0) {
      throw new RuleEvaluationError('Invalid required signals count');
    }
  }

  /**
   * Update evaluation metrics
   */
  private updateEvaluationMetrics(ruleId: string, duration: number, cached: boolean, isError: boolean = false): void {
    const metrics = this.evaluationMetrics.get(ruleId);
    if (!metrics) return;

    metrics.totalEvaluations++;
    if (!cached) {
      metrics.totalTime += duration;
      metrics.lastEvaluation = new Date();
      metrics.avgLatency = metrics.totalTime / metrics.totalEvaluations;
    }

    if (isError) {
      // Error metrics would be tracked separately
    }
  }

  /**
   * Get signal counts for context
   */
  private getSignalCounts(context: RuleEvaluationContext): Record<SignalType, number> {
    const counts: Record<SignalType, number> = {} as Record<SignalType, number>;

    for (const [signalType, signals] of context.signals) {
      counts[signalType] = signals.length;
    }

    return counts;
  }

  /**
   * Get last signal age
   */
  private getLastSignalAge(context: RuleEvaluationContext): number {
    let lastSignalTime = 0;

    for (const signals of context.signals.values()) {
      for (const signal of signals) {
        lastSignalTime = Math.max(lastSignalTime, signal.timestamp.getTime());
      }
    }

    return lastSignalTime > 0 ? (Date.now() - lastSignalTime) / 1000 : 0;
  }

  /**
   * Build threshold adaptation context from signals and evaluation context
   */
  private buildThresholdAdaptationContext(signals: NormalizedSignal[], context: RuleEvaluationContext) {
    // Calculate average signal strength
    const avgConfidence = signals.reduce((sum, s) => sum + s.metadata.confidence, 0) / signals.length;

    // Calculate signal strength based on values and confidence
    const signalStrength = Math.min(avgConfidence * 1.2, 1.0); // Scale up but cap at 1.0

    // Get historical performance (simplified - would track actual performance metrics)
    const historicalPerformance = 0.7; // Placeholder - would be calculated from actual alert performance

    // Determine market regime (simplified - would use actual market regime detection)
    const marketConditions = 'sideways'; // Placeholder

    // Get user risk tolerance from rule configuration
    const userRiskTolerance = context.rule?.conditions.dynamicThresholds?.userRiskTolerance || 'moderate';

    // Build time context
    const now = new Date();
    const timeContext = {
      hour: now.getHours(),
      dayOfWeek: now.getDay(),
      isWeekend: now.getDay() === 0 || now.getDay() === 6,
      isHoliday: false // Would check actual holiday calendar
    };

    // Estimate market volatility (simplified)
    const marketVolatility = 0.5; // Placeholder

    // Estimate signal noise (simplified)
    const signalNoise = 0.3; // Placeholder

    // Count recent alerts (simplified)
    const recentAlerts = 0; // Would track actual recent alert count

    return {
      signalStrength,
      historicalPerformance,
      marketConditions,
      userRiskTolerance,
      timeContext,
      marketVolatility,
      signalNoise,
      recentAlerts
    };
  }

  /**
   * Clean up stale signals
   */
  private cleanupStaleSignals(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

    for (const [signalType, typeCache] of this.signalCache) {
      for (const [signalId, signal] of typeCache) {
        if (signal.timestamp.getTime() < cutoffTime) {
          typeCache.delete(signalId);
        }
      }

      // Remove empty type caches
      if (typeCache.size === 0) {
        this.signalCache.delete(signalType);
      }
    }
  }

  /**
   * Get cache key for evaluation result
   */
  private getCacheKey(ruleId: string, context?: Partial<RuleEvaluationContext>): string {
    const contextStr = context ? JSON.stringify({
      evaluationWindow: context.evaluationWindow,
      currentTime: context.currentTime?.getTime()
    }) : '';

    return `${ruleId}_${contextStr}`;
  }

  /**
   * Emit rule update event
   */
  private emitRuleUpdate(type: RuleUpdateEvent['type'], ruleId: string, rule?: AlertRule): void {
    const event: RuleUpdateEvent = {
      type,
      ruleId,
      timestamp: new Date(),
      changes: rule
    };

    this.emit('ruleUpdate', event);
  }

  /**
   * Emit evaluation event
   */
  private emitEvaluationEvent(
    type: EvaluationEvent['type'],
    ruleId: string,
    evaluationId: string,
    duration?: number,
    result?: RuleEvaluationResult,
    error?: string
  ): void {
    const event: EvaluationEvent = {
      type,
      ruleId,
      evaluationId,
      timestamp: new Date(),
      duration,
      result,
      error
    };

    this.emit('evaluation', event);
  }

  /**
   * Emit alert event
   */
  private emitAlertEvent(type: AlertEvent['type'], alertId: string, ruleId: string, channels: string[]): void {
    const event: AlertEvent = {
      type,
      alertId,
      ruleId,
      timestamp: new Date(),
      channels
    };

    this.emit('alert', event);
  }

  /**
   * Get all rules
   */
  getAllRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get active rules
   */
  getActiveRules(): AlertRule[] {
    return Array.from(this.activeRules)
      .map(ruleId => this.rules.get(ruleId))
      .filter(rule => rule !== undefined) as AlertRule[];
  }

  /**
   * Get rule by ID
   */
  getRule(ruleId: string): AlertRule | null {
    return this.rules.get(ruleId) || null;
  }

  /**
   * Get evaluation metrics
   */
  getEvaluationMetrics(): Map<string, any> {
    return new Map(this.evaluationMetrics);
  }

  /**
   * Get pattern statistics from sequential pattern engine
   */
  getPatternStatistics(): any {
    return this.sequentialPatternEngine.getPatternStatistics();
  }

  /**
   * Register a sequence pattern for tracking
   */
  registerSequencePattern(ruleId: string, sequenceNode: SequenceNode): string {
    return this.sequentialPatternEngine.registerSequencePattern(ruleId, sequenceNode);
  }

  /**
   * Get threshold visualization data for UI
   */
  getThresholdVisualizationData(ruleId: string) {
    return this.dynamicThresholdEngine.getThresholdVisualizationData(ruleId);
  }

  /**
   * Add manual threshold override
   */
  addManualThresholdOverride(ruleId: string, override: any): string {
    return this.dynamicThresholdEngine.addManualOverride(ruleId, override);
  }

  /**
   * Remove manual threshold override
   */
  removeManualThresholdOverride(ruleId: string, overrideId: string): boolean {
    return this.dynamicThresholdEngine.removeManualOverride(ruleId, overrideId);
  }

  /**
   * Get cooldown statistics
   */
  getCooldownStatistics() {
    return this.cooldownManager.getCooldownStatistics();
  }

  /**
   * Get active cooldowns
   */
  getActiveCooldowns() {
    return this.cooldownManager.getActiveCooldowns();
  }

  /**
   * Get active alert groups
   */
  getActiveGroups() {
    return this.cooldownManager.getActiveGroups();
  }

  /**
   * Update cooldown configuration for a rule
   */
  updateCooldownConfig(ruleId: string, config: any) {
    this.cooldownManager.updateCooldownConfig(ruleId, config);
  }

  /**
   * Register device token for push notifications
   */
  async registerDeviceToken(userId: string, platform: any, token: string, deviceInfo: any): Promise<string> {
    return await this.pushNotificationService.registerDeviceToken(userId, platform, token, deviceInfo);
  }

  /**
   * Unregister device token
   */
  async unregisterDeviceToken(tokenId: string): Promise<boolean> {
    return await this.pushNotificationService.unregisterDeviceToken(tokenId);
  }

  /**
   * Get push notification statistics
   */
  getPushNotificationStatistics() {
    return this.pushNotificationService.getStatistics();
  }

  /**
   * Get push notification provider status
   */
  getPushNotificationProviderStatus() {
    return this.pushNotificationService.getProviderStatus();
  }

  /**
   * Get adaptive weight for signal/rule combination based on current market conditions
   */
  async getAdaptiveWeight(signalType: string, ruleId: string): Promise<number> {
    if (!this.marketAnalysis) {
      return 1.0; // Default weight if market analysis not available
    }

    try {
      // Get current market conditions
      const currentConditions = this.marketAnalysis.getCurrentMarketConditions();
      if (!currentConditions) {
        return 1.0;
      }

      // Get adaptive weight for current regime
      return await this.marketAnalysis.getAdaptiveWeight(signalType, ruleId, currentConditions.regime);
    } catch (error: any) {
      this.logger.error('Failed to get adaptive weight', error);
      return 1.0;
    }
  }

  /**
   * Get current market conditions
   */
  getCurrentMarketConditions(): any {
    return this.marketAnalysis?.getCurrentMarketConditions();
  }

  /**
   * Perform market condition correlation analysis
   */
  async performMarketAnalysis(timeWindow?: { start: Date; end: Date }): Promise<any> {
    if (!this.marketAnalysis) {
      throw new Error('Market condition analysis not available');
    }

    return this.marketAnalysis.performComprehensiveAnalysis(timeWindow);
  }

      /**
       * Record a trade execution for ROI tracking
       */
      async recordTradeExecution(trade: Omit<TradeExecution, 'tradeId' | 'grossPnL' | 'netPnL'>): Promise<string> {
        if (!this.roiTracking) {
          throw new Error('ROI tracking not available');
        }

        return this.roiTracking.recordTradeExecution(trade);
      }

      /**
       * Update trade exit information
       */
      async updateTradeExit(tradeId: string, exitPrice: number, exitTime: Date): Promise<void> {
        if (!this.roiTracking) {
          throw new Error('ROI tracking not available');
        }

        return this.roiTracking.updateTradeExit(tradeId, exitPrice, exitTime);
      }

      /**
       * Calculate ROI metrics for user/instrument/time window
       */
      async calculateROIMetrics(
        userId?: string,
        instrument?: string,
        timeWindow?: { start: Date; end: Date }
      ): Promise<ROIMetrics> {
        if (!this.roiTracking) {
          throw new Error('ROI tracking not available');
        }

        return this.roiTracking.calculateROIMetrics(userId, instrument, timeWindow);
      }

      /**
       * Calculate cumulative returns time series
       */
      async calculateCumulativeReturns(
        userId?: string,
        instrument?: string,
        timeWindow?: { start: Date; end: Date }
      ): Promise<Array<{ timestamp: Date; cumulativeReturn: number; highWaterMark: number; drawdown: number }>> {
        if (!this.roiTracking) {
          throw new Error('ROI tracking not available');
        }

        return this.roiTracking.calculateCumulativeReturns(userId, instrument, timeWindow);
      }

      /**
       * Calculate alpha generation vs benchmark
       */
      async calculateAlpha(
        userId?: string,
        timeWindow?: { start: Date; end: Date }
      ): Promise<{ alpha: number; beta: number; informationRatio: number; benchmarkReturns: number[] }> {
        if (!this.roiTracking) {
          throw new Error('ROI tracking not available');
        }

        return this.roiTracking.calculateAlpha(userId, timeWindow);
      }

      /**
       * Record signal outcome for accuracy tracking
       */
      async recordSignalOutcome(
        signalId: string,
        signalType: SignalType,
        outcome: 'TP' | 'FP' | 'TN' | 'FN',
        confidence: number,
        alertTriggered: boolean = false,
        alertId?: string,
        userId?: string,
        instrument?: string
      ): Promise<void> {
        if (!this.signalAccuracyTracking) {
          return;
        }

        await this.signalAccuracyTracking.recordSignalOutcome(
          signalId,
          signalType,
          outcome,
          confidence,
          alertTriggered,
          alertId,
          userId,
          instrument
        );
      }

      /**
       * Get signal performance metrics
       */
      async getSignalPerformanceMetrics(
        signalType: SignalType,
        timeWindow?: { start: Date; end: Date }
      ): Promise<SignalPerformanceMetrics> {
        if (!this.signalAccuracyTracking) {
          throw new Error('Signal accuracy tracking not available');
        }

        return this.signalAccuracyTracking.getSignalPerformanceMetrics(signalType, timeWindow);
      }

      /**
       * Get signal performance dashboard
       */
      async getSignalPerformanceDashboard(timeWindow?: { start: Date; end: Date }): Promise<any> {
        if (!this.signalAccuracyTracking) {
          throw new Error('Signal accuracy tracking not available');
        }

        return this.signalAccuracyTracking.getSignalPerformanceDashboard(timeWindow);
      }

      /**
       * Generate signal performance report
       */
      async generateSignalPerformanceReport(): Promise<string> {
        if (!this.signalAccuracyTracking) {
          throw new Error('Signal accuracy tracking not available');
        }

        return this.signalAccuracyTracking.generateSignalPerformanceReport();
      }

      /**
       * Get current status
       */
      getStatus(): {
        initialized: boolean;
        running: boolean;
        totalRules: number;
        activeRules: number;
        queuedEvaluations: number;
        cacheSize: number;
        pushNotifications: {
          enabled: boolean;
          providers: Record<string, boolean>;
          queueSize: number;
          activeTokens: number;
        };
        marketAnalysis: {
          enabled: boolean;
          currentRegime: string;
          lastUpdate: Date | null;
        };
        roiTracking: {
          enabled: boolean;
          totalTrades: number;
          lastCalculation: Date | null;
          cacheSize: number;
        };
        signalAccuracyTracking: {
          enabled: boolean;
          totalSignalsTracked: number;
          lastAnalysis: Date | null;
          cacheSize: number;
          driftDetections: number;
          activeAlerts: number;
        };
      } {
    const pushStatus = this.pushNotificationService.getStatus();
    const currentConditions = this.marketAnalysis?.getCurrentMarketConditions();

    return {
      initialized: this.isInitialized,
      running: this.isRunning,
      totalRules: this.rules.size,
      activeRules: this.activeRules.size,
      queuedEvaluations: this.evaluationQueue.length,
      cacheSize: this.evaluationCache.size,
      pushNotifications: {
        enabled: true, // Would check actual service status
        providers: pushStatus.providers,
        queueSize: pushStatus.queueSize,
        activeTokens: pushStatus.activeTokens
      },
      marketAnalysis: {
        enabled: !!this.marketAnalysis,
        currentRegime: currentConditions?.regime || 'unknown',
        lastUpdate: currentConditions?.timestamp || null
      },
      roiTracking: {
        enabled: !!this.roiTracking,
        totalTrades: this.roiTracking?.getHealthStatus().totalTrades || 0,
        lastCalculation: this.roiTracking?.getHealthStatus().lastCalculation || null,
        cacheSize: this.roiTracking?.getHealthStatus().cacheSize || 0
      },
      signalAccuracyTracking: {
        enabled: !!this.signalAccuracyTracking,
        totalSignalsTracked: this.signalAccuracyTracking?.getHealthStatus().totalSignalsTracked || 0,
        lastAnalysis: this.signalAccuracyTracking?.getHealthStatus().lastAnalysis || null,
        cacheSize: this.signalAccuracyTracking?.getHealthStatus().cacheSize || 0,
        driftDetections: this.signalAccuracyTracking?.getHealthStatus().driftDetections || 0,
        activeAlerts: this.signalAccuracyTracking?.getHealthStatus().activeAlerts || 0
      }
    };
  }
}
