# CoinGecko Rate Limit Fix

## Issue

The `ai-data-feeder` service is hitting CoinGecko rate limits (429 errors):

```
CoinGecko API error: 429
"You've exceeded the Rate Limit. Please visit https://www.coingecko.com/en/api/pricing"
```

## Current Status

- ✅ Service is running
- ✅ Eventually gets prices (after retries)
- ⚠️ Frequent rate limit errors
- ⚠️ Slower price updates due to retries

## Solutions

### Option 1: Increase Rate Limit Interval (Quick Fix)

Add to Railway variables:

```bash
COINGECKO_RATE_LIMIT_PER_MINUTE=10  # Reduce from 50 to 10
PRICE_UPDATE_INTERVAL=300  # Increase from 60s to 300s (5 minutes)
```

### Option 2: Use CoinGecko Pro API (Recommended)

1. **Sign up for CoinGecko Pro**: https://www.coingecko.com/en/api/pricing
   - **Analyst Plan**: $129/month - 500 calls/minute
   - **Startup Plan**: $499/month - 5,000 calls/minute

2. **Add API Key to Railway**:
   ```
   COINGECKO_API_KEY=your_pro_api_key_here
   ```

3. **Update rate limit**:
   ```
   COINGECKO_RATE_LIMIT_PER_MINUTE=500  # For Analyst plan
   ```

### Option 3: Use Alternative Provider (Free)

Switch to a different free provider with better limits:

- **CoinCap API**: Free tier, 200 requests/minute
- **CoinMarketCap API**: Free tier, 333 requests/day
- **CryptoCompare API**: Free tier, 100,000 calls/month

### Option 4: Implement Caching (Best for Free Tier)

Cache prices for longer periods:

```bash
PRICE_CACHE_TTL_SECONDS=300  # Cache for 5 minutes
PRICE_UPDATE_INTERVAL=300  # Update every 5 minutes
```

---

## Immediate Fix (No Cost)

Add these Railway variables to reduce rate limit hits:

```bash
# Reduce request frequency
COINGECKO_RATE_LIMIT_PER_MINUTE=10
PRICE_UPDATE_INTERVAL=300

# Increase cache time
PRICE_CACHE_TTL_SECONDS=300
```

This will:
- ✅ Reduce rate limit errors
- ✅ Still update prices (every 5 minutes instead of 1 minute)
- ✅ Use cached prices between updates
- ✅ No cost

---

## Current Behavior

The service is **still working** despite rate limit errors:

1. ✅ Retries automatically (up to 3 times)
2. ✅ Eventually gets prices
3. ✅ Continues running
4. ⚠️ Just slower due to retries

**Status**: Service is functional, just hitting rate limits frequently.

---

## Recommendation

For production, use **Option 2** (CoinGecko Pro API) or **Option 4** (Better caching).

For now, the service works - it just retries when hitting rate limits.

