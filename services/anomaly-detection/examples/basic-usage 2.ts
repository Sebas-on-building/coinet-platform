/**
 * Basic Usage Example
 * Demonstrates how to use the Proactive Monitoring System
 */

import {
  ProactiveMonitoringSystem,
  DataSource,
  TradeData,
  SentimentData,
  WalletTransaction
} from '../src';

async function main() {
  console.log('🚀 Starting Anomaly Detection Example\n');

  // 1. Create system configuration
  const config = {
    monitoring: {
      sources: [DataSource.TRADING_VOLUME, DataSource.SENTIMENT, DataSource.WALLET_ACTIVITY],
      updateInterval: 5000,
      lookbackPeriod: 24,
      sensitivityThreshold: 0.7,
      enableRealTime: true,
      enableBatching: false,
      anomalyThresholds: {
        statistical: 3,
        ml: 0.7,
        percentile: 95
      }
    },
    notifications: {
      channels: {
        webhook: {
          enabled: true,
          urls: ['http://localhost:3000/webhook']
        }
      },
      defaultChannels: ['webhook'],
      rateLimits: {
        maxAlertsPerMinute: 10,
        maxAlertsPerHour: 100
      }
    },
    autoClassify: true,
    autoSuggestActions: true,
    autoAlert: true,
    persistResults: false,
    dataRetentionHours: 24
  };

  // 2. Initialize system
  const system = new ProactiveMonitoringSystem(config);

  // 3. Setup event listeners
  system.on('anomaly_detected', (anomaly) => {
    console.log(`\n🔍 ANOMALY DETECTED:`);
    console.log(`   Type: ${anomaly.type}`);
    console.log(`   Source: ${anomaly.source}`);
    console.log(`   Severity: ${anomaly.severity}`);
    console.log(`   Score: ${(anomaly.score * 100).toFixed(2)}%`);
    console.log(`   Deviation: ${anomaly.deviation.standardDeviations.toFixed(2)}σ`);
    
    if (anomaly.suggestedActions.length > 0) {
      console.log(`\n   📋 Suggested Actions:`);
      anomaly.suggestedActions.slice(0, 2).forEach(action => {
        console.log(`      - [${action.priority}] ${action.description}`);
      });
    }
  });

  system.on('alert_sent', (alert) => {
    console.log(`\n📢 ALERT: ${alert.title}`);
  });

  // 4. Start the system
  await system.start();
  console.log('✅ System started\n');

  // 5. Learn baselines from historical data
  console.log('📚 Learning baselines from historical data...');
  
  // Generate sample historical data for BTC trading volume
  const historicalVolume = Array.from({ length: 1000 }, (_, i) => ({
    timestamp: new Date(Date.now() - (1000 - i) * 3600000),
    source: DataSource.TRADING_VOLUME,
    value: 100000 + Math.random() * 50000 + Math.sin(i / 24) * 20000, // Normal pattern with daily seasonality
    metadata: {},
    symbol: 'BTC'
  }));

  await system.learnHistoricalBaselines(DataSource.TRADING_VOLUME, historicalVolume, 'BTC');
  console.log('✅ Baseline learned for BTC trading volume\n');

  // 6. Simulate real-time data ingestion
  console.log('📊 Simulating real-time data...\n');

  // Simulate normal trading
  for (let i = 0; i < 5; i++) {
    const trade: TradeData = {
      symbol: 'BTC',
      price: 45000 + Math.random() * 1000,
      volume: 120000 + Math.random() * 20000,
      timestamp: new Date(),
      exchange: 'Binance',
      side: Math.random() > 0.5 ? 'buy' : 'sell'
    };

    await system.processTrade(trade);
    await sleep(1000);
  }

  console.log('   Normal trading processed...');

  // Simulate ANOMALY - massive volume spike
  await sleep(2000);
  console.log('\n⚠️  Injecting ANOMALY: 10x volume spike...');
  
  const anomalousTrade: TradeData = {
    symbol: 'BTC',
    price: 46000,
    volume: 1500000, // 10x normal volume!
    timestamp: new Date(),
    exchange: 'Binance',
    side: 'buy'
  };

  await system.processTrade(anomalousTrade);
  await sleep(2000);

  // Simulate sentiment anomaly
  console.log('\n⚠️  Injecting ANOMALY: Sentiment collapse...');
  
  const sentimentData: SentimentData = {
    symbol: 'BTC',
    text: 'Major negative news about Bitcoin',
    source: 'twitter',
    sentiment: -0.9, // Very negative
    timestamp: new Date(),
    influence: 0.8
  };

  await system.processSentiment(sentimentData);
  await sleep(2000);

  // 7. Check system statistics
  console.log('\n📊 System Statistics:');
  const stats = system.getStatistics();
  console.log(`   Total Anomalies: ${stats.totalAnomaliesDetected}`);
  console.log(`   Total Alerts: ${stats.totalAlertsGenerated}`);
  console.log(`   Data Points Processed: ${stats.totalDataPointsProcessed}`);
  console.log(`   Baselines Learned: ${stats.baselinesLearned}`);

  // 8. Get recent alerts
  const alertSystem = system.getAlertSystem();
  const recentAlerts = alertSystem.getRecentAlerts(5);
  
  if (recentAlerts.length > 0) {
    console.log(`\n📬 Recent Alerts (${recentAlerts.length}):`);
    recentAlerts.forEach((alert, i) => {
      console.log(`   ${i + 1}. [${alert.level}] ${alert.title}`);
    });
  }

  // 9. Cleanup
  await sleep(2000);
  console.log('\n🛑 Stopping system...');
  await system.stop();
  console.log('✅ Example completed successfully!');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run example
main().catch(console.error);

