# Social Media Sentiment Analysis Service

A high-performance streaming pipeline that ingests mentions, hashtags and posts from Twitter, Reddit, Telegram and Discord. This service provides real-time sentiment analysis, topic classification, and influencer impact analysis for the Coinet platform.

## Features

- **Multi-Platform Support**: Twitter, Reddit, Telegram, Discord
- **Real-time Processing**: Sub-5-second latency from post to analysis
- **Advanced NLP**: Language detection, sentiment scoring, topic classification
- **Influencer Analysis**: Impact scoring and reach analysis
- **Privacy-First**: De-identified metadata storage only
- **Scalable Architecture**: Streaming pipeline with time-window aggregation
- **Extensible**: Easy addition of new social media platforms

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Platform      │───▶│   Streaming     │───▶│   NLP           │
│   Clients       │    │   Pipeline      │    │   Processing    │
│                 │    │                 │    │                 │
│ • Twitter API   │    │ • Rate limiting │    │ • Language      │
│ • Reddit API    │    │ • Deduplication │    │   detection     │
│ • Telegram API  │    │ • Normalization │    │ • Sentiment     │
│ • Discord API   │    │                 │    │   scoring       │
└─────────────────┘    └─────────────────┘    │ • Topic         │
                                              │   classification│
┌─────────────────┐    ┌─────────────────┐    │ • Influencer    │
│   Aggregation   │◀───│   Storage       │    │   analysis      │
│   Engine        │    │   Layer         │    └─────────────────┘
│                 │    │                 │
│ • Time windows  │    │ • Time-series   │    ┌─────────────────┐
│ • Sentiment     │    │   data          │    │   Monitoring    │
│   velocity      │    │ • De-identified │    │   & Health      │
│ • Abnormal      │    │   metadata      │    │   Checks        │
│   volume        │    │ • Privacy       │    └─────────────────┘
│   detection     │    │   compliance    │
└─────────────────┘    └─────────────────┘
```

## Installation

```bash
cd services/social-media-sentiment
npm install
```

## Configuration

Create a `.env` file with the following variables:

```env
# API Keys
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
REDDIT_CLIENT_ID=your_reddit_client_id
REDDIT_CLIENT_SECRET=your_reddit_client_secret
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
DISCORD_BOT_TOKEN=your_discord_bot_token

# Database
REDIS_URL=redis://localhost:6379
TIMESCALEDB_URL=postgresql://user:pass@localhost/coinet

# Service Configuration
MAX_PROCESSING_LATENCY_MS=5000
BATCH_SIZE=100
WINDOW_SIZE_MINUTES=5
```

## Usage

### Basic Usage

```typescript
import { SocialMediaMonitor } from './src/SocialMediaMonitor';

const monitor = new SocialMediaMonitor();

// Start the service
await monitor.start();

// Subscribe to sentiment updates
monitor.on('sentiment', (data) => {
  console.log('New sentiment data:', data);
});

// Subscribe to specific keywords/hashtags
await monitor.subscribeToKeywords(['#bitcoin', '#crypto', 'BTC'], {
  platforms: ['twitter', 'reddit'],
  sentimentThreshold: 0.7
});
```

### Advanced Configuration

```typescript
const options = {
  includeInfluencerAnalysis: true,
  languageFilter: ['en', 'es', 'zh'],
  minFollowers: 1000,
  timeWindows: {
    short: 1,    // 1 minute
    medium: 5,   // 5 minutes
    long: 60     // 1 hour
  }
};

await monitor.subscribeToTopics(['cryptocurrency', 'blockchain'], options);
```

## API Reference

### SocialMediaMonitor

Main service class for social media sentiment analysis.

#### Methods

- `start(): Promise<void>` - Start the monitoring service
- `stop(): Promise<void>` - Stop the monitoring service
- `subscribeToKeywords(keywords: string[], options?: SubscriptionOptions): Promise<string>` - Subscribe to keyword monitoring
- `subscribeToTopics(topics: string[], options?: SubscriptionOptions): Promise<string>` - Subscribe to topic monitoring
- `getStatus(): string` - Get current service status
- `getHealthStatus(): Promise<HealthStatus>` - Get detailed health information

#### Events

- `sentiment` - Emitted when new sentiment data is available
- `influencer` - Emitted when influencer activity is detected
- `anomaly` - Emitted when abnormal social volume is detected
- `error` - Emitted when processing errors occur

### Platform Clients

Each platform has its own client implementation:

- **TwitterClient**: Uses Twitter API v2 for real-time tweet streaming
- **RedditClient**: Uses Reddit API for post and comment monitoring
- **TelegramClient**: Uses Telegram Bot API for channel monitoring
- **DiscordClient**: Uses Discord.js for server and channel monitoring

## Data Models

### SentimentData
```typescript
interface SentimentData {
  id: string;
  platform: 'twitter' | 'reddit' | 'telegram' | 'discord';
  content: string;
  author: {
    id: string;           // De-identified user ID
    followers?: number;   // Follower count (if available)
    verified?: boolean;   // Verification status
  };
  timestamp: Date;
  language: string;
  sentiment: {
    score: number;        // -1 to 1 (negative to positive)
    confidence: number;   // 0 to 1
    label: 'positive' | 'negative' | 'neutral';
  };
  topics: string[];
  hashtags: string[];
  mentions: string[];
  engagement: {
    likes?: number;
    retweets?: number;
    replies?: number;
    shares?: number;
  };
  influencer_score?: number;  // 0 to 100
}
```

### AggregatedMetrics
```typescript
interface AggregatedMetrics {
  time_window: {
    start: Date;
    end: Date;
  };
  platform: string;
  total_posts: number;
  sentiment_distribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  top_topics: Array<{
    topic: string;
    count: number;
    avg_sentiment: number;
  }>;
  sentiment_velocity: number;  // Rate of change
  volume_anomaly_score: number; // 0 to 1
  top_influencers: Array<{
    id: string;
    impact_score: number;
    post_count: number;
  }>;
}
```

## Performance

- **Latency**: < 5 seconds from post publication to processing
- **Throughput**: 1000+ posts/second processing capacity
- **Scalability**: Horizontal scaling with Redis clustering
- **Reliability**: 99.9% uptime with automatic failover

## Privacy & Compliance

- **Data Minimization**: Only essential metadata stored
- **De-identification**: User IDs are hashed and anonymized
- **Retention**: Configurable data retention policies
- **GDPR Compliance**: EU user data handling procedures
- **Rate Limiting**: Respects all platform API limits

## Monitoring & Health Checks

The service includes comprehensive monitoring:

- Real-time metrics collection
- Health check endpoints
- Performance monitoring
- Error tracking and alerting
- Resource usage monitoring

## Contributing

1. Follow the existing code style and patterns
2. Add tests for new functionality
3. Update documentation
4. Ensure privacy compliance
5. Test with multiple platforms

## License

MIT License - see LICENSE file for details.
