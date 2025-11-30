# 🔥 Cache Setup Guide

## Why Cache Hit Rate is 0%

The cache uses **Redis** for storage. If Redis isn't running or configured, cache will always return `null`, causing:
- ❌ 0% cache hit rate
- ❌ Every request goes to API
- ❌ Rate limits hit immediately
- ❌ Efficiency = 0x

## Quick Fix: Start Redis

### Option 1: Local Redis (Docker)

```bash
docker run -d \
  --name redis-cache \
  -p 6379:6379 \
  redis:7-alpine
```

### Option 2: Railway Redis

1. Go to Railway dashboard
2. Add Redis service
3. Copy connection string
4. Set environment variable:
   ```bash
   REDIS_HOST=your-redis-host
   REDIS_PORT=6379
   REDIS_PASSWORD=your-password
   ```

### Option 3: Redis Cloud (Free Tier)

1. Sign up at https://redis.com/try-free/
2. Get connection string
3. Set environment variables

## Verify Cache is Working

```bash
# Check if Redis is connected
curl https://market-prices-production.up.railway.app/api/debug | jq '.cache'

# Should show:
# {
#   "connected": true,
#   "keys": 10,
#   "hitRate": 0.95
# }
```

## Expected Results After Redis Setup

**Before (No Redis):**
- Cache Hit: 0%
- API Calls: 100+ for 20 requests
- Efficiency: 0x

**After (Redis Running):**
- Cache Hit: 80-95%
- API Calls: 2-5 for 100 requests
- Efficiency: 20-50x (free tier)

## Environment Variables

```bash
# Redis Configuration
REDIS_HOST=localhost          # or your Redis host
REDIS_PORT=6379               # Redis port
REDIS_PASSWORD=               # Optional password
REDIS_DB=0                    # Database number

# Cache TTL (in seconds)
CACHE_TTL_SECONDS=60          # Default: 60 seconds
```

## Cache Pre-Warming

The load test now pre-warms cache automatically:
1. Fetches all symbols once (API call)
2. Stores in Redis cache
3. Subsequent requests hit cache

**This means:**
- First request per symbol = API call
- All other requests = Cache hit ✅

## Troubleshooting

### Cache Still 0%?

1. **Check Redis connection:**
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

2. **Check environment variables:**
   ```bash
   echo $REDIS_HOST
   echo $REDIS_PORT
   ```

3. **Check logs:**
   ```bash
   # Look for "Redis connected" message
   # Or "Redis error" warnings
   ```

### Redis Not Available?

**Temporary workaround:**
- Increase request intervals (reduce load)
- Use CoinMarketCap fallback (has its own limits)
- Accept lower efficiency (without cache)

**Long-term solution:**
- Set up Redis (required for cache)
- Or implement in-memory cache fallback

## Free Tier + Redis = 🎯

With Redis cache:
- **30 API calls/min** → **1,800-7,200 users/hour**
- **95% cache hit rate** → **50-200x efficiency**
- **<100ms response time** → **Excellent UX**

Without Redis:
- **30 API calls/min** → **~325 users/hour**
- **0% cache hit rate** → **0x efficiency**
- **5-6s response time** → **Poor UX**

---

**Bottom line:** Redis is **required** for cache to work. Set it up to see the magic! ✨

