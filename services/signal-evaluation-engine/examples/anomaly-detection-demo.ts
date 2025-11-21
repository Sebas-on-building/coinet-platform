/**
 * =========================================
 * ANOMALY DETECTION DEMO
 * =========================================
 * Demonstration of the z-score based anomaly detection system
 */

import { SignalEvaluationEngine } from '../src/SignalEvaluationEngine';
import { AnomalyDetector } from '../src/anomaly/AnomalyDetector';
import type { NormalizedSignal, AnomalyEvent } from '../src/types';
import { SignalType } from '../src/types';

// Demo configuration for anomaly detection
const demoConfig = {
  kafka: {
    brokers: ['localhost:9092'],
    clientId: 'anomaly-detection-demo',
    groupId: 'anomaly-detection-demo-group',
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    maxPollRecords: 500,
    autoCommit: false,
    autoCommitInterval: 5000
  },
  streams: {
    inputTopics: ['demo-signals'],
    outputTopics: ['demo-normalized', 'demo-anomalies', 'demo-alerts'],
    errorTopic: 'demo-errors',
    deadLetterTopic: 'demo-dead-letters',
    processingTimeout: 30000,
    batchSize: 100,
    parallelism: 4,
    exactlyOnce: true
  },
  normalization: {
    method: 'z_score' as const,
    windowSize: 100,
    updateInterval: 10000,
    outlierThreshold: 3.0
  },
  features: {
    enabledFeatures: ['temporal', 'statistical', 'anomaly'],
    windowSizes: [60, 300],
    correlationThreshold: 0.7,
    volatilityWindow: 300,
    momentumWindow: 900
  },
  fusion: {
    updateInterval: 5000,
    signalWeights: {
      price: 0.4,
      volume: 0.3,
      social_media: 0.2,
      news: 0.1,
      defi_metrics: 0.0,
      on_chain: 0.0,
      technical: 0.0,
      fundamental: 0.0
    },
    minSignals: 2,
    maxSignals: 10,
    decayFactor: 0.95,
    confidenceThreshold: 0.7
  },
  anomaly: {
    signalTypes: ['price', 'volume', 'social_media'] as const as SignalType[],
    windowSizes: [300, 900], // 5min, 15min
    outlierThreshold: 3.0,
    maxBucketAge: 3600, // 1 hour
    signalConfigs: {
      price: {
        zScoreThreshold: 2.0,
        lowThreshold: 1.5,
        mediumThreshold: 2.0,
        highThreshold: 2.5,
        criticalThreshold: 3.0,
        sustainedPeriod: 30,
        minSustainedCount: 3,
        immediateAlert: false,
        alertChannels: ['alerts'],
        cooldownPeriod: 300,
        domainFilters: {
          minValue: 0.01,
          maxValue: 1000000,
          maxVolatility: 0.5
        }
      },
      volume: {
        zScoreThreshold: 2.5,
        lowThreshold: 2.0,
        mediumThreshold: 2.5,
        highThreshold: 3.0,
        criticalThreshold: 4.0,
        sustainedPeriod: 20,
        minSustainedCount: 2,
        immediateAlert: true,
        alertChannels: ['alerts'],
        cooldownPeriod: 180,
        domainFilters: {
          minValue: 1000,
          maxValue: 1000000000,
          maxVolatility: 1.0
        }
      },
      social_media: {
        zScoreThreshold: 2.0,
        lowThreshold: 1.5,
        mediumThreshold: 2.0,
        highThreshold: 2.5,
        criticalThreshold: 3.5,
        sustainedPeriod: 60,
        minSustainedCount: 2,
        immediateAlert: false,
        alertChannels: ['alerts'],
        cooldownPeriod: 600,
        domainFilters: {
          minValue: 0.1,
          maxValue: 100,
          maxVolatility: 0.8
        }
      },
      news: {
        zScoreThreshold: 2.0,
        lowThreshold: 1.5,
        mediumThreshold: 2.0,
        highThreshold: 2.5,
        criticalThreshold: 3.0,
        sustainedPeriod: 45,
        minSustainedCount: 2,
        immediateAlert: false,
        alertChannels: ['alerts', 'news-alerts'],
        cooldownPeriod: 900,
        domainFilters: {
          businessHoursOnly: true,
          excludeWeekends: true,
          minValue: 0.1,
          maxValue: 10,
          maxVolatility: 0.6,
          minVolatility: 0.02
        }
      },
      defi_metrics: {
        zScoreThreshold: 2.5,
        lowThreshold: 2.0,
        mediumThreshold: 2.5,
        highThreshold: 3.0,
        criticalThreshold: 4.0,
        sustainedPeriod: 25,
        minSustainedCount: 2,
        immediateAlert: true,
        alertChannels: ['alerts', 'defi-alerts'],
        cooldownPeriod: 240,
        domainFilters: {
          businessHoursOnly: false,
          excludeWeekends: false,
          minValue: 0.001,
          maxValue: 1000000,
          maxVolatility: 0.7,
          minVolatility: 0.01
        }
      },
      on_chain: {
        zScoreThreshold: 2.0,
        lowThreshold: 1.5,
        mediumThreshold: 2.0,
        highThreshold: 2.5,
        criticalThreshold: 3.5,
        sustainedPeriod: 40,
        minSustainedCount: 2,
        immediateAlert: false,
        alertChannels: ['alerts', 'onchain-alerts'],
        cooldownPeriod: 480,
        domainFilters: {
          businessHoursOnly: false,
          excludeWeekends: false,
          minValue: 0.1,
          maxValue: 1000000,
          maxVolatility: 0.9,
          minVolatility: 0.02
        }
      },
      technical: {
        zScoreThreshold: 2.0,
        lowThreshold: 1.5,
        mediumThreshold: 2.0,
        highThreshold: 2.5,
        criticalThreshold: 3.0,
        sustainedPeriod: 35,
        minSustainedCount: 2,
        immediateAlert: false,
        alertChannels: ['alerts', 'technical-alerts'],
        cooldownPeriod: 360,
        domainFilters: {
          businessHoursOnly: true,
          excludeWeekends: false,
          minValue: 0.01,
          maxValue: 100,
          maxVolatility: 0.4,
          minVolatility: 0.005
        }
      },
      fundamental: {
        zScoreThreshold: 2.0,
        lowThreshold: 1.5,
        mediumThreshold: 2.0,
        highThreshold: 2.5,
        criticalThreshold: 3.0,
        sustainedPeriod: 90,
        minSustainedCount: 1,
        immediateAlert: false,
        alertChannels: ['alerts', 'fundamental-alerts'],
        cooldownPeriod: 1200,
        domainFilters: {
          businessHoursOnly: true,
          excludeWeekends: true,
          minValue: 0.01,
          maxValue: 1000000,
          maxVolatility: 0.3,
          minVolatility: 0.001
        }
      }
    }
  },
  evaluation: {
    maxConcurrentEvaluations: 50,
    evaluationTimeout: 3000,
    retryAttempts: 2,
    retryDelay: 500,
    cacheTtl: 300
  },
  conditions: []
};

/**
 * Generate sample signals for demonstration
 */
function generateSampleSignals(): NormalizedSignal[] {
  const signals: NormalizedSignal[] = [];
  const baseTime = Date.now() - (3600 * 1000); // 1 hour ago
  const signalTypes: Array<'price' | 'volume' | 'social_media'> = ['price', 'volume', 'social_media'];

  for (let i = 0; i < 1000; i++) {
    const timestamp = new Date(baseTime + (i * 1000)); // 1 second intervals
    const signalType = signalTypes[i % signalTypes.length];

    // Generate normal data with occasional anomalies
    let value: number;
    if (i > 800 && i < 820) {
      // Create sustained anomaly (20 seconds)
      value = signalType === 'price' ? 5 + (Math.random() * 2) : // High price anomaly
              signalType === 'volume' ? 100000 + (Math.random() * 50000) : // High volume anomaly
              8 + (Math.random() * 3); // High social sentiment
    } else if (i > 500 && i < 510) {
      // Create brief anomaly (10 seconds)
      value = signalType === 'price' ? -4 + (Math.random() * 1) : // Low price anomaly
              signalType === 'volume' ? -80000 + (Math.random() * 20000) : // Low volume anomaly
              -6 + (Math.random() * 2); // Low social sentiment
    } else {
      // Normal data
      value = signalType === 'price' ? 1 + (Math.random() * 0.5) : // Normal price
              signalType === 'volume' ? 10000 + (Math.random() * 5000) : // Normal volume
              1 + (Math.random() * 1); // Normal social sentiment
    }

    const signal: NormalizedSignal = {
      id: `signal_${i}`,
      type: signalType,
      source: 'demo-generator',
      timestamp,
      normalizedValues: {
        value: value,
        magnitude: Math.abs(value),
        trend: value > 0 ? 1 : -1
      },
      originalValues: {
        value: value
      },
      features: {
        timestamp: timestamp.getTime(),
        timeOfDay: timestamp.getHours(),
        dayOfWeek: timestamp.getDay(),
        magnitude: Math.abs(value),
        duration: 1,
        frequency: 1,
        mean: value,
        std: 0.1,
        skewness: 0,
        kurtosis: 0,
        min: value,
        max: value,
        range: 0,
        volatility: 0.1,
        momentum: 0.01,
        correlation: 0.5,
        trend: value > 0 ? 1 : -1,
        compositeScore: value,
        anomalyScore: 0,
        impactScore: 0.5
      },
      metadata: {
        sourceId: `demo_${signalType}_${i}`,
        confidence: 0.8 + (Math.random() * 0.2),
        normalizationMethod: 'z_score',
        featureExtractionMethod: 'demo',
        version: '1.0'
      }
    };

    signals.push(signal);
  }

  return signals;
}

/**
 * Demonstrate anomaly detection
 */
async function demonstrateAnomalyDetection() {
  console.log('🚀 Starting Anomaly Detection Demo...\n');

  try {
    // Initialize the engine
    const engine = new SignalEvaluationEngine(demoConfig);

    // Set up event listeners
    engine.on('anomaly_detected', (event: any) => {
      const anomaly = event.data as AnomalyEvent;
      console.log(`🚨 ANOMALY DETECTED:`);
      console.log(`   Signal Type: ${anomaly.signalType}`);
      console.log(`   Z-Score: ${anomaly.zScore.toFixed(2)}`);
      console.log(`   Severity: ${anomaly.severity.toUpperCase()}`);
      console.log(`   Sustained: ${anomaly.isSustained ? 'YES' : 'NO'}`);
      console.log(`   Explanation: ${anomaly.context.explanation}`);
      console.log(`   Time: ${anomaly.timestamp.toISOString()}\n`);
    });

    // Start the engine
    await engine.start();
    console.log('✅ Signal Evaluation Engine started\n');

    // Generate and process sample signals
    const signals = generateSampleSignals();
    console.log(`📊 Processing ${signals.length} sample signals...\n`);

    // Create a simple signal normalizer for demo
    const { SignalNormalizer } = await import('../normalization/SignalNormalizer.js');
    const { FeatureExtractor } = await import('../features/FeatureExtractor.js');

    const normalizer = new SignalNormalizer(demoConfig.normalization);
    const featureExtractor = new FeatureExtractor(demoConfig.features);

    await normalizer.initialize();
    await featureExtractor.initialize();

    for (const signal of signals) {
      try {
        // Create raw signal from normalized signal for demo
        const rawSignal = {
          id: signal.id,
          type: signal.type,
          source: signal.source,
          timestamp: signal.timestamp,
          data: signal.originalValues,
          metadata: {
            sourceId: signal.metadata.sourceId,
            confidence: signal.metadata.confidence,
            version: signal.metadata.version,
            tags: []
          }
        };

        // Normalize the signal
        const normalizedSignal = await normalizer.normalize(rawSignal);

        // Extract features
        const features = await featureExtractor.extractFeatures(normalizedSignal);

        // Update normalized signal with features
        normalizedSignal.features = features;

        // Run anomaly detection
        const anomalyEvents = await engine['anomalyDetector'].detectAnomalies(normalizedSignal);

        // Emit anomaly events if any detected
        for (const anomalyEvent of anomalyEvents) {
          engine.emit('anomaly_detected', {
            type: 'anomaly_detected',
            data: anomalyEvent,
            timestamp: new Date()
          });
        }

        // Small delay to simulate real-time processing
        await new Promise(resolve => setTimeout(resolve, 10));

      } catch (error: any) {
        console.error(`❌ Error processing signal ${signal.id}:`, error.message);
      }
    }

    // Wait a moment for all anomalies to be processed
    console.log('⏳ Waiting for anomaly processing to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Get engine metrics
    const metrics = await engine.getEngineMetrics();
    console.log('\n📈 Engine Metrics:');
    console.log(`   Total Signals Processed: ${metrics.totalSignalsProcessed}`);
    console.log(`   Average Processing Latency: ${metrics.avgProcessingLatency.toFixed(2)}ms`);
    console.log(`   Memory Usage: ${(metrics.memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);

    // Stop the engine
    await engine.stop();
    console.log('\n✅ Demo completed successfully!');

  } catch (error: any) {
    console.error('❌ Demo failed:', error.message);
    process.exit(1);
  }
}

/**
 * Main demo execution
 */
if (require.main === module) {
  demonstrateAnomalyDetection().catch((error) => {
    console.error('❌ Demo crashed:', error);
    process.exit(1);
  });
}

export { demonstrateAnomalyDetection };
