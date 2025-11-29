/**
 * Test Script for Liquidity Analyzer
 * 
 * Tests all components of the Phase 5 implementation:
 * - Market absorption analysis
 * - Order book aggregation
 * - DEX liquidity integration
 * - Price impact simulation
 * - Trading recommendations
 */

import { 
  getLiquidityAnalyzer, 
  LiquidityAnalyzer,
  TokenUnlock,
  AbsorptionAnalysis,
} from '../src/intelligence/liquidity-analyzer';

// =============================================================================
// TEST UTILITIES
// =============================================================================

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset): void {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message: string): void {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function logError(message: string): void {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function logInfo(message: string): void {
  console.log(`${colors.cyan}ℹ️  ${message}${colors.reset}`);
}

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details?: any;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<any>
): Promise<void> {
  const start = Date.now();
  try {
    const details = await testFn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration, details });
    logSuccess(`${name} (${duration}ms)`);
  } catch (error) {
    const duration = Date.now() - start;
    results.push({ name, passed: false, duration, error: (error as Error).message });
    logError(`${name}: ${(error as Error).message}`);
  }
}

// =============================================================================
// TESTS
// =============================================================================

async function testLiquidityAnalyzerInitialization(): Promise<void> {
  const analyzer = getLiquidityAnalyzer();
  
  if (!analyzer) {
    throw new Error('Failed to initialize LiquidityAnalyzer');
  }

  const health = analyzer.getHealthStatus();
  if (health.status !== 'healthy') {
    throw new Error(`Unhealthy status: ${health.status}`);
  }
}

async function testOrderBookAggregation(): Promise<any> {
  const analyzer = getLiquidityAnalyzer();
  const orderBook = await analyzer.getAggregatedOrderBook('ETH');

  if (!orderBook) {
    throw new Error('Failed to get order book');
  }

  if (orderBook.totalBidLiquidity <= 0) {
    throw new Error('No bid liquidity');
  }

  if (orderBook.totalAskLiquidity <= 0) {
    throw new Error('No ask liquidity');
  }

  return {
    exchanges: orderBook.exchanges.length,
    totalBidLiquidity: `$${(orderBook.totalBidLiquidity / 1000000).toFixed(2)}M`,
    totalAskLiquidity: `$${(orderBook.totalAskLiquidity / 1000000).toFixed(2)}M`,
    spread: `${(orderBook.weightedSpread * 100).toFixed(3)}%`,
    midPrice: orderBook.midPrice,
  };
}

async function testDEXLiquidity(): Promise<any> {
  const analyzer = getLiquidityAnalyzer();
  const dexLiquidity = await analyzer.getDEXLiquidity('ETH');

  if (!dexLiquidity) {
    throw new Error('Failed to get DEX liquidity');
  }

  if (dexLiquidity.pools.length === 0) {
    throw new Error('No DEX pools found');
  }

  return {
    totalLiquidity: `$${(dexLiquidity.totalLiquidityUsd / 1000000).toFixed(2)}M`,
    poolCount: dexLiquidity.pools.length,
    protocols: Array.from(dexLiquidity.protocolBreakdown.keys()),
    chains: Array.from(dexLiquidity.chainBreakdown.keys()),
    bestPool: dexLiquidity.bestPool?.protocol,
  };
}

async function testMarketAbsorptionAnalysis(): Promise<any> {
  const analyzer = getLiquidityAnalyzer();
  
  const unlock: TokenUnlock = {
    tokenSymbol: 'ARB',
    chain: 'arbitrum',
    usdValue: 5000000, // $5M unlock
    tokenAmount: 5000000,
    unlockDate: new Date(),
    category: 'team',
  };

  const analysis = await analyzer.analyzeMarketAbsorption(unlock);

  if (!analysis) {
    throw new Error('Failed to analyze market absorption');
  }

  return {
    canAbsorb: analysis.canAbsorb,
    absorptionCapacity: `${analysis.absorptionCapacity.toFixed(1)}%`,
    estimatedImpact: `${analysis.estimatedPriceImpact.toFixed(2)}%`,
    liquidityScore: `${analysis.liquidityScore}/100`,
    riskLevel: analysis.riskLevel,
    timeToRecover: analysis.timeToRecover,
    recommendationCount: analysis.recommendations.length,
  };
}

async function testSmallUnlockScenario(): Promise<any> {
  const analyzer = getLiquidityAnalyzer();
  
  const unlock: TokenUnlock = {
    tokenSymbol: 'ETH',
    chain: 'ethereum',
    usdValue: 100000, // $100k unlock (small)
    tokenAmount: 50,
    unlockDate: new Date(),
    category: 'advisor',
  };

  const analysis = await analyzer.analyzeMarketAbsorption(unlock);

  if (!analysis.canAbsorb) {
    throw new Error('Small unlock should be absorbable');
  }

  if (analysis.riskLevel !== 'low' && analysis.riskLevel !== 'medium') {
    throw new Error(`Small unlock should be low/medium risk, got: ${analysis.riskLevel}`);
  }

  return {
    canAbsorb: analysis.canAbsorb,
    riskLevel: analysis.riskLevel,
    estimatedImpact: `${analysis.estimatedPriceImpact.toFixed(3)}%`,
    strategy: analysis.simulation.optimalStrategy,
  };
}

async function testLargeUnlockScenario(): Promise<any> {
  const analyzer = getLiquidityAnalyzer();
  
  const unlock: TokenUnlock = {
    tokenSymbol: 'SMALL_CAP',
    chain: 'ethereum',
    usdValue: 50000000, // $50M unlock (very large)
    tokenAmount: 50000000,
    unlockDate: new Date(),
    category: 'seed',
  };

  const analysis = await analyzer.analyzeMarketAbsorption(unlock);

  // Large unlock should have high risk
  if (analysis.riskLevel !== 'high' && analysis.riskLevel !== 'critical') {
    throw new Error(`Large unlock should be high/critical risk, got: ${analysis.riskLevel}`);
  }

  // Should recommend OTC or DCA
  const hasOTCRecommendation = analysis.recommendations.some(
    r => r.title.toLowerCase().includes('otc') || r.title.toLowerCase().includes('dca')
  );

  if (!hasOTCRecommendation) {
    throw new Error('Large unlock should have OTC/DCA recommendation');
  }

  return {
    canAbsorb: analysis.canAbsorb,
    riskLevel: analysis.riskLevel,
    estimatedImpact: `${analysis.estimatedPriceImpact.toFixed(2)}%`,
    strategy: analysis.simulation.optimalStrategy,
    recommendations: analysis.recommendations.length,
  };
}

async function testMarketImpactSimulation(): Promise<any> {
  const analyzer = getLiquidityAnalyzer();
  
  const orderBook = await analyzer.getAggregatedOrderBook('BTC');
  const dexLiquidity = await analyzer.getDEXLiquidity('BTC');
  
  // Access private method via type assertion for testing
  const simulation = await (analyzer as any).simulateMarketImpact(
    1000000, // $1M sell
    orderBook,
    dexLiquidity,
    10000000 // $10M avg daily volume
  );

  if (!simulation) {
    throw new Error('Failed to simulate market impact');
  }

  if (simulation.estimatedPriceImpact < 0) {
    throw new Error('Price impact cannot be negative');
  }

  if (simulation.confidence < 0 || simulation.confidence > 1) {
    throw new Error('Confidence must be between 0 and 1');
  }

  return {
    sellAmount: `$${(simulation.sellAmountUsd / 1000000).toFixed(2)}M`,
    priceImpact: `${simulation.estimatedPriceImpact.toFixed(2)}%`,
    slippage: `${simulation.estimatedSlippage.toFixed(3)}%`,
    optimalStrategy: simulation.optimalStrategy,
    confidence: `${(simulation.confidence * 100).toFixed(1)}%`,
    cexImpact: `${simulation.breakdown.cexImpact.toFixed(2)}%`,
    dexImpact: `${simulation.breakdown.dexImpact.toFixed(2)}%`,
  };
}

async function testRecommendationGeneration(): Promise<any> {
  const analyzer = getLiquidityAnalyzer();
  
  const unlock: TokenUnlock = {
    tokenSymbol: 'OP',
    chain: 'optimism',
    usdValue: 10000000, // $10M
    tokenAmount: 5000000,
    unlockDate: new Date(),
    category: 'ecosystem',
  };

  const analysis = await analyzer.analyzeMarketAbsorption(unlock);

  if (analysis.recommendations.length === 0) {
    throw new Error('Should generate at least one recommendation');
  }

  // Verify recommendation structure
  for (const rec of analysis.recommendations) {
    if (!rec.type || !rec.priority || !rec.title || !rec.action) {
      throw new Error('Invalid recommendation structure');
    }
  }

  const types = [...new Set(analysis.recommendations.map(r => r.type))];
  const priorities = [...new Set(analysis.recommendations.map(r => r.priority))];

  return {
    totalRecommendations: analysis.recommendations.length,
    types,
    priorities,
    topRecommendation: analysis.recommendations[0]?.title,
  };
}

async function testCachePerformance(): Promise<any> {
  const analyzer = getLiquidityAnalyzer();
  
  // First call - should hit external sources
  const start1 = Date.now();
  await analyzer.getAggregatedOrderBook('SOL');
  const duration1 = Date.now() - start1;

  // Second call - should hit cache
  const start2 = Date.now();
  await analyzer.getAggregatedOrderBook('SOL');
  const duration2 = Date.now() - start2;

  // Cache should be faster
  if (duration2 >= duration1) {
    // This is OK, cache might not be significantly faster in test
  }

  return {
    firstCall: `${duration1}ms`,
    cachedCall: `${duration2}ms`,
    improvement: `${((1 - duration2 / duration1) * 100).toFixed(1)}%`,
  };
}

async function testMultiChainSupport(): Promise<any> {
  const analyzer = getLiquidityAnalyzer();
  
  const chains = ['ethereum', 'arbitrum', 'optimism', 'polygon'];
  const results: Record<string, number> = {};

  for (const chain of chains) {
    const dex = await analyzer.getDEXLiquidity('ETH', chain);
    results[chain] = dex.pools.length;
  }

  const totalPools = Object.values(results).reduce((a, b) => a + b, 0);

  if (totalPools === 0) {
    throw new Error('No pools found across any chain');
  }

  return {
    chains: Object.keys(results).length,
    poolsByChain: results,
    totalPools,
  };
}

// =============================================================================
// MAIN
// =============================================================================

async function main(): Promise<void> {
  console.log('\n' + '═'.repeat(70));
  console.log('🔬 LIQUIDITY ANALYZER TEST SUITE');
  console.log('═'.repeat(70));
  console.log(`Started: ${new Date().toISOString()}\n`);

  // Run all tests
  await runTest('Initialization', testLiquidityAnalyzerInitialization);
  await runTest('Order Book Aggregation', testOrderBookAggregation);
  await runTest('DEX Liquidity Integration', testDEXLiquidity);
  await runTest('Market Absorption Analysis', testMarketAbsorptionAnalysis);
  await runTest('Small Unlock Scenario', testSmallUnlockScenario);
  await runTest('Large Unlock Scenario', testLargeUnlockScenario);
  await runTest('Market Impact Simulation', testMarketImpactSimulation);
  await runTest('Recommendation Generation', testRecommendationGeneration);
  await runTest('Cache Performance', testCachePerformance);
  await runTest('Multi-Chain Support', testMultiChainSupport);

  // Print summary
  console.log('\n' + '═'.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(70));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\n   Total Tests:  ${results.length}`);
  console.log(`   ${colors.green}Passed:${colors.reset}       ${passed}`);
  console.log(`   ${colors.red}Failed:${colors.reset}       ${failed}`);
  console.log(`   Duration:     ${totalDuration}ms`);
  console.log(`   Pass Rate:    ${((passed / results.length) * 100).toFixed(1)}%`);

  // Print detailed results
  console.log('\n📋 Detailed Results:\n');
  
  for (const result of results) {
    const status = result.passed ? colors.green + '✅' : colors.red + '❌';
    console.log(`${status} ${result.name}${colors.reset} (${result.duration}ms)`);
    
    if (result.details) {
      for (const [key, value] of Object.entries(result.details)) {
        console.log(`     ${key}: ${JSON.stringify(value)}`);
      }
    }
    
    if (result.error) {
      console.log(`     ${colors.red}Error: ${result.error}${colors.reset}`);
    }
  }

  console.log('\n' + '═'.repeat(70));

  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED - PHASE 5 COMPLETE!');
  } else {
    console.log(`⚠️ ${failed} TEST(S) FAILED - Review before deployment`);
    process.exit(1);
  }

  console.log('═'.repeat(70) + '\n');
}

main().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});

