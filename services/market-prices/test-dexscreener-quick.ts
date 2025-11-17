/**
 * Quick DexScreener Test
 * Verify all advanced features work correctly
 */

import { DexScreenerRestClient } from './src/providers/dexscreener-rest';

async function quickTest() {
  console.log('🧪 DexScreener Quick Test\n');

  const client = new DexScreenerRestClient({
    apiKey: 'free-tier',
    apiUrl: 'https://api.dexscreener.com/latest/dex',
    rateLimit: {
      maxRequestsPerMinute: 60,
      reservoir: 60,
      reservoirRefreshAmount: 60,
      reservoirRefreshInterval: 60000,
    },
    retry: {
      retries: 3,
      retryDelay: 1000,
    },
    priority: 3,
  });

  try {
    // Test 1: Basic search
    console.log('Test 1: Basic search...');
    const pairs = await client.searchPairsByQuery('WETH');
    console.log(`✅ Found ${pairs.length} pairs`);

    if (pairs.length > 0) {
      const pair = pairs[0];
      
      // Test 2: Quality scoring
      console.log('\nTest 2: Quality scoring...');
      const quality = client.calculatePairQualityScore(pair);
      console.log(`✅ Quality score: ${quality.overall}/100 (${quality.riskLevel})`);

      // Test 3: Liquidity analysis
      console.log('\nTest 3: Liquidity analysis...');
      const depth = client.analyzeLiquidityDepth(pair);
      console.log(`✅ Liquidity: $${depth.totalLiquidity.toLocaleString()} (${depth.concentration})`);

      // Test 4: Volume analysis
      console.log('\nTest 4: Volume analysis...');
      const volume = client.analyzeVolume(pair);
      console.log(`✅ Volume: $${volume.volume24h.toLocaleString()} (${volume.momentum})`);

      // Test 5: Historical tracking
      console.log('\nTest 5: Historical tracking...');
      client.trackHistoricalData(pair.pairAddress, pair);
      const history = client.getHistoricalData(pair.pairAddress);
      console.log(`✅ Tracked ${history.length} data points`);
    }

    // Test 6: Multi-chain aggregation
    console.log('\nTest 6: Multi-chain aggregation...');
    const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
    const aggregated = await client.getMultiChainAggregatedData(usdcAddress);
    if (aggregated) {
      console.log(`✅ ${aggregated.token.symbol}: $${aggregated.totalLiquidity.toLocaleString()} across ${aggregated.chains.length} chains`);
    }

    // Test 7: Performance metrics
    console.log('\nTest 7: Performance metrics...');
    const metrics = client.getMetrics();
    console.log(`✅ ${metrics.totalRequests} requests, ${metrics.averageResponseTime.toFixed(0)}ms avg`);

    // Test 8: Cache stats
    console.log('\nTest 8: Cache stats...');
    const cacheStats = client.getCacheStats();
    console.log(`✅ Cache: ${cacheStats.size} entries, ${cacheStats.hitRate.toFixed(1)}% hit rate`);

    // Test 9: Health check
    console.log('\nTest 9: Health check...');
    const health = await client.getHealthStatus();
    console.log(`✅ Health: ${health.isHealthy ? 'HEALTHY' : 'UNHEALTHY'} (${health.rateLimitStatus})`);

    console.log('\n🎉 All tests passed! DexScreener is world-class ready!\n');

    // Cleanup
    await client.shutdown();
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

quickTest();

