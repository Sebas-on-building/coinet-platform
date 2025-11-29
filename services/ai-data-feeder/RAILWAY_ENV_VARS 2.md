# 🔐 Railway Environment Variables

## ✅ Required Variables

Set these in Railway → Service → **Variables** tab:

### 1. CryptoPanic API (Required)
```
CRYPTOPANIC_AUTH_TOKEN=07b3e13fd6db44d4b23fc48ea1cb85a6e739ccb3
CRYPTOPANIC_PLAN=development
```

### 2. CoinGecko API (Optional - free tier works)
```
COINGECKO_API_KEY=your-key-here
```
*(Leave empty if using free tier)*

### 3. Redis (Optional - for caching)
```
REDIS_URL=redis://your-redis-url
```
*(Leave empty if not using Redis)*

### 4. Configuration (Optional - defaults provided)
```
TRACKED_COINS=bitcoin,ethereum,solana,cardano,avalanche-2
PRICE_UPDATE_INTERVAL=60000
NEWS_UPDATE_INTERVAL=300000
AI_ANALYSIS_INTERVAL=600000
ENABLE_REDIS_CACHE=true
ENABLE_SENTIMENT_ANALYSIS=true
LOG_LEVEL=info
```

---

## 🎯 Minimum Required

**At minimum, you MUST set:**
```
CRYPTOPANIC_AUTH_TOKEN=07b3e13fd6db44d4b23fc48ea1cb85a6e739ccb3
CRYPTOPANIC_PLAN=development
```

Everything else has sensible defaults! ✅

---

## 📝 How to Add Variables in Railway

1. Railway → Service → **Variables** tab
2. Click **"New Variable"**
3. Add each variable:
   - **Name**: `CRYPTOPANIC_AUTH_TOKEN`
   - **Value**: `07b3e13fd6db44d4b23fc48ea1cb85a6e739ccb3`
4. Click **"Add"**
5. Repeat for other variables
6. Railway will automatically redeploy

---

## ✅ Your Current Settings

- ✅ Root Directory: `/` (repo root)
- ✅ Dockerfile Path: `services/ai-data-feeder/Dockerfile.monorepo`
- ✅ Branch: `feature/ai-data-feeder`

**Everything is configured correctly!** 🚀

Just add the environment variables and Railway will deploy successfully!

