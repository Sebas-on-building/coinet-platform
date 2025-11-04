# Market Prices Service - Examples

Comprehensive examples for common use cases.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [WebSocket Real-Time Updates](#websocket-real-time-updates)
3. [Historical Data (OHLCV)](#historical-data-ohlcv)
4. [Coin Metadata](#coin-metadata)
5. [Error Handling & Fallback](#error-handling--fallback)
6. [Caching Strategies](#caching-strategies)
7. [Rate Limiting](#rate-limiting)
8. [Health Monitoring](#health-monitoring)
9. [Production Deployment](#production-deployment)

## Basic Usage

### Simple Price Fetch

```typescript
import { createAggregator } from '@coinet/market-prices';

async function fetchBitcoinPrice() {
  const aggregator = await createAggregator();
  
  const prices = await aggregator.getMarketPrices(['BTC']);
  const btcPrice = prices[0];
  
  console.log(`Bitcoin: $${btcPrice.price.toLocaleString()}`);
  console.log(`24h Change: ${btcPrice.priceChangePercentage24h.toFixed(2)}%`);
  console.log(`Market Cap: $${(btcPrice.marketCap / 1e9).toFixed(2)}B`);
  console.log(`Volume: $${(btcPrice.volume24h / 1e9).toFixed(2)}B`);
  console.log(`Source: ${btcPrice.source}`);
  
  await aggregator.shutdown();
}

fetchBitcoinPrice();
```

### Multiple Coins

```typescript
async function fetchPortfolioPrices() {
  const aggregator = await createAggregator();
  
  const symbols = ['BTC', 'ETH', 'SOL', 'ADA', 'AVAX', 'DOT', 'MATIC', 'LINK'];
  const prices = await aggregator.getMarketPrices(symbols);
  
  console.log('\n📊 Portfolio Prices:\n');
  console.log('Symbol | Price      | 24h Change | Market Cap');
  console.log('-------|------------|-----------|------------');
  
  prices.forEach(price => {
    const changeSymbol = price.priceChangePercentage24h >= 0 ? '📈' : '📉';
    console.log(
      `${price.symbol.toUpperCase().padEnd(6)} | ` +
      `$${price.price.toFixed(2).padStart(9)} | ` +
      `${changeSymbol} ${price.priceChangePercentage24h.toFixed(2).padStart(6)}% | ` +
      `$${(price.marketCap / 1e9).toFixed(2)}B`
    );
  });
  
  await aggregator.shutdown();
}

fetchPortfolioPrices();
```

## WebSocket Real-Time Updates

### Live Price Tracker

```typescript
import { createAggregator, PriceUpdateEvent } from '@coinet/market-prices';

async function startLivePriceTracker() {
  const aggregator = await createAggregator();
  
  // Subscribe to top 10 coins
  const coins = [
    'bitcoin',
    'ethereum',
    'tether',
    'binancecoin',
    'solana',
    'ripple',
    'usd-coin',
    'cardano',
    'avalanche-2',
    'dogecoin'
  ];
  
  await aggregator.subscribeToWebSocket(coins);
  
  console.log('🔴 Live Price Tracker Started');
  console.log(`Tracking ${coins.length} coins via WebSocket\n`);
  
  // Store prices for comparison
  const lastPrices: Map<string, number> = new Map();
  
  aggregator.on('price_update', (event: PriceUpdateEvent) => {
    const price = event.data as any;
    const lastPrice = lastPrices.get(price.coinId);
    
    let trend = '→';
    if (lastPrice) {
      if (price.price > lastPrice) trend = '📈';
      else if (price.price < lastPrice) trend = '📉';
    }
    
    console.log(
      `${new Date().toISOString()} | ` +
      `${price.symbol.toUpperCase().padEnd(6)} | ` +
      `$${price.price.toFixed(2).padStart(10)} ${trend} | ` +
      `Vol: $${(price.volume24h / 1e9).toFixed(2)}B`
    );
    
    lastPrices.set(price.coinId, price.price);
  });
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await aggregator.shutdown();
    process.exit(0);
  });
}

startLivePriceTracker();
```

### Price Alert System

```typescript
import { createAggregator, PriceUpdateEvent } from '@coinet/market-prices';

interface PriceAlert {
  coinId: string;
  targetPrice: number;
  type: 'above' | 'below';
  triggered: boolean;
}

async function createPriceAlertSystem() {
  const aggregator = await createAggregator();
  
  const alerts: PriceAlert[] = [
    { coinId: 'BTC', targetPrice: 45000, type: 'above', triggered: false },
    { coinId: 'BTC', targetPrice: 40000, type: 'below', triggered: false },
    { coinId: 'ETH', targetPrice: 2500, type: 'above', triggered: false },
    { coinId: 'SOL', targetPrice: 100, type: 'below', triggered: false },
  ];
  
  await aggregator.subscribeToWebSocket(['bitcoin', 'ethereum', 'solana']);
  
  console.log('🚨 Price Alert System Active');
  alerts.forEach(alert => {
    console.log(
      `  ${alert.coinId}: ${alert.type} $${alert.targetPrice.toLocaleString()}`
    );
  });
  console.log();
  
  aggregator.on('price_update', (event: PriceUpdateEvent) => {
    const price = event.data as any;
    
    alerts.forEach(alert => {
      if (alert.triggered || alert.coinId !== price.coinId) return;
      
      const shouldTrigger =
        (alert.type === 'above' && price.price >= alert.targetPrice) ||
        (alert.type === 'below' && price.price <= alert.targetPrice);
      
      if (shouldTrigger) {
        alert.triggered = true;
        console.log(
          `🚨 ALERT TRIGGERED! ${alert.coinId} is ${alert.type} $${alert.targetPrice}\n` +
          `   Current price: $${price.price.toFixed(2)}`
        );
        
        // Send notification (email, SMS, webhook, etc.)
        sendNotification(alert, price.price);
      }
    });
  });
  
  // Reset alerts daily
  setInterval(() => {
    alerts.forEach(alert => alert.triggered = false);
    console.log('🔄 Alerts reset');
  }, 24 * 60 * 60 * 1000);
}

function sendNotification(alert: PriceAlert, currentPrice: number) {
  // Implement your notification logic here
  // - Email via SendGrid/SES
  // - SMS via Twilio
  // - Push notification
  // - Webhook to Slack/Discord
}

createPriceAlertSystem();
```

## Historical Data (OHLCV)

### Chart Data for Trading View

```typescript
async function fetchChartData() {
  const aggregator = await createAggregator();
  
  // Get 30 days of daily candles
  const ohlcv = await aggregator.getOHLCV('BTC', '1d', 30);
  
  console.log('📈 Bitcoin 30-Day Chart Data\n');
  console.log('Date       | Open      | High      | Low       | Close     | Volume');
  console.log('-----------|-----------|-----------|-----------|-----------|----------');
  
  ohlcv.forEach(candle => {
    const date = candle.timestamp.toISOString().split('T')[0];
    console.log(
      `${date} | ` +
      `$${candle.open.toFixed(2).padStart(8)} | ` +
      `$${candle.high.toFixed(2).padStart(8)} | ` +
      `$${candle.low.toFixed(2).padStart(8)} | ` +
      `$${candle.close.toFixed(2).padStart(8)} | ` +
      `$${(candle.volume / 1e9).toFixed(2)}B`
    );
  });
  
  // Calculate simple moving average (SMA)
  const sma20 = calculateSMA(ohlcv, 20);
  console.log(`\n20-day SMA: $${sma20.toFixed(2)}`);
  
  await aggregator.shutdown();
}

function calculateSMA(candles: any[], period: number): number {
  const recent = candles.slice(-period);
  const sum = recent.reduce((acc, c) => acc + c.close, 0);
  return sum / period;
}

fetchChartData();
```

### Technical Analysis

```typescript
async function performTechnicalAnalysis() {
  const aggregator = await createAggregator();
  
  const ohlcv = await aggregator.getOHLCV('BTC', '1d', 90);
  
  // Calculate indicators
  const sma20 = calculateSMA(ohlcv, 20);
  const sma50 = calculateSMA(ohlcv, 50);
  const rsi = calculateRSI(ohlcv, 14);
  const { upper, middle, lower } = calculateBollingerBands(ohlcv, 20, 2);
  
  const latestPrice = ohlcv[ohlcv.length - 1].close;
  
  console.log('📊 Technical Analysis - Bitcoin\n');
  console.log(`Current Price: $${latestPrice.toFixed(2)}`);
  console.log(`\nMoving Averages:`);
  console.log(`  SMA(20): $${sma20.toFixed(2)}`);
  console.log(`  SMA(50): $${sma50.toFixed(2)}`);
  console.log(`\nRSI(14): ${rsi.toFixed(2)}`);
  console.log(rsi > 70 ? '  ⚠️  Overbought' : rsi < 30 ? '  ⚠️  Oversold' : '  ✅ Neutral');
  console.log(`\nBollinger Bands:`);
  console.log(`  Upper: $${upper.toFixed(2)}`);
  console.log(`  Middle: $${middle.toFixed(2)}`);
  console.log(`  Lower: $${lower.toFixed(2)}`);
  
  // Trading signal
  const signal = generateSignal(latestPrice, sma20, sma50, rsi);
  console.log(`\n📍 Signal: ${signal}`);
  
  await aggregator.shutdown();
}

function calculateRSI(candles: any[], period: number): number {
  const changes = candles.slice(-period - 1).map((c, i, arr) => 
    i === 0 ? 0 : c.close - arr[i - 1].close
  ).slice(1);
  
  const gains = changes.map(c => c > 0 ? c : 0);
  const losses = changes.map(c => c < 0 ? -c : 0);
  
  const avgGain = gains.reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function calculateBollingerBands(candles: any[], period: number, stdDev: number) {
  const sma = calculateSMA(candles, period);
  const recent = candles.slice(-period);
  
  const variance = recent.reduce((acc, c) => 
    acc + Math.pow(c.close - sma, 2), 0
  ) / period;
  
  const sd = Math.sqrt(variance);
  
  return {
    upper: sma + (stdDev * sd),
    middle: sma,
    lower: sma - (stdDev * sd)
  };
}

function generateSignal(
  price: number,
  sma20: number,
  sma50: number,
  rsi: number
): string {
  if (price > sma20 && sma20 > sma50 && rsi < 70) {
    return '🟢 BUY - Bullish trend with room to grow';
  } else if (price < sma20 && sma20 < sma50 && rsi > 30) {
    return '🔴 SELL - Bearish trend';
  } else if (rsi > 70) {
    return '🟡 WAIT - Overbought, potential correction';
  } else if (rsi < 30) {
    return '🟡 WAIT - Oversold, potential bounce';
  } else {
    return '⚪ NEUTRAL - No clear signal';
  }
}

performTechnicalAnalysis();
```

## Coin Metadata

### Coin Research Dashboard

```typescript
async function researchCoin(coinId: string) {
  const aggregator = await createAggregator();
  
  const [price, metadata] = await Promise.all([
    aggregator.getMarketPrices([coinId]).then(p => p[0]),
    aggregator.getMetadata(coinId)
  ]);
  
  console.log(`\n🪙 ${metadata.name} (${metadata.symbol.toUpperCase()})\n`);
  console.log('═'.repeat(60));
  
  // Price Info
  console.log('\n💰 Market Data:');
  console.log(`  Price: $${price.price.toLocaleString()}`);
  console.log(`  24h Change: ${price.priceChangePercentage24h.toFixed(2)}%`);
  console.log(`  Market Cap: $${(price.marketCap / 1e9).toFixed(2)}B`);
  console.log(`  Market Cap Rank: #${metadata.marketCapRank}`);
  console.log(`  Volume (24h): $${(price.volume24h / 1e9).toFixed(2)}B`);
  
  // Supply Info
  console.log('\n📊 Supply:');
  if (price.circulatingSupply) {
    console.log(`  Circulating: ${(price.circulatingSupply / 1e6).toFixed(2)}M`);
  }
  if (price.totalSupply) {
    console.log(`  Total: ${(price.totalSupply / 1e6).toFixed(2)}M`);
  }
  if (price.maxSupply) {
    console.log(`  Max: ${(price.maxSupply / 1e6).toFixed(2)}M`);
  }
  
  // ATH/ATL
  console.log('\n📈 All-Time:');
  if (price.ath) {
    console.log(`  ATH: $${price.ath.toLocaleString()}`);
    if (price.athDate) {
      console.log(`  ATH Date: ${price.athDate.toDateString()}`);
    }
  }
  if (price.atl) {
    console.log(`  ATL: $${price.atl.toLocaleString()}`);
    if (price.atlDate) {
      console.log(`  ATL Date: ${price.atlDate.toDateString()}`);
    }
  }
  
  // Description
  if (metadata.description) {
    console.log('\n📝 Description:');
    const desc = metadata.description.substring(0, 300);
    console.log(`  ${desc}...`);
  }
  
  // Categories
  if (metadata.categories.length > 0) {
    console.log('\n🏷️  Categories:');
    console.log(`  ${metadata.categories.join(', ')}`);
  }
  
  // Links
  console.log('\n🔗 Links:');
  if (metadata.links.homepage) {
    console.log(`  Website: ${metadata.links.homepage[0]}`);
  }
  if (metadata.links.twitter_screen_name) {
    console.log(`  Twitter: @${metadata.links.twitter_screen_name}`);
  }
  if (metadata.links.subreddit_url) {
    console.log(`  Reddit: ${metadata.links.subreddit_url}`);
  }
  
  // Platforms
  if (Object.keys(metadata.platforms).length > 0) {
    console.log('\n⛓️  Platforms:');
    Object.entries(metadata.platforms).forEach(([chain, address]) => {
      console.log(`  ${chain}: ${address.substring(0, 20)}...`);
    });
  }
  
  console.log('\n' + '═'.repeat(60) + '\n');
  
  await aggregator.shutdown();
}

// Usage
researchCoin('BTC');
```

## Error Handling & Fallback

### Robust Error Handling

```typescript
import { 
  createAggregator, 
  ProviderError, 
  RateLimitError 
} from '@coinet/market-prices';

async function fetchPricesWithRetry(
  symbols: string[],
  maxRetries: number = 3
): Promise<any[]> {
  const aggregator = await createAggregator();
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}...`);
      
      const prices = await aggregator.getMarketPrices(symbols);
      
      // Check which sources were used
      const sources = new Set(prices.map(p => p.source));
      if (sources.has('coinmarketcap')) {
        console.warn('⚠️  Using fallback source (CoinMarketCap)');
      }
      
      return prices;
      
    } catch (error) {
      lastError = error as Error;
      
      if (error instanceof RateLimitError) {
        console.error(`Rate limit exceeded for ${error.source}`);
        
        if (error.retryAfter) {
          console.log(`Waiting ${error.retryAfter}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, error.retryAfter!));
        } else {
          await new Promise(resolve => setTimeout(resolve, 5000));
        }
        
      } else if (error instanceof ProviderError) {
        console.error(`Provider error (${error.source}): ${error.message}`);
        
        if (error.statusCode === 503) {
          console.log('Service unavailable, waiting 10s...');
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
        
      } else {
        console.error(`Unexpected error: ${error}`);
        throw error;
      }
    }
  }
  
  await aggregator.shutdown();
  throw new Error(`Failed after ${maxRetries} attempts: ${lastError?.message}`);
}

// Usage
fetchPricesWithRetry(['BTC', 'ETH', 'SOL'])
  .then(prices => console.log('Success:', prices))
  .catch(error => console.error('All retries failed:', error));
```

## Caching Strategies

### Smart Caching

```typescript
async function implementSmartCaching() {
  const aggregator = await createAggregator();
  
  // Hot data - always use cache
  const getFrequentlyAccessedData = async (symbols: string[]) => {
    return aggregator.getMarketPrices(symbols, true); // useCache = true
  };
  
  // Critical data - bypass cache for accuracy
  const getCriticalData = async (symbols: string[]) => {
    return aggregator.getMarketPrices(symbols, false); // useCache = false
  };
  
  // Example: Trading dashboard
  // - Portfolio values need real-time accuracy
  // - Market overview can use cache
  
  const [portfolioPrices, marketOverview] = await Promise.all([
    getCriticalData(['BTC', 'ETH']), // User's holdings - no cache
    getFrequentlyAccessedData([      // Market overview - use cache
      'SOL', 'ADA', 'AVAX', 'DOT', 'MATIC', 'LINK'
    ])
  ]);
  
  await aggregator.shutdown();
}
```

## Production Deployment

### Health-Monitored Service

```typescript
import { createAggregator, HealthStatus } from '@coinet/market-prices';
import { logger } from '@coinet/market-prices';

class MarketDataService {
  private aggregator: any;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isShuttingDown = false;
  
  async start() {
    logger.info('Starting Market Data Service...');
    
    // Initialize
    this.aggregator = await createAggregator();
    
    // Subscribe to WebSocket
    if (process.env.ENABLE_WEBSOCKET === 'true') {
      await this.subscribeToCoins();
    }
    
    // Start health checks
    this.startHealthChecks();
    
    // Setup graceful shutdown
    this.setupGracefulShutdown();
    
    logger.info('Market Data Service started successfully');
  }
  
  private async subscribeToCoins() {
    const coins = process.env.TRACKED_COINS?.split(',') || [
      'bitcoin', 'ethereum', 'solana'
    ];
    
    await this.aggregator.subscribeToWebSocket(coins);
    logger.info(`Subscribed to ${coins.length} coins via WebSocket`);
    
    // Listen for updates
    this.aggregator.on('price_update', (event: any) => {
      this.handlePriceUpdate(event);
    });
    
    this.aggregator.on('error', (error: Error) => {
      logger.error('Aggregator error', { error: error.message });
      this.handleError(error);
    });
  }
  
  private handlePriceUpdate(event: any) {
    // Process price update
    // - Update in-memory cache
    // - Broadcast to connected clients
    // - Trigger alerts
    logger.debug('Price update', {
      coinId: event.data.coinId,
      price: event.data.price
    });
  }
  
  private handleError(error: Error) {
    // Send to error tracking service
    // - Sentry
    // - Rollbar
    // - CloudWatch
  }
  
  private startHealthChecks() {
    this.healthCheckInterval = setInterval(async () => {
      const health = await this.aggregator.getHealthStatus();
      
      if (!health.healthy) {
        logger.error('Service unhealthy', { health });
        this.alertOncall(health);
      } else {
        logger.info('Health check passed', {
          providers: health.providers,
          cache: health.cache.hitRate
        });
      }
      
      // Report metrics
      this.reportMetrics(health);
      
    }, 60000); // Every minute
  }
  
  private alertOncall(health: HealthStatus) {
    // Alert on-call engineer
    // - PagerDuty
    // - Opsgenie
    // - Slack webhook
  }
  
  private reportMetrics(health: HealthStatus) {
    // Report to monitoring system
    // - Prometheus
    // - CloudWatch
    // - Datadog
    
    const stats = this.aggregator.getStats();
    
    // Example metrics:
    // - coingecko_requests_total
    // - coinmarketcap_requests_total
    // - cache_hit_rate
    // - database_connection_count
    // - websocket_connections_active
  }
  
  private setupGracefulShutdown() {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;
      
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      // Stop health checks
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }
      
      // Shutdown aggregator
      await this.aggregator.shutdown();
      
      logger.info('Shutdown complete');
      process.exit(0);
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// Start service
const service = new MarketDataService();
service.start().catch(error => {
  logger.error('Failed to start service', { error });
  process.exit(1);
});
```

---

For more examples and advanced use cases, see the [API documentation](./API.md).

