/**
 * =========================================
 * SIGNAL EVALUATION ENGINE DEMO
 * =========================================
 * Example usage of the real-time signal evaluation engine
 */

import { SignalEvaluationEngine, SignalCondition, KafkaConfig, StreamConfig } from '../src/index';

async function runDemo() {
  console.log('⚡ Starting Signal Evaluation Engine Demo...\n');

  // Define signal conditions for alert builder
  const conditions: SignalCondition[] = [
    {
      id: 'high_tvl_change',
      name: 'High TVL Change',
      description: 'Alert when TVL changes by more than 5% in 24 hours',
      type: 'threshold',
      enabled: true,
      parameters: {
        metric: 'totalValueLockedChange24h',
        operator: '>',
        threshold: 0.05,
        window: 86400, // 24 hours
        aggregation: 'max'
      },
      actions: {
        alert: true,
        severity: 'warning',
        channels: ['email', 'slack'],
        cooldown: 3600 // 1 hour
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'extreme_yield_change',
      name: 'Extreme Yield Change',
      description: 'Critical alert for yield changes over 10%',
      type: 'threshold',
      enabled: true,
      parameters: {
        metric: 'apyChange24h',
        operator: '>',
        threshold: 0.10,
        window: 86400,
        aggregation: 'max'
      },
      actions: {
        alert: true,
        severity: 'critical',
        channels: ['email', 'slack', 'sms'],
        cooldown: 1800 // 30 minutes
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'social_media_spike',
      name: 'Social Media Sentiment Spike',
      description: 'Alert for sudden social media sentiment changes',
      type: 'composite',
      enabled: true,
      parameters: {
        metric: 'composite_score',
        operator: '>',
        threshold: 0.8,
        window: 300,
        aggregation: 'avg'
      },
      logic: {
        operator: 'AND',
        conditions: ['social_volume_high', 'sentiment_positive']
      },
      actions: {
        alert: true,
        severity: 'info',
        channels: ['slack'],
        cooldown: 1800
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  // Kafka configuration
  const kafkaConfig: KafkaConfig = {
    brokers: ['localhost:9092'],
    clientId: 'signal-evaluation-demo',
    groupId: 'signal-evaluation-demo-group',
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    maxPollRecords: 500,
    autoCommit: false,
    autoCommitInterval: 5000
  };

  const streamConfig: StreamConfig = {
    inputTopics: ['raw-signals', 'social-media-sentiment', 'news-aggregator', 'defi-protocol-metrics'],
    outputTopics: ['normalized-signals', 'fusion-updates', 'alerts'],
    errorTopic: 'signal-evaluation-errors',
    deadLetterTopic: 'signal-evaluation-dead-letters',
    processingTimeout: 30000,
    batchSize: 100,
    parallelism: 4,
    exactlyOnce: true
  };

  // Initialize the signal evaluation engine
  const engine = new SignalEvaluationEngine({
    kafka: kafkaConfig,
    streams: streamConfig,
    normalization: {
      method: 'z_score',
      windowSize: 1000,
      updateInterval: 60000,
      outlierThreshold: 3.0
    },
    features: {
      enabledFeatures: [
        'temporal', 'statistical', 'volatility', 'momentum',
        'correlation', 'trend', 'composite', 'anomaly'
      ],
      windowSizes: [60, 300, 900, 3600],
      correlationThreshold: 0.7,
      volatilityWindow: 300,
      momentumWindow: 900
    },
    fusion: {
      updateInterval: 5000,
      signalWeights: {
        social_media: 0.3,
        news: 0.4,
        defi_metrics: 0.2,
        on_chain: 0.1,
        price: 0.3,
        volume: 0.2,
        technical: 0.2,
        fundamental: 0.3
      },
      minSignals: 3,
      maxSignals: 20,
      decayFactor: 0.95,
      confidenceThreshold: 0.7
    },
    evaluation: {
      maxConcurrentEvaluations: 100,
      evaluationTimeout: 5000,
      retryAttempts: 3,
      retryDelay: 1000,
      cacheTtl: 300
    },
    conditions
  });

  try {
    // Start the service
    await engine.start();
    console.log('✅ Signal Evaluation Engine started successfully\n');

    // Set up event listeners
    setupEventListeners(engine);

    // Demonstrate ad-hoc condition evaluation
    console.log('🔍 Testing ad-hoc condition evaluation...\n');

    const evaluationRequest = {
      conditionId: 'high_tvl_change',
      signalIds: ['signal_001', 'signal_002', 'signal_003'],
      timestamp: new Date()
    };

    const evaluationResponse = await engine.evaluateConditions(evaluationRequest);

    console.log('📊 Condition Evaluation Results:');
    console.log(`- Success: ${evaluationResponse.success}`);
    console.log(`- Results: ${evaluationResponse.results.length}`);
    console.log(`- Execution Time: ${evaluationResponse.executionTime}ms`);
    console.log(`- Errors: ${evaluationResponse.errors.length}\n`);

    for (const result of evaluationResponse.results) {
      console.log(`   Signal ${result.signalId}: ${result.result ? '✓' : '✗'} (${result.confidence.toFixed(2)} confidence)`);
    }

    // Monitor for 2 minutes then show summary
    console.log('⚡ Processing signals for 2 minutes...\n');

    setTimeout(async () => {
      console.log('📊 Generating summary report...\n');

      // Get health status
      const health = await engine.getHealthStatus();
      console.log('Health Status:');
      console.log(`- Running: ${health.is_running}`);
      console.log(`- Kafka Connected: ${health.kafka_connected}`);
      console.log(`- Processing Active: ${health.processing_active}`);
      console.log(`- Memory Usage: ${health.memory_usage.heap_used_mb.toFixed(1)}MB\n`);

      // Get engine metrics
      const metrics = await engine.getEngineMetrics();
      console.log('Engine Metrics:');
      console.log(`- Signals Processed: ${metrics.totalSignalsProcessed}`);
      console.log(`- Signals/sec: ${metrics.signalsPerSecond.toFixed(2)}`);
      console.log(`- Avg Latency: ${metrics.avgProcessingLatency.toFixed(0)}ms`);
      console.log(`- Error Rate: ${(metrics.errorRate * 100).toFixed(2)}%`);
      console.log(`- Active Conditions: ${metrics.activeConditions}`);
      console.log(`- Fusion Updates: ${metrics.fusionUpdates}\n`);

      // Stop the service
      await engine.stop();
      console.log('✅ Demo completed successfully!\n');

      process.exit(0);

    }, 120000); // 2 minutes

  } catch (error: any) {
    console.error('❌ Demo failed:', error.message);
    await engine.stop();
    process.exit(1);
  }
}

function setupEventListeners(engine: SignalEvaluationEngine) {
  console.log('🎧 Setting up event listeners...\n');

  // Signal processed events
  engine.on('signal_processed', (event) => {
    const signal = event.data;
    console.log(`📊 Signal Processed: ${signal.type} (${signal.id})`);
    console.log(`   Confidence: ${(signal.metadata.confidence * 100).toFixed(1)}%`);
    console.log(`   Features: ${Object.keys(signal.features).length} extracted`);
    console.log('');
  });

  // Condition evaluation events
  engine.on('condition_evaluated', (event) => {
    const result = event.data;
    console.log(`🔍 Condition Evaluated: ${result.conditionId}`);
    console.log(`   Signal: ${result.signalId}`);
    console.log(`   Result: ${result.result ? '✓' : '✗'}`);
    console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
    console.log('');
  });

  // Fusion update events
  engine.on('fusion_updated', (event) => {
    const fusion = event.data;
    console.log(`🔗 Fusion Updated:`);
    console.log(`   Score: ${fusion.fusionScore.toFixed(3)}`);
    console.log(`   Signals: ${fusion.signals.length}`);
    console.log(`   Confidence: ${(fusion.confidence * 100).toFixed(1)}%`);
    console.log(`   Action: ${fusion.recommendations.action} (${fusion.recommendations.priority})`);
    console.log('');
  });

  // Anomaly detection events
  engine.on('anomaly_detected', (event) => {
    const anomaly = event.data;
    console.log(`🚨 ANOMALY DETECTED:`);
    console.log(`   Protocol: ${anomaly.protocol.name}`);
    console.log(`   Metric: ${anomaly.metricType}`);
    console.log(`   Deviation: ${anomaly.deviation.toFixed(2)}σ`);
    console.log(`   Severity: ${anomaly.severity}`);
    console.log('');
  });

  // Error events
  engine.on('error', (event) => {
    const error = event.data;
    console.error(`❌ Error:`, error.error_message);
  });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the demo
if (require.main === module) {
  runDemo().catch((error) => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}

export { runDemo };
