/**
 * ============================================
 * FUSION API TEST SCRIPT
 * ============================================
 * 
 * Tests the Fusion API with simulated data.
 */

import { logger } from '../src/utils/logger';
import { FusionEngine } from '../src/fusion/fusion-engine';
import { PredictiveLinker } from '../src/fusion/predictive-linker';
import { CrossApiCorrelator } from '../src/fusion/cross-api-correlator';
import { UnifiedIntelligence } from '../src/fusion/unified-intelligence';

async function testFusionApi(): Promise<void> {
  logger.info('═══════════════════════════════════════════════════════════════');
  logger.info('🔮 FUSION API TEST');
  logger.info('═══════════════════════════════════════════════════════════════');

  // Create components
  const fusionEngine = new FusionEngine();
  const predictiveLinker = new PredictiveLinker();
  const correlator = new CrossApiCorrelator();
  const intelligence = new UnifiedIntelligence(fusionEngine, predictiveLinker, correlator);

  // ===========================================================================
  // TEST 1: Ingest Price Data
  // ===========================================================================
  logger.info('\n📊 Test 1: Ingesting price data...');
  
  fusionEngine.ingestPrice({
    symbol: 'BTC',
    price: 97500,
    priceChange24h: 3.5,
    volume24h: 45000000000,
    marketCap: 1920000000000,
    timestamp: new Date(),
    source: 'coingecko',
  });

  fusionEngine.ingestPrice({
    symbol: 'ETH',
    price: 3650,
    priceChange24h: -2.1,
    volume24h: 18000000000,
    marketCap: 440000000000,
    timestamp: new Date(),
    source: 'coingecko',
  });

  logger.info('✅ Price data ingested for BTC, ETH');

  // ===========================================================================
  // TEST 2: Ingest Whale Activity
  // ===========================================================================
  logger.info('\n🐋 Test 2: Ingesting whale activity...');
  
  // Simulate whale accumulation
  for (let i = 0; i < 5; i++) {
    fusionEngine.ingestWhaleActivity({
      txHash: `0x${Math.random().toString(16).substr(2, 64)}`,
      from: '0xwhalewallet1',
      to: '0xexchange',
      value: 50 + Math.random() * 50,
      valueUsd: 4500000 + Math.random() * 1000000,
      token: '0xBTCtoken',
      tokenSymbol: 'BTC',
      type: 'transfer',
      timestamp: new Date(),
      isKnownWallet: true,
      walletLabel: 'Whale Wallet #1',
    });
  }

  logger.info('✅ 5 whale transfers ingested for BTC');

  // ===========================================================================
  // TEST 3: Ingest Sentiment Data
  // ===========================================================================
  logger.info('\n📰 Test 3: Ingesting sentiment data...');
  
  fusionEngine.ingestSentiment({
    symbol: 'BTC',
    sentiment: 'bullish',
    score: 72,
    newsCount: 45,
    topHeadlines: [
      'Bitcoin breaks $97K resistance',
      'Institutional adoption accelerates',
      'ETF inflows hit record high',
    ],
    socialMentions: 125000,
    timestamp: new Date(),
  });

  fusionEngine.ingestSentiment({
    symbol: 'ETH',
    sentiment: 'neutral',
    score: 15,
    newsCount: 28,
    topHeadlines: [
      'Ethereum network upgrade progress',
      'DeFi TVL stable',
    ],
    socialMentions: 85000,
    timestamp: new Date(),
  });

  logger.info('✅ Sentiment data ingested for BTC, ETH');

  // ===========================================================================
  // TEST 4: Ingest Liquidity Data
  // ===========================================================================
  logger.info('\n💧 Test 4: Ingesting liquidity data...');
  
  fusionEngine.ingestLiquidity({
    symbol: 'BTC',
    totalLiquidity: 2500000000,
    dexLiquidity: 500000000,
    cexLiquidity: 2000000000,
    bidDepth: 150000000,
    askDepth: 120000000,
    slippage1Pct: 0.15,
    timestamp: new Date(),
  });

  logger.info('✅ Liquidity data ingested for BTC');

  // ===========================================================================
  // TEST 5: Ingest Token Unlock
  // ===========================================================================
  logger.info('\n🔓 Test 5: Ingesting token unlock event...');
  
  fusionEngine.ingestUnlockEvent({
    token: '0xSOLtoken',
    symbol: 'SOL',
    unlockDate: new Date(Date.now() + 3 * 24 * 3600000), // 3 days from now
    amount: 15000000,
    valueUsd: 2250000000,
    percentOfSupply: 3.5,
    type: 'investor',
    impactPrediction: 'high',
  });

  logger.info('✅ Token unlock event ingested for SOL');

  // ===========================================================================
  // TEST 6: Get Unified View
  // ===========================================================================
  logger.info('\n🔮 Test 6: Getting unified view...');
  
  const btcView = await intelligence.getUnifiedView('BTC');
  
  logger.info('BTC Unified View:');
  logger.info(`  Price: $${btcView.market.price.toLocaleString()}`);
  logger.info(`  24h Change: ${btcView.market.priceChange24h > 0 ? '+' : ''}${btcView.market.priceChange24h}%`);
  logger.info(`  Whale Activity: ${btcView.whales.recentActivityCount} transfers`);
  logger.info(`  Net Flow: $${(btcView.whales.netFlow24h / 1e6).toFixed(1)}M`);
  logger.info(`  Sentiment: ${btcView.sentiment.score} (${btcView.sentiment.trend})`);
  logger.info(`  Liquidity Health: ${btcView.liquidity.healthScore}/100`);
  logger.info(`  AI Recommendation: ${btcView.predictions.recommendation.toUpperCase()}`);
  logger.info(`  Confidence: ${btcView.predictions.confidence}%`);
  logger.info(`  Risk Level: ${btcView.predictions.riskLevel}`);

  // ===========================================================================
  // TEST 7: Generate Predictions
  // ===========================================================================
  logger.info('\n🧠 Test 7: Generating AI predictions...');
  
  const prediction = predictiveLinker.predictPrice({
    symbol: 'BTC',
    priceChange24h: 3.5,
    volume24h: 45000000000,
    whaleTransfers24h: 5,
    whaleVolumeUsd: 25000000,
    sentimentScore: 72,
    upcomingUnlockPct: 0,
    daysToUnlock: 999,
    liquidityDepth: 2500000000,
  }, '24h');

  logger.info('BTC 24h Prediction:');
  logger.info(`  Direction: ${prediction.direction.toUpperCase()}`);
  logger.info(`  Magnitude: ${prediction.magnitude}`);
  logger.info(`  Confidence: ${prediction.confidence}%`);
  logger.info(`  Risk: ${prediction.risk.level}`);
  logger.info('  Signals:');
  prediction.signals.forEach(s => {
    logger.info(`    - [${s.type}] ${s.direction}: ${s.description}`);
  });

  // ===========================================================================
  // TEST 8: Check Correlations
  // ===========================================================================
  logger.info('\n🔗 Test 8: Recording correlations...');
  
  correlator.recordPriceEvent('BTC', {
    price: 97500,
    change: 3.5,
    volume: 45000000000,
    source: 'coingecko',
  });

  correlator.recordWhaleEvent('BTC', {
    txHash: '0xtest',
    valueUsd: 5000000,
    direction: 'in',
    walletType: 'whale',
    source: 'alchemy',
  });

  correlator.recordSentimentEvent('BTC', {
    score: 72,
    change: 15,
    newsCount: 45,
    source: 'cryptopanic',
  });

  const correlations = correlator.getCorrelations({ symbol: 'BTC' });
  logger.info(`Found ${correlations.length} correlations for BTC`);

  // ===========================================================================
  // TEST 9: Get Dashboard
  // ===========================================================================
  logger.info('\n📊 Test 9: Getting dashboard...');
  
  const dashboard = await intelligence.getDashboard(['BTC', 'ETH']);
  
  logger.info('Dashboard Overview:');
  logger.info(`  Total Assets: ${dashboard.overview.totalAssets}`);
  logger.info(`  Total Alerts: ${dashboard.overview.totalAlerts}`);
  logger.info(`  Avg Sentiment: ${dashboard.overview.avgSentiment.toFixed(1)}`);
  logger.info(`  Top Mover: ${dashboard.overview.topMover.symbol} (${dashboard.overview.topMover.change > 0 ? '+' : ''}${dashboard.overview.topMover.change.toFixed(1)}%)`);

  // ===========================================================================
  // TEST 10: Get Stats
  // ===========================================================================
  logger.info('\n📈 Test 10: Getting system stats...');
  
  const stats = intelligence.getStats();
  logger.info('System Stats:', JSON.stringify(stats, null, 2));

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  logger.info('\n═══════════════════════════════════════════════════════════════');
  logger.info('✅ FUSION API TEST COMPLETE');
  logger.info('═══════════════════════════════════════════════════════════════');
  logger.info('');
  logger.info('Components tested:');
  logger.info('  ✅ FusionEngine - Data ingestion and fusion');
  logger.info('  ✅ PredictiveLinker - AI price predictions');
  logger.info('  ✅ CrossApiCorrelator - Correlation detection');
  logger.info('  ✅ UnifiedIntelligence - Unified views and dashboards');
  logger.info('');
  logger.info('API Endpoints available:');
  logger.info('  GET  /api/fusion/:symbol         - Unified view for symbol');
  logger.info('  POST /api/fusion/dashboard       - Dashboard for multiple symbols');
  logger.info('  GET  /api/fusion/:symbol/predict - AI prediction');
  logger.info('  GET  /api/fusion/correlations    - Cross-API correlations');
  logger.info('  GET  /api/fusion/alerts          - Fusion alerts');
  logger.info('  POST /api/fusion/ingest/price    - Ingest price data');
  logger.info('  POST /api/fusion/ingest/whale    - Ingest whale activity');
  logger.info('  POST /api/fusion/ingest/sentiment- Ingest sentiment');
  logger.info('  GET  /api/fusion/stats           - System statistics');
  logger.info('  GET  /api/fusion/health          - Health check');
}

testFusionApi().catch(error => {
  logger.error('Fusion API test failed', { error: error.message });
  process.exit(1);
});

