# Coinet News Aggregation Service

This service provides a comprehensive cryptocurrency news aggregation system with multiple trusted sources, sentiment analysis, and advanced filtering capabilities.

## Trusted News Sources

The service integrates with multiple high-quality crypto news sources:

### RSS-based Sources

- **Cointelegraph** - One of the most prominent cryptocurrency news outlets with comprehensive coverage
- **Crypto.news** - Fast-paced crypto news with market analysis and project updates
- **CoinDesk** - Premier crypto media outlet with in-depth reporting and analysis
- **CryptoCompare** - Crypto data provider with market news and updates

### Twitter/X-based Sources

- **Whale Alert** (@whale_alert) - Live alerts for large "whale" transactions across 100+ blockchains, essential for tracking big money moves
- **CryptoQuant** (@cryptoquant_com) - Institutional-grade on-chain metrics and exchange flow data with actionable insights
- **Glassnode Alerts** (@glassnodealerts) - Definitive on-chain alerts covering exchange flows and holder metrics for BTC, ETH, and major tokens
- **Santiment** (@santimentfeed) - Combined on-chain, social and development activity metrics for 3,800+ assets
- **RadarHits** (@RadarHits) - General real-time news feed that includes crypto "JUST IN" alerts

## Features

- **Source Aggregation** - Combines data from multiple trusted crypto news sources
- **Sentiment Analysis** - Analyzes news sentiment and potential market impact
- **Asset Detection** - Identifies mentioned assets and correlates news to specific cryptocurrencies
- **Category Classification** - Organizes news into categories (market, regulatory, technology, etc.)
- **Advanced Filtering** - Filter by source, asset, category, date range, and more
- **Deduplication** - Identifies and removes duplicate news from different sources
- **Real-time Updates** - Support for real-time news from Twitter sources
- **Caching System** - Optimized performance with smart caching
- **Verification** - Tracks sources reliability and fact-checking

## Key Concepts

- **NewsItem** - Standardized format for all news items regardless of source
- **NewsSourceAdapter** - Interface for connecting to different news sources
- **NewsAggregationService** - Core service that combines and processes news
- **NewsFilter** - Parameters for filtering news results

## Usage Examples

### Basic Usage

```typescript
import { NewsAggregationService } from "./services/news/NewsAggregationService";

// Get the service instance
const newsService = NewsAggregationService.getInstance();

// Fetch the latest news
const latestNews = await newsService.fetchNews({ limit: 20 });

// Search for specific news
const searchResults = await newsService.searchNews("bitcoin ETF", {
  limit: 10,
});

// Get news for a specific asset
const bitcoinNews = await newsService.getAssetNews("BTC", { limit: 10 });
```

### Advanced Filtering

```typescript
// Get regulatory news with high impact
const regulatoryNews = await newsService.fetchNews({
  categories: ["regulatory"],
  impactThreshold: 0.7,
  sortBy: "impact",
  limit: 5,
});

// Get news from specific sources
const trustworthyNews = await newsService.fetchNews({
  sources: ["cointelegraph", "coindesk", "glassnode-alerts"],
  verifiedOnly: true,
  limit: 10,
});

// Get market news for specific assets
const marketNews = await newsService.fetchNews({
  categories: ["market"],
  assets: ["BTC", "ETH"],
  publishedAfter: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  sortBy: "date",
  limit: 10,
});
```

## Configuration

When initializing the news service, you can specify which sources to enable and provide necessary API keys:

```typescript
const config = {
  enabledSources: [
    "cointelegraph",
    "crypto-news",
    "coindesk",
    "cryptocompare",
    "whale-alert",
    "cryptoquant",
    "glassnode-alerts",
    "santiment",
  ],
  cacheDuration: 5 * 60 * 1000, // 5 minutes
  maxCacheItems: 1000,
  apiKeys: {
    cryptocompare: process.env.CRYPTOCOMPARE_API_KEY,
    twitter: process.env.TWITTER_API_KEY,
  },
};

const newsService = NewsAggregationService.getInstance(config);
```

## Adding New Sources

The system is designed to be easily extensible with new sources:

1. Create a new adapter class that extends `BaseNewsSourceAdapter`
2. Implement the required methods: `fetchNews`, `searchNews`, `getNewsDetails`, and `getCapabilities`
3. Register the adapter in the `NewsSourceFactory`

## Demo

To see the service in action, run the demo script:

```
npm run demo:news
```

This will demonstrate fetching news from all sources, filtering by asset, source, and impact level.

## Environment Variables

- `CRYPTOCOMPARE_API_KEY` - API key for CryptoCompare
- `TWITTER_API_KEY` - API key for Twitter/X API (bearer token)
- `NEWS_CACHE_DURATION` - Cache duration in milliseconds (optional, default: 300000)
- `NEWS_MAX_CACHE_ITEMS` - Maximum number of cached items (optional, default: 1000)
