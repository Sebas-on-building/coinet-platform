/**
 * DexScreener Advanced Features Example
 * Demonstrates world-class DexScreener integration with all advanced features
 * 
 * Features showcased:
 * - Smart pair quality scoring
 * - Liquidity depth analysis
 * - Volume and momentum analysis
 * - Multi-chain aggregation
 * - Historical data tracking
 * - Pre-caching system
 * - Performance metrics
 * - Intelligent batch queries
 */

import { DexScreenerRestClient } from '../providers/dexscreener-rest';

async function demonstrateAdvancedFeatures() {
  console.log('🚀 DexScreener Advanced Features Demo\n');

  // Initialize client
  const client = new DexScreenerRestClient({
    apiKey: process.env.DEXSCREENER_API_KEY || 'free-tier',
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

  // ==================== 1. SMART PAIR QUALITY SCORING ====================
  console.log('📊 1. Smart Pair Quality Scoring\n');
  
  const ethPairs = await client.searchPairsByQuery('WETH');
  if (ethPairs.length > 0) {
    const pair = ethPairs[0];
    const quality = client.calculatePairQualityScore(pair);
    
    console.log(`Pair: ${client.normalizePairIdentifier(pair)}`);
    console.log(`Chain: ${pair.chainId}`);
    console.log(`DEX: ${pair.dexId}`);
    console.log(`\nQuality Score: ${quality.overall}/100`);
    console.log(`├─ Liquidity: ${quality.liquidityScore}/30`);
    console.log(`├─ Volume: ${quality.volumeScore}/25`);
    console.log(`├─ Activity: ${quality.activityScore}/25`);
    console.log(`└─ Age: ${quality.ageScore}/20`);
    console.log(`\nRisk Level: ${quality.riskLevel.toUpperCase()}`);
    if (quality.flags.length > 0) {
      console.log(`Flags: ${quality.flags.join(', ')}`);
    }
  }

  // ==================== 2. LIQUIDITY DEPTH ANALYSIS ====================
  console.log('\n💧 2. Liquidity Depth Analysis\n');
  
  if (ethPairs.length > 0) {
    const pair = ethPairs[0];
    const depth = client.analyzeLiquidityDepth(pair);
    
    console.log(`Total Liquidity: $${depth.totalLiquidity.toLocaleString()}`);
    console.log(`Base Depth: ${depth.baseDepth.toFixed(2)}`);
    console.log(`Quote Depth: ${depth.quoteDepth.toFixed(2)}`);
    console.log(`Depth Ratio: ${depth.depthRatio.toFixed(2)}`);
    console.log(`Is Balanced: ${depth.isBalanced ? '✅' : '❌'}`);
    console.log(`Concentration: ${depth.concentration}`);
  }

  // ==================== 3. VOLUME & MOMENTUM ANALYSIS ====================
  console.log('\n📈 3. Volume & Momentum Analysis\n');
  
  if (ethPairs.length > 0) {
    const pair = ethPairs[0];
    const volume = client.analyzeVolume(pair);
    
    console.log(`24h Volume: $${volume.volume24h.toLocaleString()}`);
    console.log(`Volume Change: ${volume.volumeChange24h.toFixed(2)}%`);
    console.log(`Buy Pressure: ${volume.buyPressure.toFixed(1)}%`);
    console.log(`Sell Pressure: ${volume.sellPressure.toFixed(1)}%`);
    console.log(`Momentum: ${volume.momentum.toUpperCase()} ${
      volume.momentum === 'bullish' ? '🟢' : 
      volume.momentum === 'bearish' ? '🔴' : '⚪'
    }`);
  }

  // ==================== 4. MULTI-CHAIN AGGREGATION ====================
  console.log('\n🌐 4. Multi-Chain Aggregation\n');
  
  // Example with USDC (multi-chain token)
  const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'; // Ethereum USDC
  const aggregated = await client.getMultiChainAggregatedData(
    usdcAddress,
    ['ethereum', 'polygon', 'arbitrum'] // Preferred chains
  );
  
  if (aggregated) {
    console.log(`Token: ${aggregated.token.symbol} (${aggregated.token.name})`);
    console.log(`Total Liquidity: $${aggregated.totalLiquidity.toLocaleString()}`);
    console.log(`Total 24h Volume: $${aggregated.totalVolume24h.toLocaleString()}`);
    console.log(`Weighted Average Price: $${aggregated.averagePrice.toFixed(6)}`);
    console.log(`Total Pairs: ${aggregated.pairCount}`);
    console.log(`\nChains:`);
    aggregated.chains.forEach(chain => {
      console.log(`  ${chain.chainId}:`);
      console.log(`    Liquidity: $${chain.liquidity.toLocaleString()}`);
      console.log(`    Volume: $${chain.volume24h.toLocaleString()}`);
      console.log(`    Pairs: ${chain.pairs.length}`);
    });
    console.log(`\nBest Pair: ${client.normalizePairIdentifier(aggregated.bestPair)} on ${aggregated.bestPair.chainId}`);
  }

  // ==================== 5. HISTORICAL DATA TRACKING ====================
  console.log('\n📊 5. Historical Data Tracking\n');
  
  // Track data points over time
  if (ethPairs.length > 0) {
    const pair = ethPairs[0];
    
    // Track initial data point
    client.trackHistoricalData(pair.pairAddress, pair);
    console.log(`Tracked data point for ${client.normalizePairIdentifier(pair)}`);
    
    // Simulate tracking over time (in production, this would be done continuously)
    setTimeout(() => {
      client.trackHistoricalData(pair.pairAddress, pair);
      const history = client.getHistoricalData(pair.pairAddress);
      console.log(`Historical data points: ${history.length}`);
      
      // Detect spikes
      const spike = client.detectLiquiditySpikesHistorical(pair.pairAddress, 50);
      if (spike) {
        console.log(`🚨 Liquidity spike detected!`);
        console.log(`  Type: ${spike.spikeType}`);
        console.log(`  Change: ${spike.changePercentage.toFixed(2)}%`);
      }
    }, 1000);
  }

  // ==================== 6. PRE-CACHING SYSTEM ====================
  console.log('\n⚡ 6. Pre-Caching System\n');
  
  // Start pre-caching for top chains (every 5 minutes)
  client.startPreCaching(['ethereum', 'bsc', 'polygon'], 300000);
  console.log('Pre-caching started for top chains');
  
  // Wait a bit for initial cache
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Get pre-cached trending pairs (instant response!)
  const cachedTrending = client.getPreCachedTrendingPairs('ethereum');
  if (cachedTrending) {
    console.log(`Pre-cached trending pairs for Ethereum: ${cachedTrending.length}`);
    console.log('Cache hit rate: instant response (0ms)!');
  }

  // ==================== 7. SMART BATCH QUERIES ====================
  console.log('\n🔄 7. Smart Batch Queries\n');
  
  // Example: Query 100 pair addresses efficiently
  const pairAddresses = Array(100).fill(0).map((_, i) => 
    `0x${i.toString(16).padStart(40, '0')}`
  );
  
  console.log(`Querying ${pairAddresses.length} pairs with intelligent batching...`);
  const batchResults = await client.smartBatchQuery(pairAddresses, 'ethereum');
  console.log(`Results: ${batchResults.length} pairs found`);
  console.log('Batch optimization: automatically split into optimal chunks');

  // ==================== 8. PERFORMANCE METRICS ====================
  console.log('\n📈 8. Performance Metrics\n');
  
  const metrics = client.getMetrics();
  console.log(`Total Requests: ${metrics.totalRequests}`);
  console.log(`Successful: ${metrics.successfulRequests}`);
  console.log(`Failed: ${metrics.failedRequests}`);
  console.log(`Success Rate: ${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)}%`);
  console.log(`Average Response Time: ${metrics.averageResponseTime.toFixed(0)}ms`);
  console.log(`Rate Limit Hits: ${metrics.rateLimitHits}`);
  
  const cacheStats = client.getCacheStats();
  console.log(`\nCache Statistics:`);
  console.log(`  Size: ${cacheStats.size} entries`);
  console.log(`  Hit Rate: ${cacheStats.hitRate.toFixed(2)}%`);
  console.log(`  Trending Pairs Cached: ${cacheStats.trendingPairsCached} chains`);

  // ==================== 9. COMPREHENSIVE HEALTH CHECK ====================
  console.log('\n🏥 9. Comprehensive Health Check\n');
  
  const health = await client.getHealthStatus();
  console.log(`Health Status: ${health.isHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
  console.log(`API Responsive: ${health.apiResponsive ? '✅' : '❌'}`);
  console.log(`Rate Limit Status: ${health.rateLimitStatus.toUpperCase()}`);
  console.log(`\nMetrics Summary:`);
  console.log(`  Requests: ${health.metrics.totalRequests}`);
  console.log(`  Cache Hit Rate: ${health.cacheStats.hitRate.toFixed(2)}%`);

  // ==================== 10. ADVANCED USE CASES ====================
  console.log('\n🎯 10. Advanced Use Cases\n');
  
  // Find best liquidity pairs for a token
  console.log('Finding best liquidity pairs for WETH...');
  const wethPairs = await client.searchPairsByQuery('WETH');
  const highLiquidityPairs = client.filterByMinLiquidity(wethPairs, 1000000); // $1M+
  
  console.log(`Total WETH pairs: ${wethPairs.length}`);
  console.log(`High liquidity pairs ($1M+): ${highLiquidityPairs.length}`);
  
  // Analyze top pairs
  if (highLiquidityPairs.length > 0) {
    console.log('\nTop 3 pairs by quality:');
    const scored = highLiquidityPairs.map(pair => ({
      pair,
      score: client.calculatePairQualityScore(pair),
    })).sort((a, b) => b.score.overall - a.score.overall).slice(0, 3);
    
    scored.forEach((item, idx) => {
      console.log(`\n${idx + 1}. ${client.normalizePairIdentifier(item.pair)}`);
      console.log(`   Score: ${item.score.overall}/100`);
      console.log(`   Risk: ${item.score.riskLevel}`);
      console.log(`   Chain: ${item.pair.chainId}`);
      console.log(`   DEX: ${item.pair.dexId}`);
      console.log(`   Liquidity: $${(item.pair.liquidity?.usd || 0).toLocaleString()}`);
    });
  }

  // ==================== CLEANUP ====================
  console.log('\n\n🧹 Cleanup\n');
  
  // Stop pre-caching
  client.stopPreCaching();
  console.log('Pre-caching stopped');
  
  // Get final metrics
  const finalMetrics = client.getMetrics();
  console.log(`\nFinal Performance:`);
  console.log(`  Total API Calls: ${finalMetrics.totalRequests}`);
  console.log(`  Cache Efficiency: ${((finalMetrics.cacheHits / (finalMetrics.cacheHits + finalMetrics.cacheMisses)) * 100).toFixed(2)}%`);
  console.log(`  Avg Response Time: ${finalMetrics.averageResponseTime.toFixed(0)}ms`);
  
  // Graceful shutdown
  await client.shutdown();
  console.log('\n✅ DexScreener client shutdown complete');
}

// Run if executed directly
if (require.main === module) {
  demonstrateAdvancedFeatures().catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
}

export default demonstrateAdvancedFeatures;

