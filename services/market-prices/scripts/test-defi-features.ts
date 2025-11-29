#!/usr/bin/env ts-node
/**
 * Quick Test Script for DeFi Features
 * Run this in Codespace or Railway to verify all features work
 */

import { DexScreenerEnhancedClient } from '../src/providers/dexscreener-enhanced';
import { DeFiLlamaEnhancedClient } from '../src/providers/defillama-enhanced';
import { DefiAggregator } from '../src/services/defi-aggregator';
import { ProviderConfig } from '../src/types';
import { logger } from '../src/utils/logger';

async function testDeFiFeatures() {
  console.log('\n🚀 Testing DeFi Features...\n');
  
  const results = {
    dexscreener: false,
    defillama: false,
    aggregator: false,
    allPassed: false,
  };
  
  try {
    // Test 1: DexScreener Enhanced
    console.log('1️⃣ Testing DexScreener Enhanced...');
    const dexConfig: ProviderConfig = {
      apiUrl: 'https://api.dexscreener.com/latest/dex',
      apiKey: process.env.DEXSCREENER_PRO_KEY || 'free-tier',
      rateLimit: { 
        maxRequestsPerMinute: 300,
        reservoir: 300,
        reservoirRefreshAmount: 300,
        reservoirRefreshInterval: 60000,
      },
      retry: { retries: 3, retryDelay: 1000 },
      priority: 1,
    };
    
    const dexScreener = new DexScreenerEnhancedClient(dexConfig, {
      proApiKeys: process.env.DEXSCREENER_PRO_KEY ? [process.env.DEXSCREENER_PRO_KEY] : undefined,
    });
    
    const pairs = await dexScreener.searchPairs('ETH');
    console.log(`   ✅ DexScreener: Found ${pairs.pairs?.length || 0} pairs`);
    
    const planInfo = dexScreener.getPlanInfo();
    console.log(`   📊 Plan: ${planInfo.plan}, Quota: ${planInfo.quotaRemaining}`);
    
    const cacheStats = dexScreener.getCacheStats();
    console.log(`   💾 Cache Hit Rate: ${cacheStats.hitRate.toFixed(1)}%`);
    
    results.dexscreener = true;
    
    // Test 2: DeFiLlama Enhanced
    console.log('\n2️⃣ Testing DeFiLlama Enhanced...');
    const defiConfig: ProviderConfig = {
      apiUrl: 'https://api.llama.fi',
      apiKey: process.env.DEFILLAMA_PRO_KEY || '',
      rateLimit: { 
        maxRequestsPerMinute: 30,
        reservoir: 30,
        reservoirRefreshAmount: 30,
        reservoirRefreshInterval: 60000,
      },
      retry: { retries: 3, retryDelay: 1000 },
      priority: 2,
    };
    
    const defiLlama = new DeFiLlamaEnhancedClient(defiConfig, {
      proApiKey: process.env.DEFILLAMA_PRO_KEY,
    });
    
    const protocols = await defiLlama.getProtocols();
    console.log(`   ✅ DeFiLlama: Found ${protocols.length} protocols`);
    
    const defiPlanInfo = defiLlama.getPlanInfo();
    console.log(`   📊 Plan: ${defiPlanInfo.plan}`);
    
    const adaptiveStatus = defiLlama.getAdaptivePollingStatus();
    console.log(`   📈 Volatility: ${adaptiveStatus.currentVolatility}, Interval: ${adaptiveStatus.currentIntervalMs}ms`);
    
    results.defillama = true;
    
    // Test 3: Unified Aggregator
    console.log('\n3️⃣ Testing Unified Aggregator...');
    const aggregator = new DefiAggregator(dexScreener, defiLlama);
    
    const startTime = Date.now();
    const tokenData = await aggregator.getUnifiedTokenData('ETH', {
      includeNews: false,
      includeYields: true,
    });
    const latency = Date.now() - startTime;
    
    if (tokenData) {
      console.log(`   ✅ Aggregator: Fetched unified data in ${latency}ms`);
      console.log(`   💰 Price: $${tokenData.currentPrice.toFixed(2)}`);
      console.log(`   💧 DEX Liquidity: $${tokenData.dex.totalLiquidity.toLocaleString()}`);
      console.log(`   📊 DeFi TVL: $${tokenData.defi.tvl.toLocaleString()}`);
      console.log(`   ⭐ Overall Score: ${tokenData.scores.overall.toFixed(1)}/100`);
      console.log(`   ⚠️  Risk Score: ${tokenData.scores.risk.toFixed(1)}/100`);
      
      if (latency < 50) {
        console.log(`   🎯 Latency target met: ${latency}ms < 50ms`);
      }
    }
    
    const aggMetrics = aggregator.getMetrics();
    console.log(`   📈 Efficiency: ${aggMetrics.efficiencyMultiplier.toFixed(1)}x`);
    
    results.aggregator = true;
    
    // Cleanup
    await dexScreener.shutdown();
    await defiLlama.shutdown();
    aggregator.destroy();
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    return false;
  }
  
  results.allPassed = results.dexscreener && results.defillama && results.aggregator;
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('                        TEST SUMMARY                            ');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  console.log(`DexScreener Enhanced: ${results.dexscreener ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`DeFiLlama Enhanced:   ${results.defillama ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Unified Aggregator:   ${results.aggregator ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`\nOverall: ${results.allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}\n`);
  
  return results.allPassed;
}

// Run tests
if (require.main === module) {
  testDeFiFeatures()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { testDeFiFeatures };

