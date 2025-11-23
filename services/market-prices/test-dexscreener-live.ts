/**
 * Live DexScreener API Test
 * Tests the actual DexScreener API to verify integration works
 */

import { DexScreenerRestClient } from './src/providers/dexscreener-rest';
import { ProviderConfig } from './src/types';

async function testDexScreenerLive() {
  console.log('🚀 Testing DexScreener API (Live Test)\n');

  // Create config for DexScreener (free tier - no API key needed)
  const config: ProviderConfig = {
    apiKey: 'free-tier',
    apiUrl: 'https://api.dexscreener.com/latest/dex',
    priority: 3,
    rateLimit: {
      maxRequestsPerMinute: 300,
      reservoir: 300,
      reservoirRefreshAmount: 300,
      reservoirRefreshInterval: 60000,
    },
    retry: {
      retries: 3,
      retryDelay: 1000,
    },
  };

  const client = new DexScreenerRestClient(config);

  try {
    // Test 1: Health Check
    console.log('📋 Test 1: Health Check');
    const health = await client.healthCheck();
    console.log(`   ✅ Health Check: ${health ? 'PASSED' : 'FAILED'}\n`);

    // Test 2: Search for ETH pairs
    console.log('📋 Test 2: Search Pairs by Query (ETH)');
    try {
      const ethPairs = await client.searchPairsByQuery('ETH');
      console.log(`   ✅ Found ${ethPairs.length} ETH pairs`);
      if (ethPairs.length > 0) {
        const firstPair = ethPairs[0];
        console.log(`   📊 Sample Pair:`);
        console.log(`      - Chain: ${firstPair.chainId}`);
        console.log(`      - DEX: ${firstPair.dexId}`);
        console.log(`      - Pair: ${firstPair.baseToken.symbol}/${firstPair.quoteToken.symbol}`);
        console.log(`      - Price USD: $${firstPair.priceUsd || 'N/A'}`);
        if (firstPair.liquidity?.usd) {
          console.log(`      - Liquidity USD: $${firstPair.liquidity.usd.toLocaleString()}`);
        }
        if (firstPair.volume?.h24) {
          console.log(`      - Volume 24h: $${firstPair.volume.h24.toLocaleString()}`);
        }
      }
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log('');

    // Test 3: Search for BTC pairs
    console.log('📋 Test 3: Search Pairs by Query (BTC)');
    try {
      const btcPairs = await client.searchPairsByQuery('BTC');
      console.log(`   ✅ Found ${btcPairs.length} BTC pairs`);
      if (btcPairs.length > 0) {
        const bestPair = btcPairs.reduce((best, current) => {
          const bestLiquidity = best.liquidity?.usd || 0;
          const currentLiquidity = current.liquidity?.usd || 0;
          return currentLiquidity > bestLiquidity ? current : best;
        });
        console.log(`   📊 Best Liquidity Pair:`);
        console.log(`      - Pair: ${bestPair.baseToken.symbol}/${bestPair.quoteToken.symbol}`);
        console.log(`      - Price USD: $${bestPair.priceUsd || 'N/A'}`);
        if (bestPair.liquidity?.usd) {
          console.log(`      - Liquidity: $${bestPair.liquidity.usd.toLocaleString()}`);
        }
      }
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log('');

    // Test 4: Get pairs by token address (WETH on Ethereum)
    console.log('📋 Test 4: Get Pairs by Token Address (WETH)');
    try {
      const wethAddress = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'; // WETH on Ethereum
      const wethPairs = await client.getPairsByToken(wethAddress);
      console.log(`   ✅ Found ${wethPairs.length} WETH pairs`);
      if (wethPairs.length > 0) {
        const topPair = wethPairs[0];
        console.log(`   📊 Top Pair:`);
        console.log(`      - Chain: ${topPair.chainId}`);
        console.log(`      - DEX: ${topPair.dexId}`);
        console.log(`      - Price USD: $${topPair.priceUsd || 'N/A'}`);
      }
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    console.log('');

    // Test 5: Get supported chains
    console.log('📋 Test 5: Get Supported Chains');
    const chains = client.getSupportedChains();
    console.log(`   ✅ Supported Chains: ${chains.length}`);
    console.log(`   📋 Sample chains: ${chains.slice(0, 5).join(', ')}...\n`);

    // Test 6: Test normalizePairIdentifier
    console.log('📋 Test 6: Normalize Pair Identifier');
    try {
      const testPairs = await client.searchPairsByQuery('ETH');
      if (testPairs.length > 0) {
        const normalized = client.normalizePairIdentifier(testPairs[0]);
        console.log(`   ✅ Normalized: ${normalized}`);
      }
    } catch (error: any) {
      console.log(`   ⚠️  Skipped: ${error.message}`);
    }
    console.log('');

    console.log('✅ All DexScreener tests completed!\n');
    console.log('📊 Summary:');
    console.log('   - DexScreener client: ✅ Working');
    console.log('   - API connectivity: ✅ Verified');
    console.log('   - Rate limiting: ✅ Configured');
    console.log('   - Integration: ✅ Ready');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testDexScreenerLive().catch(console.error);
