# 🚀 Deploy AI Data Feeder to Your Existing Railway Project

## ✅ You Already Have Railway!

I can see you have:
- ✅ `coinet-platform` service
- ✅ `Redis` service  
- ✅ `Postgres` service

Now let's add the **AI Data Feeder** service!

---

## Step 1: Add Service to Railway

### Option A: Via Railway Dashboard (Easiest)

1. **Go to your Railway project**: https://railway.app/project/7a958bee-0f47-4ef1-a2ca-be89b9243f30
2. **Click "+ Create"** button (top right)
3. **Select "GitHub Repo"**
4. **Choose your repo**: `coinet-platform`
5. **Settings**:
   - **Root Directory**: `services/ai-data-feeder`
   - **Branch**: `feature/ai-data-feeder` (or `main` after merge)
   - **Build Command**: `cd services/ai-data-feeder && pnpm install && pnpm build`
   - **Start Command**: `cd services/ai-data-feeder && node dist/index.js`

---

## Step 2: Set Environment Variables

In Railway dashboard, go to your new `ai-data-feeder` service → Variables:

```env
# CoinGecko API
COINGECKO_API_KEY=your-coingecko-key-here

# CryptoPanic API (you already have this!)
CRYPTOPANIC_AUTH_TOKEN=07b3e13fd6db44d4b23fc48ea1cb85a6e739ccb3
CRYPTOPANIC_PLAN=development

# Redis (use your existing Redis!)
REDIS_URL=${{Redis.REDIS_URL}}

# Tracked coins
TRACKED_COINS=bitcoin,ethereum,solana,cardano,avalanche-2,polkadot,chainlink,polygon,uniswap,aave

# Update intervals (milliseconds)
PRICE_UPDATE_INTERVAL=60000
NEWS_UPDATE_INTERVAL=300000
AI_ANALYSIS_INTERVAL=600000

# Features
ENABLE_REDIS_CACHE=true
ENABLE_DATABASE=false
ENABLE_SENTIMENT_ANALYSIS=true
ENABLE_AI_INSIGHTS=true
```

**Important**: Use `${{Redis.REDIS_URL}}` to connect to your existing Redis!

---

## Step 3: Connect to Your Redis

The AI Data Feeder will automatically use your existing Redis service.

**No extra setup needed** - Railway handles the connection via `${{Redis.REDIS_URL}}`

---

## Step 4: Deploy

Railway will automatically:
1. ✅ Build the service
2. ✅ Install dependencies
3. ✅ Start the service
4. ✅ Connect to Redis

---

## Step 5: Verify It's Working

### Check Logs

In Railway dashboard → `ai-data-feeder` service → Logs:

You should see:
```
Starting AI Data Feeder Service...
✅ Data feeder started!
📊 PRICE_UPDATE
Coin: bitcoin
Price: $100,000
```

### Check Redis

In Railway dashboard → `Redis` service → Connect:

```bash
redis-cli
> KEYS *
> GET price:bitcoin
> GET news:bitcoin
> GET analysis:bitcoin
```

---

## Architecture After Deployment

```
┌─────────────────────────────────────┐
│  RAILWAY PROJECT                    │
│                                      │
│  ┌─────────────────────────────┐    │
│  │  coinet-platform            │    │
│  │  (your main app)            │    │
│  └─────────────────────────────┘    │
│                                      │
│  ┌─────────────────────────────┐    │
│  │  ai-data-feeder 🆕          │    │
│  │  (24/7 data feeding)        │    │
│  └─────────────────────────────┘    │
│           ↓                          │
│  ┌─────────────────────────────┐    │
│  │  Redis                       │    │
│  │  (shared cache)              │    │
│  └─────────────────────────────┘    │
│                                      │
│  ┌─────────────────────────────┐    │
│  │  Postgres                    │    │
│  │  (database)                 │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

---

## Use in Your Coinet Platform

Your `coinet-platform` service can now read from Redis:

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Get Bitcoin data
const price = JSON.parse(await redis.get('price:bitcoin'));
const news = JSON.parse(await redis.get('news:bitcoin'));
const analysis = JSON.parse(await redis.get('analysis:bitcoin'));

// Use in your AI
await yourAI.analyze({
  price: price.current,
  sentiment: news.sentimentScore,
  recommendation: analysis.recommendation
});
```

---

## Cost

- ✅ **No extra cost** - Uses your existing Railway plan
- ✅ **Uses existing Redis** - No new Redis needed
- ✅ **Same project** - Everything together

---

## Quick Commands

### Via Railway CLI (Alternative)

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Add service
railway service create ai-data-feeder

# Set variables
railway variables set COINGECKO_API_KEY=your-key
railway variables set CRYPTOPANIC_AUTH_TOKEN=07b3e13fd6db44d4b23fc48ea1cb85a6e739ccb3
railway variables set REDIS_URL=${{Redis.REDIS_URL}}

# Deploy
railway up
```

---

## Summary

1. ✅ Click "+ Create" in Railway
2. ✅ Select GitHub Repo → `coinet-platform`
3. ✅ Set Root Directory: `services/ai-data-feeder`
4. ✅ Set environment variables (use `${{Redis.REDIS_URL}}`)
5. ✅ Deploy ✅

**Your AI Data Feeder will run 24/7 alongside your existing services!** 🚀

