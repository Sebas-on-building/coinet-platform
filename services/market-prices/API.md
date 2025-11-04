# Market Prices Service - API Documentation

Complete API reference for the Market Prices Service.

## Table of Contents

1. [MarketDataAggregator](#marketdataaggregator)
2. [Provider Clients](#provider-clients)
3. [Storage Layer](#storage-layer)
4. [Data Types](#data-types)
5. [Error Handling](#error-handling)

## MarketDataAggregator

The main orchestration class.

### Constructor

```typescript
constructor(config: ServiceConfig)
```

Create a new aggregator instance with the given configuration.

**Parameters:**
- `config: ServiceConfig` - Service configuration object

**Example:**
```typescript
import { MarketDataAggregator, getConfig } from '@coinet/market-prices';

const config = getConfig();
const aggregator = new MarketDataAggregator(config);
```

### Methods

#### initialize()

```typescript
async initialize(): Promise<void>
```

Initialize the aggregator, database schema, and all connections.

**Returns:** `Promise<void>`

**Throws:** 
- `Error` if database initialization fails
- `Error` if health checks fail

**Example:**
```typescript
await aggregator.initialize();
```

---

#### getMarketPrices()

```typescript
async getMarketPrices(
  symbols: string[],
  useCache?: boolean
): Promise<MarketPrice[]>
```

Get current market prices for multiple coins with automatic failover.

**Parameters:**
- `symbols: string[]` - Array of coin symbols (e.g., ['BTC', 'ETH'])
- `useCache?: boolean` - Whether to use cache (default: true)

**Returns:** `Promise<MarketPrice[]>`

**Throws:**
- `ProviderError` if all providers fail
- `RateLimitError` if rate limit exceeded

**Failover Flow:**
1. Check cache (if enabled)
2. Try CoinGecko REST API
3. Fallback to CoinMarketCap (if enabled)
4. Last resort: database

**Example:**
```typescript
const prices = await aggregator.getMarketPrices(['BTC', 'ETH', 'SOL']);

prices.forEach(price => {
  console.log(`${price.symbol}: $${price.price}`);
  console.log(`Source: ${price.source}`); // 'coingecko' or 'coinmarketcap'
});
```

---

#### getOHLCV()

```typescript
async getOHLCV(
  coinId: string,
  interval: string,
  days: number,
  useCache?: boolean
): Promise<OHLCV[]>
```

Get OHLC (candlestick) data for a coin.

**Parameters:**
- `coinId: string` - Coin identifier
- `interval: string` - Time interval (e.g., '1h', '1d')
- `days: number` - Number of days of history
- `useCache?: boolean` - Whether to use cache (default: true)

**Returns:** `Promise<OHLCV[]>`

**Example:**
```typescript
// Get 7 days of daily candles
const candles = await aggregator.getOHLCV('BTC', '1d', 7);

candles.forEach(candle => {
  console.log(`${candle.timestamp}: O:${candle.open} H:${candle.high} L:${candle.low} C:${candle.close}`);
});
```

---

#### getMetadata()

```typescript
async getMetadata(
  coinId: string,
  useCache?: boolean
): Promise<CoinMetadata>
```

Get comprehensive metadata for a coin.

**Parameters:**
- `coinId: string` - Coin identifier
- `useCache?: boolean` - Whether to use cache (default: true)

**Returns:** `Promise<CoinMetadata>`

**Example:**
```typescript
const metadata = await aggregator.getMetadata('BTC');

console.log(`Name: ${metadata.name}`);
console.log(`Description: ${metadata.description}`);
console.log(`Categories: ${metadata.categories.join(', ')}`);
console.log(`Website: ${metadata.links.homepage?.[0]}`);
```

---

#### subscribeToWebSocket()

```typescript
async subscribeToWebSocket(coins: string[]): Promise<void>
```

Subscribe to real-time WebSocket price updates.

**Parameters:**
- `coins: string[]` - Array of CoinGecko IDs (e.g., ['bitcoin', 'ethereum'])

**Returns:** `Promise<void>`

**Note:** Maximum 100 subscriptions per channel, up to 10 channels.

**Example:**
```typescript
await aggregator.subscribeToWebSocket(['bitcoin', 'ethereum', 'solana']);

// Listen for updates
aggregator.on('price_update', (event) => {
  console.log('New price:', event.data);
});
```

---

#### getHealthStatus()

```typescript
async getHealthStatus(): Promise<HealthStatus>
```

Get comprehensive health status of all service components.

**Returns:** `Promise<HealthStatus>`

**Example:**
```typescript
const health = await aggregator.getHealthStatus();

console.log('Service healthy:', health.healthy);
console.log('CoinGecko REST:', health.providers.coingecko.rest);
console.log('CoinGecko WebSocket:', health.providers.coingecko.websocket);
console.log('Database:', health.database.connected);
console.log('Cache hit rate:', health.cache.hitRate);
```

---

#### getStats()

```typescript
getStats(): any
```

Get statistics for all components.

**Returns:** Statistics object

**Example:**
```typescript
const stats = aggregator.getStats();

console.log('CoinGecko requests:', stats.geckoRest);
console.log('WebSocket connections:', stats.geckoWs);
```

---

#### shutdown()

```typescript
async shutdown(): Promise<void>
```

Gracefully shutdown the aggregator and close all connections.

**Returns:** `Promise<void>`

**Example:**
```typescript
// Graceful shutdown on SIGTERM
process.on('SIGTERM', async () => {
  await aggregator.shutdown();
  process.exit(0);
});
```

---

### Events

The aggregator extends EventEmitter and emits the following events:

#### price_update

Emitted when a new price update is received via WebSocket.

```typescript
aggregator.on('price_update', (event: PriceUpdateEvent) => {
  console.log('Price update:', event);
});
```

**Event Data:**
```typescript
interface PriceUpdateEvent {
  type: 'price' | 'ticker' | 'ohlcv' | 'metadata';
  data: MarketPrice | TickerData | OHLCV | CoinMetadata;
  source: DataSource;
  timestamp: Date;
}
```

#### error

Emitted when an error occurs.

```typescript
aggregator.on('error', (error: Error) => {
  console.error('Error:', error);
});
```

---

## Provider Clients

### CoinGeckoRestClient

Direct access to CoinGecko REST API.

```typescript
import { CoinGeckoRestClient } from '@coinet/market-prices';

const client = new CoinGeckoRestClient(config.providers.coingecko);
```

#### Methods

##### getSimplePrice()

```typescript
async getSimplePrice(
  ids: string | string[],
  vsCurrencies?: string | string[],
  includeMarketCap?: boolean,
  include24hrVol?: boolean,
  include24hrChange?: boolean,
  includeLastUpdatedAt?: boolean
): Promise<CoinGeckoSimplePrice>
```

Get simple price data for one or more coins.

##### getCoinMarkets()

```typescript
async getCoinMarkets(
  vsCurrency?: string,
  ids?: string[],
  category?: string,
  order?: string,
  perPage?: number,
  page?: number,
  sparkline?: boolean,
  priceChangePercentage?: string
): Promise<CoinGeckoMarket[]>
```

Get coin market data with extensive details.

##### getOHLC()

```typescript
async getOHLC(
  id: string,
  vsCurrency?: string,
  days?: number | 'max'
): Promise<number[][]>
```

Get OHLC data.

##### getCoinById()

```typescript
async getCoinById(
  id: string,
  localization?: boolean,
  tickers?: boolean,
  marketData?: boolean,
  communityData?: boolean,
  developerData?: boolean,
  sparkline?: boolean
): Promise<CoinGeckoCoin>
```

Get comprehensive coin data.

##### healthCheck()

```typescript
async healthCheck(): Promise<boolean>
```

Check if CoinGecko API is accessible.

---

### CoinGeckoWebSocketClient

Real-time WebSocket connection to CoinGecko.

```typescript
import { CoinGeckoWebSocketClient } from '@coinet/market-prices';

const wsClient = new CoinGeckoWebSocketClient(
  config.providers.coingecko.websocket,
  config.providers.coingecko.apiKey
);
```

#### Methods

##### subscribe()

```typescript
async subscribe(options: SubscriptionOptions): Promise<void>
```

Subscribe to price updates.

```typescript
interface SubscriptionOptions {
  coins: string[];
  channels?: string[];
}
```

##### unsubscribe()

```typescript
async unsubscribe(coins: string[]): Promise<void>
```

Unsubscribe from specific coins.

##### getSubscriptions()

```typescript
getSubscriptions(): string[]
```

Get all active subscriptions.

##### disconnect()

```typescript
async disconnect(): Promise<void>
```

Disconnect all WebSocket connections.

---

### CoinMarketCapRestClient

Direct access to CoinMarketCap REST API.

```typescript
import { CoinMarketCapRestClient } from '@coinet/market-prices';

const client = new CoinMarketCapRestClient(config.providers.coinmarketcap);
```

#### Methods

##### getQuotesBySymbol()

```typescript
async getQuotesBySymbol(
  symbols: string | string[],
  convert?: string
): Promise<CoinMarketCapQuote>
```

Get latest quotes by symbol.

##### getListingsLatest()

```typescript
async getListingsLatest(
  start?: number,
  limit?: number,
  convert?: string,
  sort?: string,
  sortDir?: 'asc' | 'desc',
  cryptocurrencyType?: 'all' | 'coins' | 'tokens'
): Promise<CoinMarketCapListing>
```

Get latest cryptocurrency listings.

##### getOHLCV()

```typescript
async getOHLCV(
  id: number,
  convert?: string,
  timePeriod?: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly',
  timeStart?: string | number,
  timeEnd?: string | number,
  count?: number,
  interval?: string
): Promise<CoinMarketCapOHLCV>
```

Get OHLCV data.

---

## Storage Layer

### TimescaleStorage

Time-series database storage.

```typescript
import { TimescaleStorage } from '@coinet/market-prices';

const storage = new TimescaleStorage(config.database);
await storage.initialize();
```

#### Methods

##### storeMarketPrice()

```typescript
async storeMarketPrice(price: MarketPrice): Promise<void>
```

Store a single market price.

##### storeMarketPrices()

```typescript
async storeMarketPrices(prices: MarketPrice[]): Promise<void>
```

Store multiple prices in a transaction.

##### storeOHLCV()

```typescript
async storeOHLCV(ohlcv: OHLCV[]): Promise<void>
```

Store OHLCV data.

##### storeMetadata()

```typescript
async storeMetadata(metadata: CoinMetadata): Promise<void>
```

Store coin metadata.

##### getLatestPrice()

```typescript
async getLatestPrice(
  coinId: string,
  source?: DataSource
): Promise<MarketPrice | null>
```

Get the latest price from database.

---

### CacheStorage

Redis-based caching.

```typescript
import { CacheStorage } from '@coinet/market-prices';

const cache = new CacheStorage(config.redis, config.cacheTTL);
```

#### Methods

##### cachePrice()

```typescript
async cachePrice(price: MarketPrice): Promise<void>
```

Cache a market price.

##### getPrice()

```typescript
async getPrice(
  coinId: string,
  source?: DataSource
): Promise<MarketPrice | null>
```

Get cached price.

##### invalidate()

```typescript
async invalidate(coinId: string): Promise<void>
```

Invalidate all cache for a coin.

##### getStats()

```typescript
async getStats(): Promise<any>
```

Get cache statistics including hit rate.

---

## Data Types

### MarketPrice

```typescript
interface MarketPrice {
  symbol: string;
  coinId: string;
  price: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  marketCap: number;
  volume24h: number;
  circulatingSupply?: number;
  totalSupply?: number;
  maxSupply?: number;
  ath?: number;
  athDate?: Date;
  atl?: number;
  atlDate?: Date;
  lastUpdated: Date;
  source: DataSource;
  updateType: PriceUpdateType;
}
```

### OHLCV

```typescript
interface OHLCV {
  symbol: string;
  coinId: string;
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  source: DataSource;
}
```

### CoinMetadata

```typescript
interface CoinMetadata {
  coinId: string;
  symbol: string;
  name: string;
  description?: string;
  categories: string[];
  platforms: Record<string, string>;
  links: {
    homepage?: string[];
    blockchain_site?: string[];
    twitter_screen_name?: string;
    // ... more links
  };
  image?: {
    thumb?: string;
    small?: string;
    large?: string;
  };
  genesisDate?: Date;
  marketCapRank?: number;
  lastUpdated: Date;
  source: DataSource;
}
```

### HealthStatus

```typescript
interface HealthStatus {
  service: string;
  healthy: boolean;
  timestamp: Date;
  providers: {
    coingecko: {
      rest: boolean;
      websocket: boolean;
      lastSuccessfulRequest?: Date;
      lastError?: string;
    };
    coinmarketcap: {
      rest: boolean;
      lastSuccessfulRequest?: Date;
      lastError?: string;
    };
  };
  database: {
    connected: boolean;
    lastWrite?: Date;
  };
  cache: {
    connected: boolean;
    hitRate?: number;
  };
}
```

### DataSource

```typescript
enum DataSource {
  COINGECKO = 'coingecko',
  COINMARKETCAP = 'coinmarketcap',
}
```

### PriceUpdateType

```typescript
enum PriceUpdateType {
  WEBSOCKET = 'websocket',
  REST = 'rest',
  CACHED = 'cached',
}
```

---

## Error Handling

### Error Types

#### RateLimitError

Thrown when rate limit is exceeded.

```typescript
class RateLimitError extends Error {
  retryAfter?: number;  // Milliseconds to wait
  source?: DataSource;
}
```

**Example:**
```typescript
try {
  const prices = await aggregator.getMarketPrices(['BTC']);
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Rate limit exceeded for ${error.source}`);
    console.log(`Retry after ${error.retryAfter}ms`);
  }
}
```

#### ProviderError

Thrown when a provider request fails.

```typescript
class ProviderError extends Error {
  source: DataSource;
  statusCode?: number;
  originalError?: any;
}
```

**Example:**
```typescript
try {
  const prices = await aggregator.getMarketPrices(['BTC']);
} catch (error) {
  if (error instanceof ProviderError) {
    console.log(`Provider ${error.source} failed with status ${error.statusCode}`);
  }
}
```

#### DataNormalizationError

Thrown when data normalization fails.

```typescript
class DataNormalizationError extends Error {
  source: DataSource;
  rawData?: any;
}
```

---

## Configuration

### ServiceConfig

```typescript
interface ServiceConfig {
  providers: {
    coingecko: ProviderConfig;
    coinmarketcap: ProviderConfig;
  };
  database: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
  };
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  cacheTTL: number;
  failoverRetryDelay: number;
  maxRetryAttempts: number;
  enableWebSocket: boolean;
  enableRestFallback: boolean;
  enableCMCFallback: boolean;
  logLevel: string;
}
```

### Loading Configuration

```typescript
import { getConfig, buildConfig, validateConfig } from '@coinet/market-prices';

// Get config (singleton)
const config = getConfig();

// Or build new config
const newConfig = buildConfig();
validateConfig(newConfig);
```

---

For usage examples, see [EXAMPLES.md](./EXAMPLES.md).

