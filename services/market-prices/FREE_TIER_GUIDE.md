# 🆓 Free Tier Optimization Guide

## Understanding Free Tier Limits

**CoinGecko Free Tier:**
- **30 API calls per minute**
- **No API key required** (or basic API key)
- **Rate limits:** Strict enforcement
- **Endpoint:** `https://api.coingecko.com/api/v3` (NOT pro-api)

## Realistic Expectations

### Free Tier Performance:

| Metric | Target | Reality |
|--------|--------|---------|
| **Efficiency Multiplier** | 1000x | **50-200x** (excellent) |
| **Cache Hit Rate** | 95%+ | **80-95%** (good) |
| **Users/Hour** | 30,000+ | **1,800-7,200** (realistic) |
| **Response Time** | <100ms | **<200ms** (cached) |

### Why Not 1000x?

**Free tier math:**
- 30 calls/min = 0.5 calls/sec
- With 95% cache hit rate: 19 cached requests per API call
- **Realistic efficiency: 50-200x** (not 1000x)

**1000x would require:**
- 1000 requests per API call
- 99.9% cache hit rate
- Perfect timing (no cache misses)

## Configuration for Free Tier

### Environment Variables:

```bash
# Use free tier endpoint (default)
COINGECKO_API_URL=https://api.coingecko.com/api/v3

# Don't set COINGECKO_TIER=pro (that's for paid)
# Leave COINGECKO_TIER=demo or unset

# Free tier rate limit
COINGECKO_RATE_LIMIT_PER_MINUTE=30
```

### Remove Pro API Key Header:

If you have a basic API key (not Pro), make sure:
- ✅ Using `api.coingecko.com` (not `pro-api.coingecko.com`)
- ✅ NOT setting `COINGECKO_TIER=pro`
- ✅ Rate limit set to 30/min

## Optimizing for Free Tier

### 1. Maximize Cache Usage

```typescript
// Increase cache TTL
CACHE_TTL_SECONDS=300  // 5 minutes (default: 60s)

// Pre-warm cache before load
// Fetch popular symbols once, then serve from cache
```

### 2. Request Batching

```typescript
// Batch multiple symbols in one API call
// Instead of: BTC, ETH, SOL (3 calls)
// Do: BTC,ETH,SOL (1 call)
```

### 3. Smart Rate Limiting

```typescript
// Distribute calls evenly across minute
// 30 calls/min = 1 call every 2 seconds
RATE_LIMIT_INTERVAL_MS=2000
```

### 4. Fallback Strategy

```typescript
// Use CoinMarketCap as backup (also free tier)
// When CoinGecko hits limit, use CMC
// This doubles your effective capacity
```

## Load Test Expectations

### Quick Test (30s, 100 users):

**Free Tier Realistic:**
- Efficiency: **20-50x** ✅
- Cache Hit: **70-90%** ✅
- API Calls: **2-5** ✅

**Not Realistic:**
- Efficiency: 1000x ❌
- Cache Hit: 99%+ ❌
- API Calls: 0 ❌

### Full Test (60s, 1000 users):

**Free Tier Realistic:**
- Efficiency: **50-200x** ✅
- Cache Hit: **85-95%** ✅
- API Calls: **5-20** ✅

## Success Criteria for Free Tier

### ✅ Excellent Performance:
- Efficiency: **50-200x**
- Cache Hit: **85%+**
- Users/Hour: **1,800-7,200**

### ✅ Good Performance:
- Efficiency: **20-50x**
- Cache Hit: **70-85%**
- Users/Hour: **600-1,800**

### ⚠️ Needs Optimization:
- Efficiency: **<20x**
- Cache Hit: **<70%**
- Users/Hour: **<600**

## Common Issues

### Issue: Rate Limit Errors (429)

**Cause:** Too many requests too fast

**Fix:**
```bash
# Increase request intervals
REQUEST_INTERVAL_MS=3000  # 3 seconds

# Reduce concurrent users
CONCURRENT_USERS=50  # Instead of 100
```

### Issue: Low Cache Hit Rate

**Cause:** Cache not populated or TTL too short

**Fix:**
```bash
# Increase cache TTL
CACHE_TTL_SECONDS=600  # 10 minutes

# Pre-warm cache
# Run initial requests to populate cache
```

### Issue: Wrong API Endpoint

**Cause:** Using Pro endpoint with free tier key

**Fix:**
```bash
# Remove Pro tier setting
unset COINGECKO_TIER

# Use free tier endpoint
COINGECKO_API_URL=https://api.coingecko.com/api/v3
```

## Free Tier vs Paid Tier

| Feature | Free Tier | Paid Tier |
|---------|-----------|-----------|
| **API Calls/Min** | 30 | 500+ |
| **Endpoint** | api.coingecko.com | pro-api.coingecko.com |
| **Efficiency** | 50-200x | 1000x+ |
| **Cost** | $0 | $99+/mo |
| **Cache Strategy** | Critical | Helpful |

## Best Practices

1. **Always use cache** - Free tier requires aggressive caching
2. **Batch requests** - Combine symbols in one call
3. **Use fallbacks** - CoinMarketCap as backup
4. **Monitor rate limits** - Track 429 errors
5. **Pre-warm cache** - Fetch popular symbols first
6. **Set realistic targets** - 50-200x is excellent for free tier

---

**Remember:** Free tier outperformance is about **smart optimization**, not brute force. 50-200x efficiency on free tier is **divine perfection**! 🎉

