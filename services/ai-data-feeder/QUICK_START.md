# 🚀 Quick Start - AI Data Feeder

Get your AI 24/7 data in 5 minutes.

---

## Step 1: Set Environment Variables

```bash
cd services/ai-data-feeder
cp .env.example .env
```

Edit `.env`:
```env
COINGECKO_API_KEY=your-coingecko-key
CRYPTOPANIC_AUTH_TOKEN=07b3e13fd6db44d4b23fc48ea1cb85a6e739ccb3
CRYPTOPANIC_PLAN=development
REDIS_URL=redis://localhost:6379
```

---

## Step 2: Test Locally

```bash
# Install dependencies
pnpm install

# Run example
npx ts-node example.ts
```

You should see:
```
🤖 AI Data Feeder Example
✅ Data feeder started!
📊 PRICE_UPDATE
Coin: bitcoin
Price: $100,000
Change: +2.5%
```

---

## Step 3: Deploy to Railway

### A. Push to GitHub

```bash
cd /Users/sebastian/Desktop/Arbeit/Coinet
git add services/ai-data-feeder
git commit -m "Add AI data feeder service"
git push origin main
```

### B. Deploy on Railway

1. Go to https://railway.app
2. New Project → Deploy from GitHub
3. Select your repo
4. Root Directory: `services/ai-data-feeder`
5. Set environment variables:
   ```
   COINGECKO_API_KEY=your-key
   CRYPTOPANIC_AUTH_TOKEN=07b3e13fd6db44d4b23fc48ea1cb85a6e739ccb3
   CRYPTOPANIC_PLAN=development
   ```
6. Add Redis plugin (Railway → Add → Redis)
7. Deploy ✅

---

## Step 4: Use in Your AI

### Option 1: Use Redis Cache

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Get latest Bitcoin price
const price = JSON.parse(await redis.get('price:bitcoin'));
console.log(`BTC: $${price.current}`);

// Get news sentiment
const news = JSON.parse(await redis.get('news:bitcoin'));
console.log(`Sentiment: ${news.sentiment}`);

// Get AI analysis
const analysis = JSON.parse(await redis.get('analysis:bitcoin'));
console.log(`Recommendation: ${analysis.recommendation}`);
```

### Option 2: Use NPM Package

```typescript
import { AIDataFeeder, getConfig } from '@coinet/ai-data-feeder';

const feeder = new AIDataFeeder(getConfig());

feeder.on('data_update', (event) => {
  // Feed to your AI
  yourAI.analyze(event.data);
});

await feeder.start();
```

---

## Step 5: Verify It's Working

```bash
# Check Railway logs
railway logs

# Check Redis
redis-cli
> KEYS *
> GET price:bitcoin
> GET news:bitcoin
> GET analysis:bitcoin
```

---

## Done!

Your AI now has 24/7 access to:
- ✅ Real-time prices (every 1 minute)
- ✅ News & sentiment (every 5 minutes)
- ✅ AI analysis (every 10 minutes)

---

## Cost

- Railway: $5/month
- Redis: Free (Railway plugin)
- CoinGecko: Free tier
- CryptoPanic: Free tier

**Total: $5/month**

---

## Next Steps

1. Add more coins to `TRACKED_COINS`
2. Adjust update intervals
3. Connect to your AI service
4. Build awesome features ✨

---

**Your AI is now powered by 24/7 data!** 🤖

