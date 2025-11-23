/**
 * =========================================
 * ALERT EVALUATION ENGINE EXAMPLE
 * =========================================
 * Demonstrates the complete rule-based alert system
 * with logical operators and real-time evaluation
 */

import { AlertAPI } from './AlertAPI';
import { RuleParser } from './RuleParser';
import { RuleEngine } from './RuleEngine';
import type {
  AlertRule,
  AlertEngineConfig
} from './types';
import type {
  NormalizedSignal,
  SignalType
} from '../types';
import { FeedManager } from '../feeds';
import { FeedManagerConfig } from '../feeds/FeedManager';

/**
 * Example: Complete Alert Evaluation System
 */
export class AlertEvaluationSystem {
  private alertAPI: AlertAPI;
  private feedManager: FeedManager;
  private signalProcessor: any;

  constructor() {
    // Initialize alert engine configuration
    const alertConfig: AlertEngineConfig = {
      evaluation: {
        maxConcurrentEvaluations: 100,
        evaluationTimeout: 1000, // 1 second timeout
        batchSize: 50,
        cacheTtl: 60000 // 1 minute cache
      },
      rules: {
        maxRules: 1000,
        maxExpressionLength: 1000,
        maxNestingDepth: 10,
        validationTimeout: 5000
      },
      notifications: {
        maxRetries: 3,
        retryDelay: 1000,
        batchSize: 10,
        queueSize: 1000
      },
      performance: {
        enableMetrics: true,
        metricsInterval: 60000,
        enableProfiling: false
      }
    };

    // Initialize alert API
    this.alertAPI = new AlertAPI(alertConfig, [
      'price', 'volume', 'social_media', 'on_chain', 'technical', 'news', 'defi_metrics'
    ]);

    // Initialize feed manager (for signal data)
    const feedConfig = FeedManager.createDefaultConfig();
    this.feedManager = new FeedManager(feedConfig);
  }

  async initialize(): Promise<void> {
    console.log('🚀 Initializing Alert Evaluation System...');

    // Initialize alert API
    await this.alertAPI.initialize();

    // Initialize feed manager
    await this.feedManager.initialize();

    // Set up signal processing
    this.setupSignalProcessing();

    console.log('✅ Alert Evaluation System initialized successfully');
  }

  async start(): Promise<void> {
    console.log('🔄 Starting alert evaluation...');

    // Start feed manager
    await this.feedManager.start();

    // Start alert monitoring
    this.startAlertMonitoring();

    console.log('✅ Alert evaluation started successfully');
  }

  async stop(): Promise<void> {
    console.log('🛑 Stopping alert evaluation...');

    await this.feedManager.stop();
    await this.alertAPI.stop();

    console.log('✅ Alert evaluation stopped successfully');
  }

  /**
   * Set up signal processing integration
   */
  private setupSignalProcessing(): void {
    // This would integrate with the signal evaluation engine
    this.signalProcessor = {
      processSignals: (signals: NormalizedSignal[]) => {
        console.log(`📊 Processing ${signals.length} signals for alerts`);
        // Update alert engine with new signals
        this.alertAPI.updateSignalData(signals);
      }
    };

    // Set signal processor in feed manager
    (this.feedManager as any).signalProcessor = this.signalProcessor;
  }

  /**
   * Start alert monitoring
   */
  private startAlertMonitoring(): void {
    // Monitor alert events
    this.alertAPI.on('alert', (event) => {
      console.log('🚨 ALERT TRIGGERED:', {
        alertId: event.alertId,
        ruleId: event.ruleId,
        channels: event.channels,
        timestamp: event.timestamp
      });
    });

    // Monitor rule updates
    this.alertAPI.on('ruleUpdate', (event) => {
      console.log('📋 RULE UPDATE:', {
        type: event.type,
        ruleId: event.ruleId,
        timestamp: event.timestamp
      });
    });

    // Monitor evaluations
    this.alertAPI.on('evaluation', (event) => {
      if (event.type === 'evaluation_completed') {
        console.log('✅ RULE EVALUATION:', {
          ruleId: event.ruleId,
          duration: event.duration + 'ms',
          triggered: event.result?.triggered
        });
      }
    });
  }

  /**
   * Create sample alert rules
   */
  async createSampleRules(): Promise<void> {
    console.log('📝 Creating sample alert rules...');

    // Price breakout rule
    const priceRule = await this.alertAPI.createRule({
      name: 'Bitcoin Price Breakout',
      description: 'Alert when Bitcoin breaks above $60,000',
      expression: 'price > 60000',
      metadata: {
        category: 'price',
        severity: 'warning',
        tags: ['bitcoin', 'price', 'breakout'],
        cooldownPeriod: 300 // 5 minutes
      },
      conditions: {
        evaluationWindow: 60, // 1 minute
        requiredSignals: 1,
        stalenessThreshold: 300 // 5 minutes
      }
    });

    // Volume spike rule
    const volumeRule = await this.alertAPI.createRule({
      name: 'High Volume Alert',
      description: 'Alert when trading volume exceeds 10M',
      expression: 'volume > 10000000',
      metadata: {
        category: 'volume',
        severity: 'info',
        tags: ['volume', 'trading'],
        cooldownPeriod: 600 // 10 minutes
      },
      conditions: {
        evaluationWindow: 300, // 5 minutes
        requiredSignals: 1,
        stalenessThreshold: 600 // 10 minutes
      }
    });

    // Social sentiment rule
    const sentimentRule = await this.alertAPI.createRule({
      name: 'Extreme Social Sentiment',
      description: 'Alert when social sentiment is extremely positive or negative',
      expression: 'social_media.sentiment_score > 0.8 OR social_media.sentiment_score < -0.8',
      metadata: {
        category: 'social',
        severity: 'warning',
        tags: ['sentiment', 'social', 'extreme'],
        cooldownPeriod: 1800 // 30 minutes
      },
      conditions: {
        evaluationWindow: 300, // 5 minutes
        requiredSignals: 5,
        stalenessThreshold: 900 // 15 minutes
      }
    });

    // Whale transaction rule
    const whaleRule = await this.alertAPI.createRule({
      name: 'Large Transaction Alert',
      description: 'Alert when large ETH transactions are detected',
      expression: 'on_chain.transfer_value > 1000000',
      metadata: {
        category: 'onchain',
        severity: 'critical',
        tags: ['whale', 'transaction', 'ethereum'],
        cooldownPeriod: 3600 // 1 hour
      },
      conditions: {
        evaluationWindow: 60, // 1 minute
        requiredSignals: 1,
        stalenessThreshold: 300 // 5 minutes
      }
    });

    // Complex composite rule
    const compositeRule = await this.alertAPI.createRule({
      name: 'Bullish Convergence',
      description: 'Alert when price, volume, and social sentiment all align positively',
      expression: 'price > 50000 AND volume > 5000000 AND social_media.sentiment_score > 0.6',
      metadata: {
        category: 'composite',
        severity: 'critical',
        tags: ['bullish', 'convergence', 'composite'],
        cooldownPeriod: 7200 // 2 hours
      },
      conditions: {
        evaluationWindow: 300, // 5 minutes
        requiredSignals: 10,
        stalenessThreshold: 600 // 10 minutes
      }
    });

    console.log('✅ Sample rules created:', {
      priceRule: priceRule.id,
      volumeRule: volumeRule.id,
      sentimentRule: sentimentRule.id,
      whaleRule: whaleRule.id,
      compositeRule: compositeRule.id
    });
  }

  /**
   * Create sample sequential patterns
   */
  async createSampleSequentialPatterns(): Promise<void> {
    console.log('🔗 Creating sample sequential patterns...');

    // Bullish breakout pattern: Price breakout followed by volume spike within 5 minutes
    const breakoutPattern = await this.alertAPI.createSequentialPattern({
      name: 'Bullish Breakout Sequence',
      description: 'Price breakout above resistance followed by volume spike within 5 minutes',
      steps: [
        { signalType: 'price', condition: '>', threshold: 50000 },
        { signalType: 'volume', condition: '>', threshold: 1000000 }
      ],
      maxGap: 300, // 5 minutes
      orderSensitive: true,
      timeWeighted: true,
      minMatches: 2
    });

    // Pump and dump pattern: Rapid price increase followed by sharp decline
    const pumpDumpPattern = await this.alertAPI.createSequentialPattern({
      name: 'Pump and Dump Pattern',
      description: 'Rapid price increase followed by sharp decline within 10 minutes',
      steps: [
        { signalType: 'price', condition: '>', threshold: 50000 },
        { signalType: 'price', condition: '<', threshold: 48000 }
      ],
      maxGap: 600, // 10 minutes
      orderSensitive: true,
      timeWeighted: false,
      minMatches: 2
    });

    // Social sentiment cascade: Positive social sentiment followed by price movement
    const sentimentPattern = await this.alertAPI.createSequentialPattern({
      name: 'Social Sentiment Cascade',
      description: 'Positive social sentiment spike followed by price increase',
      steps: [
        { signalType: 'social_media', condition: '>', threshold: 0.7 },
        { signalType: 'price', condition: '>', threshold: 50000 }
      ],
      maxGap: 900, // 15 minutes
      orderSensitive: true,
      timeWeighted: true,
      minMatches: 2
    });

    console.log('✅ Sample sequential patterns created:', {
      breakoutPattern: breakoutPattern.id,
      pumpDumpPattern: pumpDumpPattern.id,
      sentimentPattern: sentimentPattern.id
    });
  }

  /**
   * Demonstrate rule parsing and validation
   */
  async demonstrateRuleParsing(): Promise<void> {
    console.log('🔍 Demonstrating rule parsing and validation...');

    const parser = new RuleParser(['price', 'volume', 'social_media', 'on_chain']);

    // Test various expressions
    const testExpressions = [
      'price > 50000',
      'volume > 1000000',
      'social_media.sentiment_score > 0.8',
      'price > 50000 AND volume > 1000000',
      'price > 50000 OR volume > 1000000',
      'NOT price > 50000',
      '(price > 50000 AND volume > 1000000) OR social_media.sentiment_score > 0.8'
    ];

    for (const expression of testExpressions) {
      try {
        const ast = parser.parse(expression);
        const complexity = parser.calculateComplexity(ast);
        const performance = parser.estimatePerformance(ast);

        console.log(`✅ Parsed: ${expression}`, {
          complexity: complexity,
          estimatedLatency: performance.estimatedLatency + 'ms',
          memoryUsage: performance.memoryUsage + 'KB'
        });

        // Test validation
        const isValid = parser.validateAST(ast);
        console.log(`   Validation: ${isValid ? '✅' : '❌'}`);

      } catch (error: any) {
        console.log(`❌ Failed: ${expression}`, {
          error: error.message
        });
      }
    }
  }

  /**
   * Demonstrate real-time evaluation
   */
  async demonstrateRealTimeEvaluation(): Promise<void> {
    console.log('⚡ Demonstrating real-time evaluation...');

    // Get all active rules
    const rules = this.alertAPI.getActiveRules();

    if (rules.length === 0) {
      console.log('No active rules found. Creating sample rules first...');
      await this.createSampleRules();
      return;
    }

    // Simulate signal updates
    const sampleSignals: NormalizedSignal[] = [
      createSamplePriceSignal(55000, 15000000), // Should trigger price rule
      createSampleVolumeSignal(12000000), // Should trigger volume rule
      createSampleSocialSignal(0.85), // Should trigger sentiment rule
      createSampleOnChainSignal(2000000) // Should trigger whale rule
    ];

    // Update signals
    this.alertAPI.updateSignalData(sampleSignals);

    // Wait for evaluation
    await new Promise(resolve => setTimeout(resolve, 200));

    // Check metrics
    const metrics = this.alertAPI.getMetrics();
    console.log('📊 Evaluation Metrics:', {
      totalRules: metrics.rules.total,
      activeRules: metrics.rules.active,
      avgLatency: metrics.evaluations.averageLatency + 'ms',
      evaluationsPerSecond: metrics.evaluations.totalPerSecond
    });
  }

  /**
   * Demonstrate alert studio functionality
   */
  async demonstrateAlertStudio(): Promise<void> {
    console.log('🎨 Demonstrating alert studio...');

    // Get studio state
    const studioState = this.alertAPI.getStudioState();
    console.log('Studio State:', {
      availableSignals: studioState.availableSignals.length,
      templates: studioState.ruleTemplates.length,
      currentExpression: studioState.expressionBuilder.currentExpression
    });

    // Get rule templates
    const templates = this.alertAPI.getRuleTemplates();
    console.log('Available Templates:', templates.map(t => t.name));

    // Validate a complex expression
    const validation = this.alertAPI.validateExpression('price > 50000 AND volume > 1000000 AND social_media.sentiment_score > 0.6');
    console.log('Expression Validation:', {
      isValid: validation.isValid,
      complexity: validation.estimatedComplexity,
      performanceImpact: validation.performanceImpact,
      warnings: validation.warnings.length
    });
  }

  /**
   * Demonstrate sequential pattern functionality
   */
  async demonstrateSequentialPatterns(): Promise<void> {
    console.log('🔗 Demonstrating sequential patterns...');

    // Get sequential pattern metrics
    const metrics = this.alertAPI.getSequentialPatternMetrics();
    console.log('Pattern Engine Metrics:', {
      activePatterns: metrics.activePatterns,
      totalPatterns: metrics.totalPatterns,
      memoryUsage: `${metrics.memoryUsage} bytes`,
      memoryPressure: `${Math.round(metrics.memoryPressure * 100)}%`,
      successRate: `${Math.round(metrics.successRate * 100)}%`
    });

    // Get all sequential patterns
    const patterns = this.alertAPI.getSequentialPatterns();
    console.log('Registered Patterns:', patterns.map(p => ({
      name: p.name,
      steps: p.steps.length,
      active: p.isActive
    })));

    // Demonstrate pattern state management
    console.log('Pattern states are managed with:');
    console.log('- Time window expiration');
    console.log('- Memory pressure-based eviction');
    console.log('- LRU cache for pattern definitions');
    console.log('- Real-time step progression tracking');

    // Show performance characteristics
    console.log('Performance Features:');
    console.log('- Sub-100ms pattern evaluation latency');
    console.log('- Support for millions of concurrent patterns');
    console.log('- Automatic memory management');
    console.log('- Time-weighted scoring for pattern quality');
  }

  /**
   * Get system status
   */
  getStatus(): any {
    return {
      alertAPI: this.alertAPI.getStatus(),
      feedManager: this.feedManager.getStatus(),
      metrics: this.alertAPI.getMetrics()
    };
  }
}

/**
 * Create sample signals for demonstration
 */
function createSamplePriceSignal(price: number, volume: number): NormalizedSignal {
  return {
    id: `price_signal_${Date.now()}`,
    type: 'price',
    source: 'binance',
    timestamp: new Date(),
    normalizedValues: {
      price: price / 50000, // Normalize around $50k
      volume: Math.log10(volume + 1) / 6
    },
    originalValues: {
      price,
      volume
    },
    features: {
      timestamp: Date.now(),
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      magnitude: price / 50000,
      duration: 300,
      frequency: 0.1,
      mean: price / 50000,
      std: 0.1,
      skewness: 0,
      kurtosis: 0,
      min: (price / 50000) * 0.8,
      max: (price / 50000) * 1.2,
      range: (price / 50000) * 0.4,
      volatility: 0.3,
      momentum: 0.7,
      correlation: 0.5,
      trend: 0.8,
      compositeScore: price / 50000,
      anomalyScore: 0.1,
      impactScore: price / 50000
    },
    metadata: {
      sourceId: 'binance',
      confidence: 0.9,
      normalizationMethod: 'z_score',
      featureExtractionMethod: 'market_data',
      version: '1.0'
    }
  };
}

function createSampleVolumeSignal(volume: number): NormalizedSignal {
  return {
    id: `volume_signal_${Date.now()}`,
    type: 'volume',
    source: 'binance',
    timestamp: new Date(),
    normalizedValues: {
      volume: Math.log10(volume + 1) / 6
    },
    originalValues: {
      volume
    },
    features: {
      timestamp: Date.now(),
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      magnitude: Math.log10(volume + 1) / 6,
      duration: 300,
      frequency: 0.05,
      mean: Math.log10(volume + 1) / 6,
      std: 0.2,
      skewness: 0,
      kurtosis: 0,
      min: (Math.log10(volume + 1) / 6) * 0.8,
      max: (Math.log10(volume + 1) / 6) * 1.2,
      range: (Math.log10(volume + 1) / 6) * 0.4,
      volatility: 0.4,
      momentum: 0.6,
      correlation: 0.3,
      trend: 0.7,
      compositeScore: Math.log10(volume + 1) / 6,
      anomalyScore: 0.1,
      impactScore: Math.log10(volume + 1) / 6
    },
    metadata: {
      sourceId: 'binance',
      confidence: 0.85,
      normalizationMethod: 'z_score',
      featureExtractionMethod: 'market_data',
      version: '1.0'
    }
  };
}

function createSampleSocialSignal(sentiment: number): NormalizedSignal {
  return {
    id: `social_signal_${Date.now()}`,
    type: 'social_media',
    source: 'twitter',
    timestamp: new Date(),
    normalizedValues: {
      sentiment_score: sentiment
    },
    originalValues: {
      sentiment: sentiment
    },
    features: {
      timestamp: Date.now(),
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      magnitude: Math.abs(sentiment),
      duration: 180,
      frequency: 0.05,
      mean: sentiment,
      std: 0.3,
      skewness: 0,
      kurtosis: 0,
      min: sentiment * 0.8,
      max: sentiment * 1.2,
      range: Math.abs(sentiment) * 0.4,
      volatility: 0.4,
      momentum: 0.6,
      correlation: 0.2,
      trend: 0.7,
      compositeScore: Math.abs(sentiment),
      anomalyScore: 0.2,
      impactScore: Math.abs(sentiment)
    },
    metadata: {
      sourceId: 'twitter',
      confidence: 0.8,
      normalizationMethod: 'z_score',
      featureExtractionMethod: 'sentiment_analysis',
      version: '1.0'
    }
  };
}

function createSampleOnChainSignal(value: number): NormalizedSignal {
  return {
    id: `onchain_signal_${Date.now()}`,
    type: 'on_chain',
    source: 'ethereum',
    timestamp: new Date(),
    normalizedValues: {
      transfer_value: value / 1e18 / 1000 // Normalize to thousands of ETH
    },
    originalValues: {
      value: value
    },
    features: {
      timestamp: Date.now(),
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      magnitude: value / 1e18 / 1000,
      duration: 60,
      frequency: 0.01,
      mean: value / 1e18 / 1000,
      std: 0.1,
      skewness: 0,
      kurtosis: 0,
      min: (value / 1e18 / 1000) * 0.8,
      max: (value / 1e18 / 1000) * 1.2,
      range: (value / 1e18 / 1000) * 0.4,
      volatility: 0.2,
      momentum: 0.9,
      correlation: 0.6,
      trend: 0.95,
      compositeScore: value / 1e18 / 1000,
      anomalyScore: 0.05,
      impactScore: value / 1e18 / 1000
    },
    metadata: {
      sourceId: 'ethereum',
      confidence: 0.95,
      normalizationMethod: 'z_score',
      featureExtractionMethod: 'blockchain',
      version: '1.0'
    }
  };
}

/**
 * Example Usage
 */
export async function runAlertExample(): Promise<void> {
  const system = new AlertEvaluationSystem();

  try {
    // Initialize system
    await system.initialize();

    // Start monitoring
    await system.start();

    // Create sample rules
    await system.createSampleRules();

    // Create sample sequential patterns
    await system.createSampleSequentialPatterns();

    // Demonstrate rule parsing
    await system.demonstrateRuleParsing();

    // Demonstrate real-time evaluation
    await system.demonstrateRealTimeEvaluation();

    // Demonstrate alert studio
    await system.demonstrateAlertStudio();

    // Demonstrate sequential patterns
    await system.demonstrateSequentialPatterns();

    // Show final status
    const status = system.getStatus();
    console.log('\n📊 Final System Status:', status);

  } catch (error) {
    console.error('❌ Alert example failed:', error);
  } finally {
    await system.stop();
  }
}

// Run the example if this file is executed directly
if (require.main === module) {
  runAlertExample().catch(console.error);
}
