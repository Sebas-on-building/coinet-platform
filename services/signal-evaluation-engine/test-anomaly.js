/**
 * Simple test script for anomaly detection
 */

const { AnomalyDetector } = require('./dist/anomaly/AnomalyDetector');

// Simple test configuration
const testConfig = {
  signalTypes: ['price', 'volume'],
  windowSizes: [60, 300], // 1min, 5min
  outlierThreshold: 3.0,
  maxBucketAge: 3600,
  signalConfigs: {
    price: {
      zScoreThreshold: 2.0,
      lowThreshold: 1.5,
      mediumThreshold: 2.0,
      highThreshold: 2.5,
      criticalThreshold: 3.0,
      sustainedPeriod: 30,
      minSustainedCount: 2,
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
    }
  }
};

// Generate test signals
function generateTestSignals() {
  const signals = [];
  const baseTime = Date.now() - (600 * 1000); // 10 minutes ago

  for (let i = 0; i < 600; i++) {
    const timestamp = new Date(baseTime + (i * 1000));
    const signalType = i % 2 === 0 ? 'price' : 'volume';

    let value;
    if (i > 500 && i < 520) {
      // Create anomaly
      value = signalType === 'price' ? 5.0 : 100000;
    } else {
      // Normal data
      value = signalType === 'price' ? 1.0 + (Math.random() * 0.5) : 10000 + (Math.random() * 5000);
    }

    const signal = {
      id: `test_signal_${i}`,
      type: signalType,
      source: 'test-generator',
      timestamp,
      normalizedValues: {
        value: value,
        magnitude: Math.abs(value)
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
        sourceId: `test_${signalType}_${i}`,
        confidence: 0.8,
        normalizationMethod: 'z_score',
        featureExtractionMethod: 'test',
        version: '1.0'
      }
    };

    signals.push(signal);
  }

  return signals;
}

async function testAnomalyDetection() {
  console.log('🧪 Testing Anomaly Detection...\n');

  try {
    // Initialize detector
    const detector = new AnomalyDetector(testConfig);
    await detector.initialize();
    console.log('✅ Anomaly Detector initialized\n');

    // Set up event listener
    detector.on('anomaly_detected', (event) => {
      const anomaly = event.data;
      console.log(`🚨 ANOMALY DETECTED:`);
      console.log(`   Signal Type: ${anomaly.signalType}`);
      console.log(`   Z-Score: ${anomaly.zScore.toFixed(2)}`);
      console.log(`   Severity: ${anomaly.severity.toUpperCase()}`);
      console.log(`   Sustained: ${anomaly.isSustained ? 'YES' : 'NO'}`);
      console.log(`   Time: ${anomaly.timestamp.toISOString()}\n`);
    });

    // Generate and process signals
    const signals = generateTestSignals();
    console.log(`📊 Processing ${signals.length} test signals...\n`);

    let anomalyCount = 0;
    for (const signal of signals) {
      try {
        const anomalies = await detector.detectAnomalies(signal);
        if (anomalies.length > 0) {
          anomalyCount += anomalies.length;
        }
      } catch (error) {
        console.error(`Error processing signal ${signal.id}:`, error.message);
      }
    }

    console.log(`✅ Processed all signals. Total anomalies detected: ${anomalyCount}`);

    // Get statistics
    const priceStats = detector.getRollingStatistics('price');
    const volumeStats = detector.getRollingStatistics('volume');

    console.log('\n📈 Statistics Summary:');
    if (priceStats) {
      console.log(`   Price signals processed: ${priceStats.dataPoints}`);
    }
    if (volumeStats) {
      console.log(`   Volume signals processed: ${volumeStats.dataPoints}`);
    }

    await detector.stop();
    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testAnomalyDetection().catch((error) => {
  console.error('❌ Test crashed:', error);
  process.exit(1);
});
