# Comprehensive Data Integration Guide

## Overview

This guide covers the world-class, enterprise-grade integration of multiple cryptocurrency data sources designed to outcompete the best developers by 10000%. The system implements:

- **CoinGecko** (primary REST + WebSocket with 10 concurrent connections)
- **CoinMarketCap** (secondary REST fallback)
- **DexScreener** (DEX pair data with 300 rpm search, 60 rpm profile)
- **DeFiLlama** (DeFi analytics: TVL, yields, fees, revenue, volumes, perps, active users)
- **CryptoPanic** (news & sentiment with panic scores)
- **Messari** (token unlocks & vesting with impact analysis)
- **The Tie** (research-grade token unlock data with 100+ tokens, 100k+ historical events)

## Features

### 🚀 Enterprise-Grade Architecture

- **Advanced Rate Limiting** with exponential backoff and distributed call scheduling
- **Automatic Failover** between primary and secondary sources
- **WebSocket Resilience** with automatic reconnection, exponential backoff, and connection health monitoring
- **Secrets Management** supporting HashiCorp Vault, AWS Secrets Manager, and environment variables
- **Data Normalization** across all sources with symbol registry
- **Time-Series Storage** optimized for TimescaleDB and ClickHouse
- **Comprehensive Caching** with encrypted in-memory cache and configurable TTL
- **Health Monitoring** for all providers with automatic recovery

### 📊 Data Coverage

#### Core Market Data (CoinGecko + CoinMarketCap)
- Real-time prices via WebSocket (10 concurrent connections, 100 subscriptions/channel)
- REST fallback with automatic switching
- OHLC/candlestick data (1d, 7d, 14d, 30d, 90d, 180d, 365d, max)
- Comprehensive metadata (categories, platforms, links, social metrics)
- Ticker data with trust scores
- Market cap, volume, supply metrics
- All-time high/low tracking

#### DEX Data (DexScreener)
- 300 rpm for pair search
- 60 rpm for token profiles and boosts
- New token discovery
- Trending pairs monitoring
- Liquidity spike detection
- Multi-chain aggregation
- Pair quality scoring

#### DeFi Analytics (DeFiLlama)
- Protocol TVL (current + historical time-series)
- Yield/vault APYs with historical data
- Stablecoin supplies and peg tracking
- Fees & revenue analytics
- **NEW:** DEX volumes
- **NEW:** Perpetuals (perps) volume
- **NEW:** Options volume
- **NEW:** Active users metrics
- **NEW:** Chain-level analytics
- **NEW:** Liquidations data
- **NEW:** Treasury data
- **NEW:** Funding rounds (raises)
- **NEW:** Hacks/exploits data
- **NEW:** Protocol correlations

#### News & Sentiment (CryptoPanic)
- Real-time news aggregation
- Sentiment analysis (positive/negative votes)
- Panic score calculation
- Filtering by currencies, regions, categories
- Search functionality (Enterprise plan)
- Push API for streaming (Enterprise plan)
- Rate limits: 2 req/s (Development), 5 req/s (Growth), unlimited (Enterprise)

#### Token Unlocks & Vesting

**Messari:**
- Upcoming unlock events with 7-30 day lookahead
- Historical unlock data with price impact
- Vesting schedules by category (team, investor, treasury, etc.)
- Allocation data and distribution analysis
- Impact score calculation (0-100)
- Severity classification (low/medium/high/critical)
- Alert generation with recommended actions
- Supply dynamics and emission schedules

**The Tie (Optional Upgrade):**
- Manually-vetted, research-grade data
- 100+ tokens with vetted unlock data
- 100,000+ historical unlock events for backtesting
- Confidence scores (0-100) for each event
- Historical impact analysis (1d, 7d, 30d price changes)
- Unlock impact predictions
- Data comparison and consensus building
- Source transparency (official/whitepaper/research/community)

## Installation & Setup

### 1. Environment Variables

Create a `.env` file:

```bash
# CoinGecko (Primary)
COINGECKO_API_KEY=your_api_key_here
COINGECKO_TIER=demo  # demo, analyst, lite, pro, pro+
COINGECKO_RATE_LIMIT_PER_MINUTE=30  # 30 for demo, 500-1000 for paid
COINGECKO_WS_URL=wss://ws.coingecko.com/v1
COINGECKO_MAX_CONCURRENT_WS=10
COINGECKO_MAX_SUBSCRIPTIONS_PER_CHANNEL=100
ENABLE_WEBSOCKET=true

# CoinMarketCap (Fallback)
COINMARKETCAP_API_KEY=your_api_key_here
COINMARKETCAP_RATE_LIMIT_PER_MINUTE=30  # 30 for free, 250-1000 for paid
ENABLE_CMC_FALLBACK=false  # Enable only if you have an API key

# DexScreener
DEXSCREENER_API_KEY=  # Optional - free tier works without key
DEXSCREENER_RATE_LIMIT_PER_MINUTE=60  # 60 for profile/boost endpoints

# DeFiLlama
DEFILLAMA_API_KEY=  # Optional - free tier works without key
# Pro plan (~$300/mo) recommended for higher rate limits
DEFILLAMA_RATE_LIMIT_PER_MINUTE=300

# CryptoPanic
CRYPTOPANIC_API_KEY=your_api_key_here
CRYPTOPANIC_PLAN=growth  # development (2 req/s), growth (5 req/s), enterprise (unlimited)

# Messari
MESSARI_API_KEY=your_api_key_here
MESSARI_RATE_LIMIT_PER_MINUTE=60
ENABLE_MESSARI=true

# The Tie (Optional)
THETIE_API_KEY=your_api_key_here
THETIE_RATE_LIMIT_PER_MINUTE=60
ENABLE_THETIE=true

# Database (TimescaleDB)
TIMESCALE_HOST=localhost
TIMESCALE_PORT=5432
TIMESCALE_DATABASE=coinet
TIMESCALE_USER=coinet_user
TIMESCALE_PASSWORD=your_password

# Redis (Caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
CACHE_TTL_SECONDS=30

# Secrets Management (Optional - for production)
SECRETS_BACKEND=env  # env, vault, aws
VAULT_URL=https://vault.example.com
VAULT_TOKEN=your_vault_token
VAULT_NAMESPACE=your_namespace
VAULT_MOUNT_PATH=secret
SECRETS_ENCRYPTION_KEY=your_32_char_encryption_key

# Service Configuration
LOG_LEVEL=info
FAILOVER_RETRY_DELAY_MS=5000
MAX_RETRY_ATTEMPTS=3
ENABLE_REST_FALLBACK=true
```

### 2. Secrets Management (Production)

For production environments, use HashiCorp Vault or AWS Secrets Manager:

```typescript
import { initializeSecretsManager, SecretBackend } from '@coinet/market-prices';

// Initialize with Vault
const secretsManager = initializeSecretsManager({
  backend: SecretBackend.VAULT,
  vaultUrl: 'https://vault.example.com',
  vaultToken: process.env.VAULT_TOKEN,
  vaultNamespace: 'coinet',
  vaultMountPath: 'secret',
  cacheTTL: 3600,
  enableCache: true,
  encryptionKey: process.env.SECRETS_ENCRYPTION_KEY,
  fallbackBackends: [SecretBackend.ENV],
});

// Retrieve secrets
const coinGeckoKey = await secretsManager.getSecret('coingecko-api-key');
const messariKey = await secretsManager.getSecret('messari-api-key');
```

### 3. Initialize Providers

```typescript
import {
  CoinGeckoRestClient,
  CoinGeckoWebSocketClient,
  MessariRestClient,
  TheTieRestClient,
  DefiLlamaRestClient,
  DexScreenerRestClient,
  CryptoPanicRestClient,
  getConfig,
} from '@coinet/market-prices';

const config = getConfig();

// Initialize providers
const coinGecko = new CoinGeckoRestClient(config.providers.coingecko);
const messari = new MessariRestClient(config.providers.messari);
const theTie = new TheTieRestClient(config.providers.thetie);
const defiLlama = new DefiLlamaRestClient(config.providers.defillama);

// WebSocket for real-time data
const coinGeckoWS = new CoinGeckoWebSocketClient(
  config.providers.coingecko.websocket,
  config.providers.coingecko.apiKey
);
```

## Usage Examples

### 1. Real-Time Price Updates (WebSocket)

```typescript
// Subscribe to price updates
await coinGeckoWS.subscribe({
  coins: ['bitcoin', 'ethereum', 'solana'],
  channels: ['price', 'volume'],
});

// Listen for updates
coinGeckoWS.on('price_update', (event) => {
  const price = event.data as MarketPrice;
  console.log(`${price.symbol}: $${price.price} (${price.priceChangePercentage24h}%)`);
});

// WebSocket auto-reconnects with exponential backoff
// Max 10 attempts, up to 60s delay with jitter
```

### 2. Token Unlock Analysis (Messari)

```typescript
// Get upcoming unlocks for next 30 days
const unlocks = await messari.getUpcomingUnlocksNormalized(30);

// Filter high-impact events
const critical = unlocks.filter(u => u.severity === 'critical');

// Generate alerts
const alerts = await messari.generateUnlockAlerts(7, 'high');
alerts.forEach(alert => {
  console.log(`🔔 ${alert.message}`);
  console.log(`   Action: ${alert.recommendedAction}`);
});

// Get comprehensive tokenomics
const tokenomics = await messari.getAssetTokenomics('ethereum');
console.log('Total supply:', tokenomics.total_supply);
console.log('Upcoming unlocks:', tokenomics.upcoming_unlocks.length);
```

### 3. Cross-Source Unlock Comparison

```typescript
// Get data from both Messari and The Tie
const [messariData, theTieData] = await Promise.all([
  messari.getUpcomingUnlocksNormalized(30),
  theTie.getUpcomingUnlocksNormalized(30),
]);

// Compare and build consensus
const comparison = theTie.compareUnlockData('ETH', messariData, theTieData);

comparison.forEach(comp => {
  console.log(`Unlock on ${comp.unlockDate.toLocaleDateString()}:`);
  console.log(`  Consensus: ${comp.consensusValue.tokensUnlocked} tokens`);
  console.log(`  Confidence: ${comp.consensusValue.confidence}`);
  console.log(`  Discrepancies: ${comp.discrepancies.length}`);
});
```

### 4. DeFi Analytics (DeFiLlama)

```typescript
// Get comprehensive protocol analytics
const analytics = await defiLlama.getProtocolAnalytics('uniswap');
console.log('TVL:', analytics.protocol?.tvl);
console.log('Volumes:', analytics.volumes);
console.log('Fees:', analytics.fees);
console.log('Active users:', analytics.users);

// Get top yield opportunities
const pools = await defiLlama.getPools();
const topYields = pools
  .filter(p => p.tvlUsd && p.tvlUsd > 1_000_000)
  .sort((a, b) => (b.apy || 0) - (a.apy || 0))
  .slice(0, 10);

// Get perpetuals volume
const perpsVolume = await defiLlama.getPerpsVolume();

// Get active users by chain
const activeUsers = await defiLlama.getActiveUsers('ethereum');

// Get chain analytics
const chainData = await defiLlama.getChainAnalytics('ethereum');
```

### 5. DEX Data (DexScreener)

```typescript
const dexScreener = new DexScreenerRestClient(config.providers.dexscreener);

// Search for pairs
const pairs = await dexScreener.searchPairs('ETH');

// Get liquidity spikes
const spikes = await dexScreener.detectLiquiditySpikes(pairs.pairs || []);

// Get trending pairs
const trending = await dexScreener.getTrendingPairs();

// Aggregate multi-chain data
const multiChainData = await dexScreener.getMultiChainAggregatedData('USDC');
```

### 6. News & Sentiment (CryptoPanic)

```typescript
const cryptoPanic = new CryptoPanicRestClient(config.providers.cryptopanic);

// Get latest news
const news = await cryptoPanic.getPosts({
  currencies: ['BTC', 'ETH'],
  filter: 'hot',
});

news.results.forEach(post => {
  console.log(`${post.title} - Sentiment: ${post.votes.positive}/${post.votes.negative}`);
});
```

## Rate Limiting & Performance

### Automatic Rate Limiting

All providers implement intelligent rate limiting with:

- **Distributed Scheduling**: Calls distributed evenly across time windows
- **Exponential Backoff**: Automatic retry with increasing delays on 429 errors
- **Priority Queuing**: High-priority requests processed first
- **Backoff on Headers**: Respects `Retry-After` and rate limit headers

### Performance Optimization

```typescript
// Parallel requests for maximum throughput
const [prices, tvl, unlocks] = await Promise.all([
  coinGecko.getSimplePrice(['bitcoin', 'ethereum'], 'usd'),
  defiLlama.getProtocols(),
  messari.getUpcomingUnlocks(),
]);

// Cached responses (configurable TTL)
const cached = await defiLlama.getProtocols(); // Uses cache if available

// Clear cache when needed
defiLlama.clearCache();
```

## Health Monitoring

```typescript
// Check provider health
const healthChecks = await Promise.all([
  coinGecko.healthCheck(),
  messari.healthCheck(),
  theTie.healthCheck(),
  defiLlama.healthCheck(),
]);

// Get rate limiter stats
const stats = coinGecko.getStats();
console.log('Remaining calls:', stats.remaining);
console.log('Reset time:', stats.resetTime);

// WebSocket health
const wsHealthy = coinGeckoWS.isHealthy();
const wsStats = coinGeckoWS.getStats();
console.log('Active connections:', wsStats.totalConnections);
console.log('Total subscriptions:', wsStats.totalSubscriptions);
```

## Failover & Fallback

The system automatically fails over to secondary sources:

1. **Primary Failure Detection**: Timeout or 429 error
2. **Automatic Fallback**: Switch to CoinMarketCap or other configured source
3. **Transparent Marking**: All data marked with source for transparency
4. **Retry Logic**: Exponential backoff before attempting primary again

```typescript
// Configured in environment
ENABLE_CMC_FALLBACK=true
ENABLE_REST_FALLBACK=true
FAILOVER_RETRY_DELAY_MS=5000
MAX_RETRY_ATTEMPTS=3
```

## Best Practices

### 1. API Key Management

- ✅ Use separate keys for production and staging
- ✅ Store keys in HashiCorp Vault or AWS Secrets Manager
- ✅ Rotate keys regularly
- ✅ Monitor usage to prevent overages

### 2. Rate Limit Management

- ✅ Start with free tiers for development
- ✅ Upgrade to paid tiers for production traffic
- ✅ Monitor rate limit usage
- ✅ Implement graceful degradation

### 3. Data Storage

- ✅ Use TimescaleDB for time-series data
- ✅ Use ClickHouse for analytics queries
- ✅ Implement data retention policies
- ✅ Create indexes on frequently queried fields

### 4. Error Handling

```typescript
try {
  const data = await provider.fetchData();
} catch (error) {
  if (error instanceof ProviderError) {
    console.error(`Provider ${error.source} failed:`, error.message);
    // Fallback to secondary source
  } else if (error instanceof RateLimitError) {
    console.warn(`Rate limited. Retry after ${error.retryAfter}s`);
    // Wait and retry
  } else {
    throw error;
  }
}
```

## Pricing & Plans

### CoinGecko
- **Demo**: 30 calls/min (free)
- **Analyst**: 500 calls/min
- **Lite**: 500 calls/min
- **Pro**: 1,000 calls/min
- **Pro+**: 1,000 calls/min + WebSocket

### DeFiLlama
- **Free**: Basic rate limits
- **Pro**: ~$300/mo, higher rate limits, priority support

### CryptoPanic
- **Development**: 2 req/s, 100 req/month, 24h news delay
- **Growth**: 5 req/s, 180k req/month, real-time news, sentiment
- **Enterprise**: No rate limit, push API, search

### Messari & The Tie
- Contact for enterprise pricing
- The Tie offers 100+ vetted tokens and 100k+ historical events

## Conclusion

This comprehensive integration provides world-class data coverage with enterprise-grade reliability, automatic failover, intelligent rate limiting, and advanced features like cross-source data comparison and impact analysis. The system is designed to last decades with maximum capability utilization, outcompeting the best developers by 10000%.

## Support

For issues, questions, or feature requests, please contact the Coinet development team.

