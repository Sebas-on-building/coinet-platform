/**
 * Example Usage: Unified Market Data Service
 * Demonstrates how to use the UnifiedMarketDataService
 */

import { UnifiedMarketDataService, BestPriceResult } from '../services/unified-market-data';
import { CoinGeckoRestClient } from '../providers/coingecko-rest';
import { CoinMarketCapRestClient } from '../providers/coinmarketcap-rest';
import { DefiLlamaRestClient } from '../providers/defillama-rest';
import { DexScreenerRestClient } from '../providers/dexscreener-rest';

async function exampleUnifiedMarketData() {
  // Initialize provider clients
  const geckoClient = new CoinGeckoRestClient({
    apiKey: process.env.COINGECKO_API_KEY || '',
    apiUrl: 'https://api.coingecko.com/api/v3',
    rateLimit: {
      maxRequestsPerMinute: 50,
      reservoir: 50,
      reservoirRefreshAmount: 50,
      reservoirRefreshInterval: 60000,
    },
    retry: {
      retries: 3,
      retryDelay: 1000,
    },
    priority: 1,
  });

  const cmcClient = new CoinMarketCapRestClient({
    apiKey: process.env.COINMARKETCAP_API_KEY || '',
    apiUrl: 'https://pro-api.coinmarketcap.com/v1',
    rateLimit: {
      maxRequestsPerMinute: 10,
      reservoir: 10,
      reservoirRefreshAmount: 10,
      reservoirRefreshInterval: 60000,
    },
    retry: {
      retries: 3,
      retryDelay: 1000,
    },
    priority: 2,
  });

  // Initialize DexScreener client (optional - free tier doesn't require API key)
  const dexScreenerClient = new DexScreenerRestClient({
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

  // Create unified service
  const unifiedService = new UnifiedMarketDataService(
    geckoClient,
    cmcClient,
    undefined, // DefiLlama client (optional)
    dexScreenerClient
  );

  // Example 1: Get best price for a single symbol
  console.log('=== Example 1: Get Best Price ===');
  try {
    const bestPrice = await unifiedService.getBestPrice('BTC');
    console.log(`Best BTC Price: $${bestPrice.price}`);
    console.log(`Source: ${bestPrice.source}`);
    console.log(`Confidence: ${bestPrice.confidence}%`);
    console.log(`All Prices:`, bestPrice.allPrices);
  } catch (error) {
    console.error('Error fetching best price:', error);
  }

  // Example 2: Get aggregated market data
  console.log('\n=== Example 2: Get Aggregated Market Data ===');
  try {
    const marketData = await unifiedService.getAggregatedMarketData('ETH');
    console.log(`ETH Market Data:`);
    console.log(`  Price: $${marketData.price}`);
    console.log(`  24h Change: ${marketData.priceChangePercentage24h}%`);
    console.log(`  Market Cap: $${marketData.marketCap}`);
    console.log(`  24h Volume: $${marketData.volume24h}`);
    console.log(`  Confidence: ${marketData.confidence}%`);
    console.log(`  Price Variance: ${marketData.priceVariance}`);
    console.log(`  Sources:`, Object.keys(marketData.sources));
  } catch (error) {
    console.error('Error fetching aggregated data:', error);
  }

  // Example 3: Get prices for multiple symbols
  console.log('\n=== Example 3: Get Best Prices for Multiple Symbols ===');
  try {
    const prices = await unifiedService.getBestPrices(['BTC', 'ETH', 'SOL']);
    prices.forEach((result: BestPriceResult, symbol: string) => {
      console.log(`${symbol}: $${result.price} (${result.confidence}% confidence)`);
    });
  } catch (error) {
    console.error('Error fetching multiple prices:', error);
  }

  // Example 4: Custom provider weights
  console.log('\n=== Example 4: Custom Provider Weights ===');
  const customWeightsService = new UnifiedMarketDataService(
    geckoClient,
    cmcClient,
    undefined,
    undefined, // DexScreener client (optional)
    {
      coingecko: 0.7, // Higher weight for CoinGecko
      coinmarketcap: 0.3,
      defillama: 0.0,
      dexscreener: 0.0,
    }
  );

  try {
    const weightedPrice = await customWeightsService.getBestPrice('BTC');
    console.log(`Weighted BTC Price: $${weightedPrice.price}`);
    console.log(`Confidence: ${weightedPrice.confidence}%`);
  } catch (error) {
    console.error('Error with custom weights:', error);
  }
}

// Run example if executed directly
if (require.main === module) {
  exampleUnifiedMarketData().catch(console.error);
}

export { exampleUnifiedMarketData };

