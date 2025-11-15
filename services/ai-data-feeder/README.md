# 🤖 AI Data Feeder Service

**24/7 AI data feeding service** - Continuously feeds Coinet AI with market data from CoinGecko and CryptoPanic.

---

## Features

- ✅ **24/7 Operation** - Runs continuously in the cloud
- ✅ **Real-time Price Updates** - Every 1 minute from CoinGecko
- ✅ **News & Sentiment Analysis** - Every 5 minutes from CryptoPanic
- ✅ **AI Analysis** - Every 10 minutes with recommendations
- ✅ **Redis Caching** - Fast data access
- ✅ **Event Streaming** - Real-time updates via EventEmitter
- ✅ **Configurable** - Easy to customize intervals and coins

---

## How It Works

```
┌─────────────────────────────────────────┐
│  AI DATA FEEDER (24/7)                  │
├─────────────────────────────────────────┤
│                                          │
│  Every 1 minute:                        │
│  ├─ Fetch prices from CoinGecko         │
│  └─ Update Redis cache                  │
│                                          │
│  Every 5 minutes:                       │
│  ├─ Fetch news from CryptoPanic         │
│  ├─ Analyze sentiment                   │
│  └─ Update Redis cache                  │
│                                          │
│  Every 10 minutes:                      │
│  ├─ Analyze all data                    │
│  ├─ Generate recommendations            │
│  └─ Store in Redis/Database             │
│                                          │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  YOUR AI SERVICE                        │
│  ├─ Read from Redis cache               │
│  ├─ Get latest prices                   │
│  ├─ Get latest news & sentiment         │
│  ├─ Get AI analysis                     │
│  └─ Make decisions                      │
└─────────────────────────────────────────┘
```

---

## Quick Start

### Step 1: Install Dependencies

```bash
cd services/ai-data-feeder
pnpm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

Required:
- `COINGECKO_API_KEY` - Your CoinGecko API key
- `CRYPTOPANIC_AUTH_TOKEN` - Your CryptoPanic API token

Optional:
- `REDIS_URL` - Redis for caching (recommended)
- `DATABASE_URL` - PostgreSQL for storage

### Step 3: Run Locally

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

---

## Deploy to Railway (24/7)

### Option 1: CLI Deploy

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Set environment variables
railway variables set COINGECKO_API_KEY=your-key
railway variables set CRYPTOPANIC_AUTH_TOKEN=your-token
railway variables set REDIS_URL=redis://...

# Deploy
railway up
```

### Option 2: GitHub Deploy

1. Push to GitHub
2. Go to https://railway.app
3. New Project → Deploy from GitHub
4. Select `coinet/services/ai-data-feeder`
5. Set environment variables
6. Deploy ✅

---

## Configuration

### Tracked Coins

Edit `.env`:
```env
TRACKED_COINS=bitcoin,ethereum,solana,cardano,avalanche-2
```

### Update Intervals

```env
PRICE_UPDATE_INTERVAL=60000   # 1 minute
NEWS_UPDATE_INTERVAL=300000   # 5 minutes
AI_ANALYSIS_INTERVAL=600000   # 10 minutes
```

---

## Usage in Your AI Service

### Option 1: Use Redis Cache

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Get latest price
const price = JSON.parse(await redis.get('price:bitcoin'));
console.log(price); // { current: 100000, change24h: 5000, ... }

// Get latest news
const news = JSON.parse(await redis.get('news:bitcoin'));
console.log(news); // { count: 15, sentiment: 'positive', ... }

// Get AI analysis
const analysis = JSON.parse(await redis.get('analysis:bitcoin'));
console.log(analysis); // { recommendation: 'buy', confidence: 85, ... }
```

### Option 2: Subscribe to Events

```typescript
import { AIDataFeeder } from '@coinet/ai-data-feeder';

const feeder = new AIDataFeeder(config);

// Listen for updates
feeder.on('data_update', (event) => {
  console.log('New data:', event);
  // Feed to your AI
});

await feeder.start();
```

### Option 3: Query Directly

```typescript
import { AIDataFeeder } from '@coinet/ai-data-feeder';

const feeder = new AIDataFeeder(config);
await feeder.start();

// Get data for a coin
const data = feeder.getDataPoint('bitcoin');
console.log(data);
// {
//   coin: 'bitcoin',
//   price: { current: 100000, ... },
//   news: { sentiment: 'positive', ... }
// }
```

---

## Data Structure

### Price Data

```typescript
{
  current: number;
  change24h: number;
  changePercentage24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap: number;
}
```

### News Data

```typescript
{
  count: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentScore: number;  // -100 to +100
  panicScore: number;       // 0 to 100
  topHeadlines: Array<{
    title: string;
    sentiment: string;
    publishedAt: Date;
  }>;
}
```

### AI Analysis

```typescript
{
  coin: string;
  recommendation: 'buy' | 'sell' | 'hold';
  confidence: number;  // 0 to 100
  reasoning: string;
  signals: Array<{
    type: string;
    strength: number;
    description: string;
  }>;
}
```

---

## Monitoring

### Check Status

```bash
# View logs
railway logs

# Check Redis
redis-cli
> KEYS *
> GET price:bitcoin
```

### Health Check

The service logs status every minute:
```
Status: { 
  isRunning: true,
  coinsTracked: 10,
  dataPoints: 10,
  lastUpdate: 2025-11-15T08:30:00.000Z
}
```

---

## Cost

### Running on Railway

- Railway: $5/month (includes compute + 512MB RAM)
- Redis: Free tier (Railway Redis plugin)
- CoinGecko: Free tier (or $129/month for more calls)
- CryptoPanic: Free tier

**Total: ~$5/month** for 24/7 operation

---

## Architecture

```
┌───────────────────────────────────────┐
│  RAILWAY CLOUD (24/7)                  │
│                                        │
│  ┌─────────────────────────────────┐ │
│  │  AI Data Feeder Service         │ │
│  │  ├─ Price Scheduler (1 min)     │ │
│  │  ├─ News Scheduler (5 min)      │ │
│  │  └─ AI Scheduler (10 min)       │ │
│  └─────────────────────────────────┘ │
│           ↓          ↓                 │
│  ┌─────────┐   ┌─────────┐           │
│  │  Redis  │   │ PostgreSQL │         │
│  │  Cache  │   │  Storage  │          │
│  └─────────┘   └─────────┘           │
└───────────────────────────────────────┘
         ↓
┌───────────────────────────────────────┐
│  YOUR AI SERVICE                       │
│  (reads from Redis or subscribes)      │
└───────────────────────────────────────┘
```

---

## Next Steps

1. Deploy to Railway (15 minutes)
2. Configure tracked coins
3. Connect your AI service
4. Start getting 24/7 data ✅

---

## Support

Issues? Check:
- Logs: `railway logs`
- Redis: `redis-cli KEYS *`
- Environment: `railway variables`

---

**Your AI now has 24/7 access to market data!** 🚀

