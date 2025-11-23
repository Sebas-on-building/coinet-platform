/**
 * =========================================
 * DEFI PROTOCOL METRICS DEMO
 * =========================================
 * Example usage of the DeFi protocol metrics service
 */

import { DeFiProtocolMetrics, ProtocolInfo } from '../src/index';

async function runDemo() {
  console.log('🔗 Starting DeFi Protocol Metrics Demo...\n');

  // Define major DeFi protocols to monitor
  const protocols: ProtocolInfo[] = [
    {
      id: 'uniswap-v3',
      name: 'Uniswap V3',
      type: 'dex',
      network: 'ethereum',
      contractAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      tokenSymbol: 'UNI',
      tokenAddress: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      description: 'Decentralized exchange protocol',
      launchDate: new Date('2021-05-05'),
      isActive: true
    },
    {
      id: 'aave-v3',
      name: 'Aave V3',
      type: 'lending',
      network: 'ethereum',
      contractAddress: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
      tokenSymbol: 'AAVE',
      tokenAddress: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
      description: 'Decentralized lending protocol',
      launchDate: new Date('2022-07-01'),
      isActive: true
    },
    {
      id: 'compound-v3',
      name: 'Compound V3',
      type: 'lending',
      network: 'ethereum',
      contractAddress: '0xc3d688B66703497DAA19211Eedff47f25384cdc3',
      tokenSymbol: 'COMP',
      tokenAddress: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
      description: 'Decentralized lending protocol',
      launchDate: new Date('2022-12-01'),
      isActive: true
    },
    {
      id: 'curve-finance',
      name: 'Curve Finance',
      type: 'dex',
      network: 'ethereum',
      contractAddress: '0xD533a949740bb3306d119CC777fa900bA034cd52',
      tokenSymbol: 'CRV',
      tokenAddress: '0xD533a949740bb3306d119CC777fa900bA034cd52',
      description: 'Stablecoin-focused DEX',
      launchDate: new Date('2020-08-01'),
      isActive: true
    }
  ];

  // Define data providers
  const dataProviders = [
    {
      id: 'defillama',
      name: 'DeFi Llama',
      type: 'api',
      baseUrl: 'https://api.llama.fi',
      rateLimit: {
        requestsPerMinute: 60,
        requestsPerHour: 1000
      },
      supportedProtocols: protocols.map(p => p.id),
      supportedMetrics: ['tvl', 'yields', 'lending'],
      reliability: 0.95,
      lastUsed: new Date(),
      errorCount: 0
    }
  ];

  // Initialize the metrics service
  const metricsService = new DeFiProtocolMetrics({
    enabledProtocols: protocols,
    dataProviders,
    metricsConfig: {
      updateInterval: 60000, // 1 minute
      anomalyThreshold: 2.0,
      minDataPoints: 24,
      cacheTtl: 300,
      rateLimit: {
        requestsPerMinute: 30,
        requestsPerHour: 500
      },
      backfillDays: 7
    },
    signalThresholds: {
      tvlChange: 5.0,        // 5% TVL change triggers signal
      yieldChange: 2.0,      // 2% yield change triggers signal
      lendingChange: 1.0,    // 1% lending rate change triggers signal
      liquidityChange: 10.0, // 10% liquidity change triggers signal
      anomalyThreshold: 3.0  // 3σ anomaly threshold
    }
  });

  try {
    // Start the service
    await metricsService.start();
    console.log('✅ DeFi Protocol Metrics service started successfully\n');

    // Set up event listeners
    setupEventListeners(metricsService);

    // Get initial metrics
    console.log('📊 Fetching initial metrics...\n');

    const tvlMetrics = await metricsService.getTVLMetrics();
    console.log(`📈 TVL Metrics (${tvlMetrics.length} protocols):`);
    for (const metric of tvlMetrics) {
      console.log(`   ${metric.protocol.name}: $${metric.totalValueLocked.toLocaleString()}`);
    }
    console.log('');

    const yieldMetrics = await metricsService.getYieldMetrics();
    console.log(`💰 Yield Metrics (${yieldMetrics.length} pools):`);
    for (const metric of yieldMetrics.slice(0, 5)) { // Show first 5
      console.log(`   ${metric.protocol.name} ${metric.poolName}: ${metric.apy.toFixed(2)}% APY`);
    }
    console.log('');

    // Monitor for 2 minutes then show summary
    console.log('🔍 Monitoring DeFi protocols for 2 minutes...\n');

    setTimeout(async () => {
      console.log('📊 Generating summary report...\n');

      // Get health status
      const health = await metricsService.getHealthStatus();
      console.log('Health Status:');
      console.log(`- Running: ${health.is_running}`);
      console.log(`- Protocols: ${health.active_protocols}`);
      console.log(`- Metrics Processed: ${health.metrics_processed_total}`);
      console.log(`- Metrics/sec: ${health.metrics_per_second.toFixed(2)}`);
      console.log(`- Avg Latency: ${health.avg_processing_latency_ms.toFixed(0)}ms`);
      console.log(`- Error Rate: ${(health.error_rate * 100).toFixed(2)}%\n`);

      // Get recent anomalies
      const anomalies = await metricsService.getRecentAnomalies(10);
      console.log(`🚨 Recent Anomalies (${anomalies.length}):`);
      for (const anomaly of anomalies) {
        console.log(`   ${anomaly.protocol.name} ${anomaly.metricType}: ${anomaly.deviation.toFixed(2)}σ (${anomaly.severity})`);
      }
      console.log('');

      // Get recent signals
      const signals = await metricsService.getRecentSignals(10);
      console.log(`⚡ Recent Signals (${signals.length}):`);
      for (const signal of signals) {
        console.log(`   ${signal.title} (${signal.severity})`);
      }
      console.log('');

      // Stop the service
      await metricsService.stop();
      console.log('✅ Demo completed successfully!\n');

      process.exit(0);

    }, 120000); // 2 minutes

  } catch (error: any) {
    console.error('❌ Demo failed:', error.message);
    await metricsService.stop();
    process.exit(1);
  }
}

function setupEventListeners(metricsService: DeFiProtocolMetrics) {
  console.log('🎧 Setting up event listeners...\n');

  // Metrics events
  metricsService.on('metrics', (event) => {
    const { type, metrics } = event.data;
    console.log(`📊 [${type.toUpperCase()}] ${metrics.protocol.name}:`);
    if (type === 'tvl') {
      console.log(`   TVL: $${metrics.totalValueLocked.toLocaleString()}`);
    } else if (type === 'yield') {
      console.log(`   APY: ${metrics.apy.toFixed(2)}%`);
    }
    console.log('');
  });

  // Anomaly events
  metricsService.on('anomaly', (event) => {
    const anomaly = event.data;
    console.log(`🚨 ANOMALY: ${anomaly.protocol.name} ${anomaly.metricType}`);
    console.log(`   Deviation: ${anomaly.deviation.toFixed(2)}σ (${anomaly.severity})`);
    console.log(`   Description: ${anomaly.description}`);
    console.log('');
  });

  // Signal events
  metricsService.on('signal', (event) => {
    const signal = event.data;
    console.log(`⚡ SIGNAL: ${signal.title}`);
    console.log(`   Type: ${signal.type} (${signal.severity})`);
    console.log(`   Protocol: ${signal.protocol.name}`);
    console.log('');
  });

  // Error events
  metricsService.on('error', (event) => {
    const error = event.data;
    console.error(`❌ Error [${error.protocol}]:`, error.error_message);
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
