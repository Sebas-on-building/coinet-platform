# Testing Guide - DeFi Features

## Quick Test Commands

### 1. Build & Type Check

```bash
cd services/market-prices
npm run build
```

### 2. Run DeFi Benchmarks

```bash
# Full DeFi benchmark suite
npm run benchmark:defi

# Quick benchmark (shorter duration)
BENCHMARK_DURATION=30000 npm run benchmark:defi

# With JSON output for CI/CD
OUTPUT_JSON=true npm run benchmark:defi
```

### 3. Test Individual Components

#### DexScreener Enhanced
```bash
# Create test file: test-dexscreener-enhanced.ts
ts-node -e "
import { DexScreenerEnhancedClient } from './src/providers/dexscreener-enhanced';
import { ProviderConfig, DataSource } from './src/types';

const config: ProviderConfig = {
  apiUrl: 'https://api.dexscreener.com/latest/dex',
  apiKey: process.env.DEXSCREENER_PRO_KEY || 'free-tier',
  rateLimit: { maxRequestsPerMinute: 300 },
  retry: { retries: 3, retryDelay: 1000 },
};

const client = new DexScreenerEnhancedClient(config, {
  proApiKeys: process.env.DEXSCREENER_PRO_KEY ? [process.env.DEXSCREENER_PRO_KEY] : undefined,
});

(async () => {
  console.log('Testing DexScreener Enhanced...');
  const pairs = await client.searchPairs('ETH');
  console.log('✅ Search successful:', pairs.pairs?.length || 0, 'pairs');
  
  const planInfo = client.getPlanInfo();
  console.log('Plan:', planInfo.plan);
  console.log('Quota remaining:', planInfo.quotaRemaining);
  
  const metrics = client.getMetrics();
  console.log('Efficiency:', metrics.efficiencyMultiplier.toFixed(1) + 'x');
  console.log('Cache stats:', client.getCacheStats());
  
  await client.shutdown();
})();
"
```

#### DeFiLlama Enhanced
```bash
ts-node -e "
import { DeFiLlamaEnhancedClient } from './src/providers/defillama-enhanced';
import { ProviderConfig } from './src/types';

const config: ProviderConfig = {
  apiUrl: 'https://api.llama.fi',
  apiKey: process.env.DEFILLAMA_PRO_KEY,
  rateLimit: { maxRequestsPerMinute: 30 },
  retry: { retries: 3, retryDelay: 1000 },
};

const client = new DeFiLlamaEnhancedClient(config, {
  proApiKey: process.env.DEFILLAMA_PRO_KEY,
});

(async () => {
  console.log('Testing DeFiLlama Enhanced...');
  const protocols = await client.getProtocols();
  console.log('✅ Protocols fetched:', protocols.length);
  
  const planInfo = client.getPlanInfo();
  console.log('Plan:', planInfo.plan);
  
  const metrics = client.getMetrics();
  console.log('Efficiency:', metrics.efficiencyMultiplier.toFixed(1) + 'x');
  console.log('Volatility:', metrics.currentVolatility);
  console.log('Adaptive interval:', metrics.adaptiveIntervalMs + 'ms');
  
  await client.shutdown();
})();
"
```

#### Token Discovery
```bash
ts-node -e "
import { DexScreenerEnhancedClient } from './src/providers/dexscreener-enhanced';
import { TokenDiscoveryService } from './src/services/token-discovery.service';
import { ProviderConfig } from './src/types';

const dexConfig: ProviderConfig = {
  apiUrl: 'https://api.dexscreener.com/latest/dex',
  apiKey: process.env.DEXSCREENER_PRO_KEY || 'free-tier',
  rateLimit: { maxRequestsPerMinute: 300 },
  retry: { retries: 3, retryDelay: 1000 },
};

const dexScreener = new DexScreenerEnhancedClient(dexConfig);
const discovery = new TokenDiscoveryService(dexScreener, {
  enabled: true,
  intervalMs: 60000,
  chains: ['ethereum', 'bsc'],
  filters: {
    minLiquidityUsd: 10000,
    minVolume24h: 5000,
    maxAgeHours: 24,
  },
});

discovery.on('token_discovered', (token) => {
  console.log('🔍 New token:', token.token.symbol);
  console.log('   Chain:', token.chainId);
  console.log('   Liquidity:', token.analysis.totalLiquidity);
  console.log('   Risk:', token.analysis.riskLevel);
});

discovery.on('scan_complete', (data) => {
  console.log('✅ Scan complete:', data.discovered, 'tokens');
});

(async () => {
  console.log('Starting token discovery test...');
  discovery.start();
  
  // Run for 2 minutes
  setTimeout(async () => {
    const stats = discovery.getStatistics();
    console.log('Statistics:', stats);
    discovery.stop();
    await dexScreener.shutdown();
  }, 120000);
})();
"
```

#### Unified Aggregator
```bash
ts-node -e "
import { DexScreenerEnhancedClient } from './src/providers/dexscreener-enhanced';
import { DeFiLlamaEnhancedClient } from './src/providers/defillama-enhanced';
import { DefiAggregator } from './src/services/defi-aggregator';
import { ProviderConfig } from './src/types';

const dexConfig: ProviderConfig = {
  apiUrl: 'https://api.dexscreener.com/latest/dex',
  apiKey: process.env.DEXSCREENER_PRO_KEY || 'free-tier',
  rateLimit: { maxRequestsPerMinute: 300 },
  retry: { retries: 3, retryDelay: 1000 },
};

const defiConfig: ProviderConfig = {
  apiUrl: 'https://api.llama.fi',
  apiKey: process.env.DEFILLAMA_PRO_KEY,
  rateLimit: { maxRequestsPerMinute: 30 },
  retry: { retries: 3, retryDelay: 1000 },
};

const dexScreener = new DexScreenerEnhancedClient(dexConfig);
const defiLlama = new DeFiLlamaEnhancedClient(defiConfig);
const aggregator = new DefiAggregator(dexScreener, defiLlama);

(async () => {
  console.log('Testing Unified Aggregator...');
  
  const startTime = Date.now();
  const tokenData = await aggregator.getUnifiedTokenData('ETH', {
    includeNews: false,
    includeYields: true,
  });
  const latency = Date.now() - startTime;
  
  if (tokenData) {
    console.log('✅ Unified token data fetched in', latency + 'ms');
    console.log('Price:', tokenData.currentPrice);
    console.log('DEX Liquidity:', tokenData.dex.totalLiquidity);
    console.log('DeFi TVL:', tokenData.defi.tvl);
    console.log('Overall Score:', tokenData.scores.overall.toFixed(1));
    console.log('Risk Score:', tokenData.scores.risk.toFixed(1));
  }
  
  const overviewStart = Date.now();
  const overview = await aggregator.getMarketOverview();
  const overviewLatency = Date.now() - overviewStart;
  
  console.log('✅ Market overview fetched in', overviewLatency + 'ms');
  console.log('Total TVL:', overview.tvl.total);
  console.log('Market Sentiment:', overview.sentiment.marketSentiment);
  console.log('Market Risk:', overview.risk.marketRisk);
  
  const metrics = aggregator.getMetrics();
  console.log('Aggregator Efficiency:', metrics.efficiencyMultiplier.toFixed(1) + 'x');
  console.log('Cache Hit Rate:', (metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses) * 100).toFixed(1) + '%');
  
  aggregator.destroy();
  await dexScreener.shutdown();
  await defiLlama.shutdown();
})();
"
```

## Railway Testing

### Environment Variables to Set

```bash
# DexScreener (optional - works with free tier)
DEXSCREENER_PRO_KEY=your_pro_key_here

# DeFiLlama (optional - works with free tier)
DEFILLAMA_PRO_KEY=your_pro_key_here

# CryptoPanic (optional)
CRYPTOPANIC_API_KEY=your_key_here

# Redis (optional - for distributed caching)
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_password
REDIS_DB=0
```

### Health Check Endpoint

The service should expose a health endpoint that includes DeFi provider status:

```bash
curl https://your-service.railway.app/api/health | jq
```

Expected response should include:
- `providers.dexscreener` status
- `providers.defillama` status
- Cache statistics
- Efficiency metrics

### Monitor Logs

```bash
# In Railway dashboard, check logs for:
# - "DexScreener Enhanced Client initialized"
# - "DeFiLlama Enhanced Client initialized"
# - "Token Discovery Service initialized"
# - "DeFi Aggregator initialized"
```

## Codespace Testing

### 1. Install Dependencies

```bash
cd services/market-prices
npm install
```

### 2. Set Environment Variables

```bash
export DEXSCREENER_PRO_KEY=your_key
export DEFILLAMA_PRO_KEY=your_key
export CRYPTOPANIC_API_KEY=your_key
```

### 3. Run Build

```bash
npm run build
```

### 4. Run Benchmarks

```bash
# Quick test (30 seconds)
BENCHMARK_DURATION=30000 npm run benchmark:defi

# Full test (60 seconds)
npm run benchmark:defi
```

### 5. Check Results

Look for:
- ✅ All tests passing
- Efficiency multiplier >= 50x
- Cache hit rate >= 95%
- P95 latency < 50ms

## Expected Output

### Successful Benchmark Run

```
═══════════════════════════════════════════════════════════════
                    DEFI BENCHMARK SUITE                        
═══════════════════════════════════════════════════════════════

📊 Running DexScreener Enhanced Benchmark...
   ✅ DexScreener Enhanced: Efficiency 52.3x, Cache Hit 96.2%

📈 Running DeFiLlama Adaptive Polling Benchmark...
   ✅ DeFiLlama Adaptive: Efficiency 48.7x, Avg Latency 45.2ms

🔍 Running Token Discovery Benchmark...
   ✅ Token Discovery: Discovered 156 tokens, Avg Time 123.4ms

🔗 Running Unified Aggregator Benchmark...
   ✅ Unified Aggregator: Efficiency 51.8x, P95 42.3ms

💭 Running AI Sentiment Analysis Benchmark...
   ✅ AI Sentiment Analysis: Analyzed 500 articles, Avg 3.2ms per article

═══════════════════════════════════════════════════════════════
                       BENCHMARK RESULTS                        
═══════════════════════════════════════════════════════════════

Overall: PASSED ✅
Efficiency Multiplier: 51.2x (target: 50x)
Cache Hit Rate: 96.1% (target: 95%)
Average Latency: 38.5ms
Pass Rate: 100% (5/5)
```

## Troubleshooting

### Build Errors

If you see TypeScript errors:
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Missing Dependencies

If `ws` package is missing:
```bash
npm install ws @types/ws
```

### Redis Connection Issues

If Redis is not available, the services will gracefully fall back to in-memory caching. Check logs for:
```
DexScreener Enhanced Redis error, falling back to in-memory cache
```

This is expected and acceptable for development.

## Performance Targets

| Component | Target | How to Verify |
|-----------|--------|---------------|
| DexScreener | 50x+ efficiency | Run benchmark:defi |
| DeFiLlama | Adaptive polling | Check volatility detection |
| Token Discovery | <200ms per chain | Run discovery test |
| Aggregator | <50ms P95 | Run aggregator test |
| Sentiment | <10ms per article | Run sentiment test |

## Next Steps

1. ✅ Push to GitHub
2. ✅ Test in Codespace
3. ✅ Deploy to Railway
4. ✅ Monitor metrics
5. ✅ Run production benchmarks

