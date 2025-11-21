/**
 * Advanced Integration Example
 * Shows how to integrate with external systems and customize behavior
 */

import {
  ProactiveMonitoringSystem,
  DataSource,
  AnomalyType,
  AnomalySeverity,
  Anomaly,
  Alert
} from '../src';

/**
 * Advanced integration with custom behavior
 */
async function advancedIntegration() {
  console.log('🚀 Advanced Integration Example\n');

  // Initialize with production config
  const system = new ProactiveMonitoringSystem({
    monitoring: {
      sources: Object.values(DataSource),
      updateInterval: 1000, // 1 second for demo
      lookbackPeriod: 168, // 1 week
      sensitivityThreshold: 0.6,
      enableRealTime: true,
      enableBatching: true,
      batchSize: 50,
      anomalyThresholds: {
        statistical: 2.5,
        ml: 0.65,
        percentile: 90
      }
    },
    notifications: {
      channels: {
        webhook: {
          enabled: true,
          urls: ['http://localhost:3000/webhook/anomaly']
        },
        slack: {
          enabled: false,
          webhookUrl: process.env.SLACK_WEBHOOK_URL || ''
        }
      },
      defaultChannels: ['webhook'],
      rateLimits: {
        maxAlertsPerMinute: 20,
        maxAlertsPerHour: 200
      }
    },
    autoClassify: true,
    autoSuggestActions: true,
    autoAlert: true,
    persistResults: true,
    dataRetentionHours: 168
  });

  // Setup comprehensive event handlers
  setupEventHandlers(system);

  // Start system
  await system.start();

  // Add custom classification rules
  addCustomClassificationRules(system);

  // Add custom action rules
  addCustomActionRules(system);

  // Simulate complex scenario
  await simulateComplexScenario(system);

  // Generate reports
  await generateReports(system);

  // Cleanup
  await sleep(5000);
  await system.stop();
}

/**
 * Setup comprehensive event handlers
 */
function setupEventHandlers(system: ProactiveMonitoringSystem) {
  // System lifecycle events
  system.on('system_started', (status) => {
    console.log('✅ System Status:', {
      running: status.running,
      uptime: status.uptime,
      baselines: status.statistics.baselinesLearned
    });
  });

  // Anomaly detection events
  system.on('anomaly_detected', async (anomaly: Anomaly) => {
    console.log(`\n🔍 Anomaly: ${anomaly.type.toUpperCase()}`);
    console.log(`   ${anomaly.source} - ${anomaly.dataPoint.symbol}`);
    console.log(`   Score: ${(anomaly.score * 100).toFixed(1)}% | Severity: ${anomaly.severity}`);
    
    // Custom handling based on type
    switch (anomaly.type) {
      case AnomalyType.CRITICAL:
        await handleCriticalAnomaly(anomaly);
        break;
      case AnomalyType.OPPORTUNITY:
        await handleOpportunity(anomaly);
        break;
      case AnomalyType.EMERGING_THREAT:
        await handleThreat(anomaly);
        break;
    }
  });

  // Alert events
  system.on('alert_sent', (alert: Alert) => {
    console.log(`📢 Alert: [${alert.level}] ${alert.title}`);
  });

  // Price alerts
  system.on('price_alert', (alert) => {
    console.log(`💰 Price Alert: ${alert.symbol} ${alert.changePercent > 0 ? '📈' : '📉'} ${alert.changePercent.toFixed(2)}%`);
  });

  // Sentiment shifts
  system.on('sentiment_shift', (shift) => {
    console.log(`💭 Sentiment Shift: ${shift.symbol} from ${shift.previousSentiment.toFixed(2)} to ${shift.currentSentiment.toFixed(2)}`);
  });

  // Suspicious activity
  system.on('suspicious_activity', (activity) => {
    console.log(`⚠️  Suspicious Activity: ${activity.reason} on ${activity.chain}`);
  });

  // Detection complete
  system.on('detection_complete', (result) => {
    if (result.anomalies.length > 0) {
      console.log(`\n📊 Detection Complete: ${result.anomalies.length} anomalies in ${result.processingTime}ms`);
    }
  });
}

/**
 * Handle critical anomalies
 */
async function handleCriticalAnomaly(anomaly: Anomaly) {
  console.log('   🚨 CRITICAL - Triggering emergency protocols');
  
  // In production:
  // - Page on-call engineer
  // - Pause trading bots
  // - Increase monitoring frequency
  // - Notify stakeholders
  
  // Simulate external system integration
  await notifyExternalSystem('critical-anomaly', {
    id: anomaly.id,
    source: anomaly.source,
    severity: anomaly.severity,
    actions: anomaly.suggestedActions
  });
}

/**
 * Handle opportunities
 */
async function handleOpportunity(anomaly: Anomaly) {
  console.log('   ✨ OPPORTUNITY - Evaluating trading potential');
  
  // In production:
  // - Send to trading algorithm
  // - Calculate position size
  // - Check risk parameters
  // - Execute if conditions met
  
  if (anomaly.score > 0.8 && anomaly.severity >= AnomalySeverity.MEDIUM) {
    console.log('   🎯 High-confidence opportunity - would execute trade');
  }
}

/**
 * Handle threats
 */
async function handleThreat(anomaly: Anomaly) {
  console.log('   ⚠️  THREAT - Implementing risk mitigation');
  
  // In production:
  // - Review open positions
  // - Tighten stop losses
  // - Hedge if necessary
  // - Reduce exposure
}

/**
 * Add custom classification rules
 */
function addCustomClassificationRules(system: ProactiveMonitoringSystem) {
  const classifier = system.getClassifier();

  // Custom rule: Detect flash crash
  classifier.addRule({
    name: 'flash_crash',
    condition: (a) =>
      a.source === DataSource.PRICE_MOVEMENT &&
      a.deviation.relativeDifference < -10 &&
      a.context.marketConditions.volume === 'high',
    type: AnomalyType.CRITICAL,
    reasoning: 'Flash crash detected - immediate intervention required',
    confidence: 0.95
  });

  // Custom rule: Whale accumulation during dip
  classifier.addRule({
    name: 'whale_dip_buying',
    condition: (a) =>
      a.source === DataSource.WALLET_ACTIVITY &&
      a.context.marketConditions.trend === 'bearish' &&
      a.dataPoint.metadata?.whaleActivity > 5,
    type: AnomalyType.OPPORTUNITY,
    reasoning: 'Smart money accumulating during price dip',
    confidence: 0.85
  });

  console.log('✅ Custom classification rules added\n');
}

/**
 * Add custom action rules
 */
function addCustomActionRules(system: ProactiveMonitoringSystem) {
  const actionEngine = system.getActionEngine();

  // Custom action for extreme volatility
  actionEngine.addActionRule({
    condition: (a) => a.context.marketConditions.volatility > 0.8,
    template: {
      priority: 'high',
      category: 'hedge',
      description: 'Extreme volatility detected',
      detailsGenerator: (a) =>
        `Volatility at ${(a.context.marketConditions.volatility * 100).toFixed(0)}%. ` +
        `Consider hedging positions and reducing leverage.`,
      estimatedImpact: {
        potential: 'Protect capital during volatile period',
        risk: 'High',
        timeframe: 'Immediate'
      },
      automatable: true
    }
  });

  console.log('✅ Custom action rules added\n');
}

/**
 * Simulate complex scenario
 */
async function simulateComplexScenario(system: ProactiveMonitoringSystem) {
  console.log('🎬 Simulating complex market scenario...\n');

  // Learn baselines
  console.log('📚 Learning baselines...');
  const volumeHistory = generateHistoricalData(2000, 500000, 100000);
  await system.learnHistoricalBaselines(DataSource.TRADING_VOLUME, volumeHistory, 'BTC');
  
  const sentimentHistory = generateHistoricalData(2000, 0.1, 0.3);
  await system.learnHistoricalBaselines(DataSource.SENTIMENT, sentimentHistory, 'BTC');

  // Scenario: Market manipulation followed by legitimate buying
  console.log('\n📖 Scenario: Pump and dump followed by recovery\n');

  // Phase 1: Pump (suspicious)
  console.log('Phase 1: Initial pump (10 seconds)');
  for (let i = 0; i < 10; i++) {
    await system.processTrade({
      symbol: 'BTC',
      price: 45000 + i * 500,
      volume: 600000 + i * 50000, // Increasing volume
      timestamp: new Date(),
      exchange: 'Binance',
      side: 'buy'
    });
    await sleep(1000);
  }

  // Phase 2: Dump (threat)
  console.log('\nPhase 2: Dump (5 seconds)');
  for (let i = 0; i < 5; i++) {
    await system.processTrade({
      symbol: 'BTC',
      price: 50000 - i * 1000,
      volume: 800000 + i * 100000, // High sell volume
      timestamp: new Date(),
      exchange: 'Binance',
      side: 'sell'
    });
    await sleep(1000);
  }

  // Phase 3: Recovery (opportunity)
  console.log('\nPhase 3: Smart money accumulation (5 seconds)');
  for (let i = 0; i < 5; i++) {
    await system.processTrade({
      symbol: 'BTC',
      price: 45000 + i * 200,
      volume: 550000,
      timestamp: new Date(),
      exchange: 'Binance',
      side: 'buy'
    });
    
    // Add positive sentiment
    await system.processSentiment({
      symbol: 'BTC',
      text: 'Strong support levels holding',
      source: 'twitter',
      sentiment: 0.7,
      timestamp: new Date(),
      influence: 0.8
    });
    
    await sleep(1000);
  }

  console.log('\n✅ Scenario simulation complete\n');
}

/**
 * Generate reports
 */
async function generateReports(system: ProactiveMonitoringSystem) {
  console.log('📊 Generating Reports...\n');

  // System statistics
  const stats = system.getStatistics();
  console.log('System Statistics:');
  console.log(`  • Anomalies Detected: ${stats.totalAnomaliesDetected}`);
  console.log(`  • Alerts Generated: ${stats.totalAlertsGenerated}`);
  console.log(`  • Data Points Processed: ${stats.totalDataPointsProcessed}`);
  console.log(`  • Baselines Learned: ${stats.baselinesLearned}`);
  console.log(`  • Queue Size: ${stats.queueSize}`);

  // Alert summary
  const alertSystem = system.getAlertSystem();
  const recentAlerts = alertSystem.getRecentAlerts(10);
  console.log(`\n📬 Recent Alerts: ${recentAlerts.length}`);
  
  const byLevel = recentAlerts.reduce((acc, alert) => {
    acc[alert.level] = (acc[alert.level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  console.log('  By Level:', byLevel);

  // Health check
  const health = await system.healthCheck();
  console.log('\n🏥 System Health:', health.status);
  console.log('  Components:', Object.keys(health.components).map(key => 
    `${key}: ${health.components[key].status}`
  ).join(', '));
}

/**
 * Notify external system (stub)
 */
async function notifyExternalSystem(event: string, data: any): Promise<void> {
  // In production, this would make HTTP request, publish to queue, etc.
  console.log(`   📤 Notifying external system: ${event}`);
}

/**
 * Helper: Generate historical data
 */
function generateHistoricalData(count: number, mean: number, stdDev: number) {
  const data = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const value = mean + z * stdDev;

    data.push({
      timestamp: new Date(now - (count - i) * 3600000),
      source: DataSource.TRADING_VOLUME,
      value: Math.max(0, value),
      metadata: {},
      symbol: 'BTC'
    });
  }

  return data;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run if executed directly
if (require.main === module) {
  advancedIntegration().catch(console.error);
}

export { advancedIntegration };

