/**
 * Comprehensive Data Integration Example
 * Demonstrates world-class integration of all data sources:
 * - CoinGecko (REST + WebSocket)
 * - CoinMarketCap (fallback)
 * - DexScreener (DEX data)
 * - DeFiLlama (DeFi analytics)
 * - CryptoPanic (news & sentiment)
 * - Messari (token unlocks)
 * - The Tie (research-grade unlock data)
 */

import {
  // Providers
  CoinGeckoRestClient,
  CoinGeckoWebSocketClient,
  CoinMarketCapRestClient,
  DexScreenerRestClient,
  DefiLlamaRestClient,
  CryptoPanicRestClient,
  MessariRestClient,
  TheTieRestClient,
  
  // Configuration
  getConfig,
  buildConfig,
  
  // Secrets Management
  initializeSecretsManager,
  SecretBackend,
  
  // Types
  DataSource,
  ProviderConfig,
} from '../index';

import { CryptoPanicConfig } from '../providers/cryptopanic-rest';
import { CryptoPanicPlan } from '../types/cryptopanic.types';
import { logger } from '../utils/logger';

/**
 * Initialize all providers with configuration from environment/secrets
 */
async function initializeProviders() {
  logger.info('Initializing all data providers...');

  // Initialize secrets manager (supports Vault, AWS Secrets Manager, env vars)
  const secretsManager = initializeSecretsManager({
    backend: SecretBackend.ENV, // Use ENV for development, VAULT for production
    cacheTTL: 3600,
    enableCache: true,
    fallbackBackends: [SecretBackend.ENV],
  });

  // Get configuration
  const config = getConfig();

  // Initialize providers
  const coinGecko = new CoinGeckoRestClient(config.providers.coingecko);
  const coinMarketCap = new CoinMarketCapRestClient(config.providers.coinmarketcap);
  
  let dexScreener: DexScreenerRestClient | null = null;
  if (config.providers.dexscreener) {
    dexScreener = new DexScreenerRestClient(config.providers.dexscreener);
  }

  let defiLlama: DefiLlamaRestClient | null = null;
  if (config.providers.defillama) {
    defiLlama = new DefiLlamaRestClient(config.providers.defillama);
  }

  let cryptoPanic: CryptoPanicRestClient | null = null;
  if (config.providers.cryptopanic) {
    // Convert ProviderConfig to CryptoPanicConfig
    const planEnv = process.env.CRYPTOPANIC_PLAN || 'growth';
    const plan = planEnv === 'development' ? CryptoPanicPlan.DEVELOPMENT :
                 planEnv === 'growth' ? CryptoPanicPlan.GROWTH :
                 CryptoPanicPlan.ENTERPRISE;
    
    const cryptoPanicConfig: CryptoPanicConfig = {
      authToken: config.providers.cryptopanic.apiKey,
      plan,
      baseUrl: config.providers.cryptopanic.apiUrl,
      enableCaching: true,
      cacheTTL: 300,
      retry: config.providers.cryptopanic.retry,
    };
    cryptoPanic = new CryptoPanicRestClient(cryptoPanicConfig);
  }

  let messari: MessariRestClient | null = null;
  if (config.providers.messari) {
    messari = new MessariRestClient(config.providers.messari);
  }

  let theTie: TheTieRestClient | null = null;
  if (config.providers.thetie) {
    theTie = new TheTieRestClient(config.providers.thetie);
  }

  // WebSocket for real-time data
  let coinGeckoWS: CoinGeckoWebSocketClient | null = null;
  if (config.enableWebSocket && config.providers.coingecko.websocket) {
    coinGeckoWS = new CoinGeckoWebSocketClient(
      config.providers.coingecko.websocket,
      config.providers.coingecko.apiKey
    );
  }

  logger.info('All providers initialized successfully');

  return {
    coinGecko,
    coinMarketCap,
    dexScreener,
    defiLlama,
    cryptoPanic,
    messari,
    theTie,
    coinGeckoWS,
    secretsManager,
  };
}

/**
 * Example 1: Get comprehensive market data for Bitcoin
 */
async function getComprehensiveMarketData(providers: any) {
  logger.info('=== Example 1: Comprehensive Market Data ===');

  const { coinGecko, coinMarketCap, defiLlama } = providers;

  try {
    // Get Bitcoin price from CoinGecko (primary)
    const cgPrice = await coinGecko.getSimplePrice('bitcoin', 'usd', true, true, true, true);
    logger.info('CoinGecko BTC price:', cgPrice);

    // Get Bitcoin market data from CoinMarketCap (fallback/cross-check)
    const cmcQuote = await coinMarketCap.getQuotes(['BTC']);
    logger.info('CoinMarketCap BTC data:', cmcQuote);

    // Get Bitcoin OHLC data for charting
    const ohlc = await coinGecko.getOHLC('bitcoin', 'usd', 7);
    logger.info(`Bitcoin 7-day OHLC data: ${ohlc.length} candles`);

    // Get comprehensive metadata
    const metadata = await coinGecko.getCoinById('bitcoin', false, true, true);
    logger.info('Bitcoin metadata:', {
      name: metadata.name,
      marketCapRank: metadata.market_cap_rank,
      categories: metadata.categories,
    });

  } catch (error) {
    logger.error('Error fetching market data:', error);
  }
}

/**
 * Example 2: Real-time WebSocket price updates
 */
async function setupRealtimePriceUpdates(providers: any) {
  logger.info('=== Example 2: Real-time WebSocket Updates ===');

  const { coinGeckoWS } = providers;

  if (!coinGeckoWS) {
    logger.warn('WebSocket not enabled');
    return;
  }

  try {
    // Subscribe to top coins
    await coinGeckoWS.subscribe({
      coins: ['bitcoin', 'ethereum', 'solana', 'cardano', 'avalanche-2'],
      channels: ['price', 'volume'],
    });

    // Listen for price updates
    coinGeckoWS.on('price_update', (event: any) => {
      const price = event.data as any;
      logger.info('Price update received:', {
        coin: price.coinId,
        price: price.price,
        change24h: price.priceChangePercentage24h,
        volume: price.volume24h,
      });
    });

    logger.info('WebSocket subscriptions active');

  } catch (error) {
    logger.error('Error setting up WebSocket:', error);
  }
}

/**
 * Example 3: DEX data from DexScreener
 */
async function getDEXData(providers: any) {
  logger.info('=== Example 3: DEX Data from DexScreener ===');

  const { dexScreener } = providers;

  if (!dexScreener) {
    logger.warn('DexScreener not enabled');
    return;
  }

  try {
    // Search for Ethereum pairs
    const ethPairs = await dexScreener.searchPairs('ETH');
    logger.info(`Found ${ethPairs.pairs?.length || 0} ETH pairs`);

    // Get top pairs by liquidity
    const topPairs = ethPairs.pairs
      ?.sort((a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))
      .slice(0, 5);

    topPairs?.forEach((pair: any, index: number) => {
      logger.info(`Top pair #${index + 1}:`, {
        pair: pair.baseToken?.symbol + '/' + pair.quoteToken?.symbol,
        price: pair.priceUsd,
        liquidity: pair.liquidity?.usd,
        volume24h: pair.volume?.h24,
        priceChange24h: pair.priceChange?.h24,
      });
    });

  } catch (error) {
    logger.error('Error fetching DEX data:', error);
  }
}

/**
 * Example 4: DeFi analytics from DeFiLlama
 */
async function getDeFiAnalytics(providers: any) {
  logger.info('=== Example 4: DeFi Analytics from DeFiLlama ===');

  const { defiLlama } = providers;

  if (!defiLlama) {
    logger.warn('DeFiLlama not enabled');
    return;
  }

  try {
    // Get comprehensive analytics for Uniswap
    const uniswapAnalytics = await defiLlama.getProtocolAnalytics('uniswap');
    logger.info('Uniswap analytics:', {
      tvl: uniswapAnalytics.protocol?.tvl,
      chains: uniswapAnalytics.protocol?.chains,
      volumes: uniswapAnalytics.volumes,
    });

    // Get top yield opportunities
    const pools = await defiLlama.getPools();
    const topYields = pools
      .filter((pool: any) => pool.tvlUsd && pool.tvlUsd > 1_000_000)
      .sort((a: any, b: any) => (b.apy || 0) - (a.apy || 0))
      .slice(0, 10);

    logger.info('Top 10 yield opportunities (>$1M TVL):');
    topYields.forEach((pool: any, index: number) => {
      logger.info(`${index + 1}. ${pool.project} - ${pool.symbol}`, {
        apy: pool.apy?.toFixed(2) + '%',
        tvl: '$' + (pool.tvlUsd || 0).toLocaleString(),
        chain: pool.chain,
      });
    });

    // Get stablecoin data
    const stablecoins = await defiLlama.getStablecoins();
    logger.info(`Total stablecoins tracked: ${stablecoins.length}`);

    // Get perps volume
    const perpsVolume = await defiLlama.getPerpsVolume();
    logger.info('Perpetuals trading volume:', perpsVolume.slice(0, 5));

    // Get active users
    const activeUsers = await defiLlama.getActiveUsers();
    logger.info('Protocol active users:', activeUsers.slice(0, 5));

  } catch (error) {
    logger.error('Error fetching DeFi analytics:', error);
  }
}

/**
 * Example 5: News and sentiment from CryptoPanic
 */
async function getNewsAndSentiment(providers: any) {
  logger.info('=== Example 5: News & Sentiment from CryptoPanic ===');

  const { cryptoPanic } = providers;

  if (!cryptoPanic) {
    logger.warn('CryptoPanic not enabled');
    return;
  }

  try {
    // Get latest news for Bitcoin
    const btcNews = await cryptoPanic.getPosts({
      currencies: ['BTC'],
      filter: 'hot',
    });

    logger.info(`Found ${btcNews.results.length} hot Bitcoin news articles`);
    
    // Display top 5 with sentiment
    btcNews.results.slice(0, 5).forEach((post: any, index: number) => {
      logger.info(`News #${index + 1}:`, {
        title: post.title,
        source: post.source?.title,
        sentiment: post.votes,
        url: post.url,
      });
    });

  } catch (error) {
    logger.error('Error fetching news:', error);
  }
}

/**
 * Example 6: Token unlock analysis from Messari
 */
async function getTokenUnlockAnalysis(providers: any) {
  logger.info('=== Example 6: Token Unlock Analysis from Messari ===');

  const { messari } = providers;

  if (!messari) {
    logger.warn('Messari not enabled');
    return;
  }

  try {
    // Get upcoming unlocks for next 30 days
    const upcomingUnlocks = await messari.getUpcomingUnlocksNormalized(30);
    logger.info(`Found ${upcomingUnlocks.length} upcoming unlock events`);

    // Get high-impact unlocks
    const highImpact = upcomingUnlocks.filter((unlock: any) => unlock.severity === 'high' || unlock.severity === 'critical');
    
    logger.info(`High-impact unlocks: ${highImpact.length}`);
    highImpact.forEach((unlock: any) => {
      logger.info(`⚠️  ${unlock.symbol} unlock on ${unlock.unlockDate.toLocaleDateString()}:`, {
        amount: unlock.unlockAmount.toLocaleString(),
        amountUsd: '$' + unlock.unlockAmountUsd.toLocaleString(),
        percentage: unlock.unlockPercentage.toFixed(2) + '%',
        category: unlock.category,
        impactScore: unlock.impactScore,
        severity: unlock.severity,
      });
    });

    // Generate alerts
    const alerts = await messari.generateUnlockAlerts(7, 'high');
    logger.info(`Generated ${alerts.length} unlock alerts`);
    alerts.forEach((alert: any) => {
      logger.info(`🔔 Alert: ${alert.message}`, {
        severity: alert.severity,
        action: alert.recommendedAction,
      });
    });

  } catch (error) {
    logger.error('Error fetching token unlocks:', error);
  }
}

/**
 * Example 7: Cross-source unlock data comparison with The Tie
 */
async function compareUnlockData(providers: any) {
  logger.info('=== Example 7: Cross-Source Unlock Comparison ===');

  const { messari, theTie } = providers;

  if (!messari || !theTie) {
    logger.warn('Messari or The Tie not enabled');
    return;
  }

  try {
    // Get unlock data from both sources for ETH
    const [messariUnlocks, theTieUnlocks] = await Promise.all([
      messari.getUpcomingUnlocksNormalized(30),
      theTie.getUpcomingUnlocksNormalized(30),
    ]);

    // Filter for specific tokens (example: ETH)
    const ethMessari = messariUnlocks.filter((u: any) => u.symbol === 'ETH');
    const ethTheTie = theTieUnlocks.filter((u: any) => u.ticker === 'ETH');

    logger.info('Comparing unlock data:', {
      messariCount: ethMessari.length,
      theTieCount: ethTheTie.length,
    });

    // Compare specific unlocks
    if (ethMessari.length > 0 && ethTheTie.length > 0) {
      const comparison = theTie.compareUnlockData('ETH', ethMessari, ethTheTie);
      
      comparison.forEach((comp: any) => {
        logger.info(`Comparison for ${comp.unlockDate.toLocaleDateString()}:`, {
          messariAmount: comp.messariData?.unlockAmount,
          theTieAmount: comp.theTieData?.tokensUnlocked,
          consensusAmount: comp.consensusValue.tokensUnlocked,
          confidence: comp.consensusValue.confidence,
          discrepancies: comp.discrepancies.length,
        });
      });
    }

  } catch (error) {
    logger.error('Error comparing unlock data:', error);
  }
}

/**
 * Example 8: Health monitoring of all providers
 */
async function monitorProviderHealth(providers: any) {
  logger.info('=== Example 8: Provider Health Monitoring ===');

  const healthChecks = await Promise.allSettled([
    providers.coinGecko.healthCheck().then((h: boolean) => ({ provider: 'CoinGecko', healthy: h })),
    providers.coinMarketCap.healthCheck().then((h: boolean) => ({ provider: 'CoinMarketCap', healthy: h })),
    providers.dexScreener?.healthCheck().then((h: boolean) => ({ provider: 'DexScreener', healthy: h })),
    providers.defiLlama?.healthCheck().then((h: boolean) => ({ provider: 'DeFiLlama', healthy: h })),
    providers.cryptoPanic?.healthCheck().then((h: boolean) => ({ provider: 'CryptoPanic', healthy: h })),
    providers.messari?.healthCheck().then((h: boolean) => ({ provider: 'Messari', healthy: h })),
    providers.theTie?.healthCheck().then((h: boolean) => ({ provider: 'The Tie', healthy: h })),
  ]);

  healthChecks.forEach((result) => {
    if (result.status === 'fulfilled' && result.value) {
      const status = result.value.healthy ? '✅' : '❌';
      logger.info(`${status} ${result.value.provider}: ${result.value.healthy ? 'Healthy' : 'Unhealthy'}`);
    }
  });
}

/**
 * Main execution
 */
async function main() {
  try {
    // Initialize all providers
    const providers = await initializeProviders();

    // Run all examples
    await getComprehensiveMarketData(providers);
    await setupRealtimePriceUpdates(providers);
    await getDEXData(providers);
    await getDeFiAnalytics(providers);
    await getNewsAndSentiment(providers);
    await getTokenUnlockAnalysis(providers);
    await compareUnlockData(providers);
    await monitorProviderHealth(providers);

    logger.info('=== All examples completed successfully ===');

    // Cleanup
    if (providers.coinGeckoWS) {
      await providers.coinGeckoWS.disconnect();
    }

  } catch (error) {
    logger.error('Error in main execution:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export default main;

