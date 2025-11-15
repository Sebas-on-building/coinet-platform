# ➕ Add AI Data Feeder to Your Existing Railway Project

## ✅ You Already Have Railway!

I can see you have:
- ✅ `coinet-platform` service
- ✅ `Redis` service  
- ✅ `Postgres` service

Now add the **AI Data Feeder** service!

---

## 🚀 Quick Steps

### Step 1: Click "+ Create" in Railway

In your Railway dashboard (https://railway.app/project/7a958bee-0f47-4ef1-a2ca-be89b9243f30):

1. Click **"+ Create"** button (top right)
2. Select **"GitHub Repo"**
3. Choose: **`coinet-platform`** repo
4. **Settings**:
   - **Root Directory**: `services/ai-data-feeder`
   - **Branch**: `feature/ai-data-feeder` (or `main` after merge)

---

### Step 2: Set Environment Variables

In Railway → `ai-data-feeder` service → Variables tab:

```env
# CoinGecko API (get free key from https://www.coingecko.com/en/api)
COINGECKO_API_KEY=your-coingecko-key-here

# CryptoPanic API (you already have this!)
CRYPTOPANIC_AUTH_TOKEN=07b3e13fd6db44d4b23fc48ea1cb85a6e739ccb3
CRYPTOPANIC_PLAN=development

# Redis - Use your existing Redis!
REDIS_URL=${{Redis.REDIS_URL}}

# Tracked coins
TRACKED_COINS=bitcoin,ethereum,solana,cardano,avalanche-2

# Update intervals (milliseconds)
PRICE_UPDATE_INTERVAL=60000
NEWS_UPDATE_INTERVAL=300000
AI_ANALYSIS_INTERVAL=600000

# Features
ENABLE_REDIS_CACHE=true
ENABLE_SENTIMENT_ANALYSIS=true
ENABLE_AI_INSIGHTS=true
```

**Important**: Use `${{Redis.REDIS_URL}}` to connect to your existing Redis!

---

### Step 3: Deploy

Railway will automatically:
1. ✅ Build the service
2. ✅ Install dependencies  
3. ✅ Start the service
4. ✅ Connect to your Redis

---

## 📊 Verify It's Working

### Check Logs

Railway → `ai-data-feeder` → Logs:

You should see:
```
Starting Standalone AI Data Feeder...
✅ Standalone AI Data Feeder started successfully
Prices updated { count: 5 }
```

### Check Redis

Railway → `Redis` → Connect → Terminal:

```bash
redis-cli
> KEYS *
> GET price:bitcoin
> GET news:bitcoin
> GET analysis:bitcoin
```

---

## 🎯 Use in Your Coinet Platform

Your `coinet-platform` service can read from Redis:

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Get Bitcoin data
const price = JSON.parse(await redis.get('price:bitcoin'));
const news = JSON.parse(await redis.get('news:bitcoin'));
const analysis = JSON.parse(await redis.get('analysis:bitcoin'));

console.log(`BTC: $${price.current}`);
console.log(`Sentiment: ${news.sentiment}`);
console.log(`Recommendation: ${analysis.recommendation}`);
```

---

## 🏗️ Final Architecture

```
┌─────────────────────────────────────┐
│  RAILWAY PROJECT                    │
│                                      │
│  ┌─────────────────────────────┐    │
│  │  coinet-platform            │    │
│  │  (reads from Redis)          │    │
│  └─────────────────────────────┘    │
│                                      │
│  ┌─────────────────────────────┐    │
│  │  ai-data-feeder 🆕          │    │
│  │  (writes to Redis)           │    │
│  └─────────────────────────────┘    │
│           ↓                          │
│  ┌─────────────────────────────┐    │
│  │  Redis                      │    │
│  │  (shared cache)              │    │
│  └─────────────────────────────┘    │
│                                      │
│  ┌─────────────────────────────┐    │
│  │  Postgres                   │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

---

## 💰 Cost

- ✅ **No extra cost** - Uses your existing Railway plan
- ✅ **Uses existing Redis** - No new service needed
- ✅ **Same project** - Everything together

---

## ✅ Done!

Your AI Data Feeder will:
- ✅ Fetch prices every 1 minute
- ✅ Fetch news every 5 minutes  
- ✅ Run AI analysis every 10 minutes
- ✅ Store everything in Redis
- ✅ Run 24/7 in Railway

**Your Coinet AI now has 24/7 access to market data!** 🚀

