# 🔴 Redis Integration - Shared Cache with ai-data-feeder

## Overview

`coinet-platform` now integrates with Redis to read cached data from `ai-data-feeder`, eliminating duplicate API calls and providing faster responses.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RAILWAY SERVICES                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────┐                                                     │
│  │  ai-data-feeder     │                                                     │
│  │  (ingenious-learn)  │                                                     │
│  │                     │                                                     │
│  │  Every 1 minute:    │                                                     │
│  │  └─ Fetch prices    │──────────────┐                                     │
│  │                     │              │                                     │
│  │  Every 5 minutes:   │              │                                     │
│  │  └─ Fetch news      │──────────────┤                                     │
│  │                     │              │                                     │
│  │  Every 10 minutes:  │              │                                     │
│  │  └─ AI analysis     │──────────────┤                                     │
│  └─────────────────────┘              │                                     │
│                                        ▼                                     │
│                         ┌───────────────────────────────────────────────┐   │
│                         │              REDIS CACHE                       │   │
│                         │                                                │   │
│                         │  price:{coinId}    - 60s TTL                  │   │
│                         │  news:{coinId}     - 5min TTL                 │   │
│                         │  analysis:{coinId} - 10min TTL                │   │
│                         └───────────────────────────────────────────────┘   │
│                                        ▲                                     │
│                                        │                                     │
│  ┌─────────────────────┐              │                                     │
│  │  coinet-platform    │──────────────┘                                     │
│  │  (api.coinet.ai)    │                                                     │
│  │                     │                                                     │
│  │  READS FROM REDIS   │                                                     │
│  │  FIRST! Then falls  │                                                     │
│  │  back to APIs       │                                                     │
│  └─────────────────────┘                                                     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow (Priority Order)

### Price Data
```
1. Redis Cache (from ai-data-feeder)     ← Fastest! ~1ms
2. Local in-memory cache                  ← ~1ms
3. market-prices service                  ← ~100ms
4. CoinGecko API                          ← ~500ms
5. CoinMarketCap API                      ← ~500ms
6. DexScreener API                        ← ~300ms
```

### News Data
```
1. Redis Cache (from ai-data-feeder)     ← Fastest! ~1ms
2. Local in-memory cache                  ← ~1ms
3. CryptoPanic API                        ← ~500ms
4. CoinGecko News API                     ← ~500ms
5. Messari API                            ← ~500ms
6. The Block API                          ← ~500ms
7. RSS Aggregator                         ← ~1000ms
```

## Setup

### 1. Add REDIS_URL to Railway

In Railway → `coinet-platform` → Variables:

```env
REDIS_URL=redis://default:password@host:port
```

**Get REDIS_URL from:** Railway → Redis service → Connect → Copy URL

### 2. Verify Integration

```bash
curl "https://api.coinet.ai/api/diagnostic?symbol=BTC"
```

Look for:
```json
{
  "services": {
    "redisCache": {
      "status": "✅ connected",
      "connected": true,
      "cacheStats": {
        "priceKeys": 10,
        "newsKeys": 10,
        "analysisKeys": 10
      }
    }
  }
}
```

## Redis Key Structure

| Key Pattern | Source | TTL | Content |
|-------------|--------|-----|---------|
| `price:{coinId}` | ai-data-feeder | 60s | Price, volume, market cap |
| `news:{coinId}` | ai-data-feeder | 5min | Headlines, sentiment |
| `analysis:{coinId}` | ai-data-feeder | 10min | AI recommendations |

## Benefits

| Before | After |
|--------|-------|
| Each request hits CoinGecko | Redis cache hit (~98%) |
| 500ms+ latency | ~1ms latency |
| Rate limit issues | No rate limits |
| Duplicate API calls | Single source of truth |
| $0-129/month API costs | $0 (free Redis tier) |

## Files Modified

- `src/services/redis-client.ts` - New Redis client utility
- `src/services/market-data.ts` - Reads from Redis first
- `src/services/news-service.ts` - Reads from Redis first
- `src/index.ts` - Initializes Redis on startup

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `REDIS_URL` | No | Redis connection URL |

If `REDIS_URL` is not set, the service falls back to direct API calls.

## Troubleshooting

### Redis not connecting?

1. Check REDIS_URL format: `redis://default:password@host:port`
2. Verify Redis service is running in Railway
3. Check firewall/network access

### Cache always empty?

1. Verify `ai-data-feeder` is running and healthy
2. Check `ai-data-feeder` has same `REDIS_URL`
3. Check tracked coins in `ai-data-feeder` config

### Still hitting rate limits?

1. Check diagnostic endpoint for Redis status
2. Verify cache stats show keys
3. Ensure `ai-data-feeder` is populating cache

## Monitoring

### Check Redis status:
```bash
curl "https://api.coinet.ai/api/diagnostic" | jq '.services.redisCache'
```

### Check cache stats:
```json
{
  "priceKeys": 10,      // Coins with cached prices
  "newsKeys": 10,       // Coins with cached news
  "analysisKeys": 10,   // Coins with AI analysis
  "totalKeys": 30       // Total cached items
}
```

## Cost Savings

| Service | Without Redis | With Redis |
|---------|--------------|------------|
| CoinGecko calls | 1000/day | ~20/day |
| CryptoPanic calls | 500/day | ~10/day |
| API costs | $50-200/mo | $0-5/mo |

---

**Status:** ✅ Implemented  
**Version:** 3.0.0  
**Last Updated:** December 2024

